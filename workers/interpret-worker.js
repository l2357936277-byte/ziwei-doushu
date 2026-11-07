/**
 * Cloudflare Worker：紫微斗数 AI 解读代理
 *
 * 作用：替代静态站点跑不了的 /api/interpret。
 *   - 接收前端 POST { chart, messages }
 *   - 把命盘转成文本，拼系统提示，调火山方舟（豆包）OpenAI 兼容接口
 *   - 按前端约定的 SSE 格式回传：data: {"delta":{"text":"..."}}  结尾 data: [DONE]
 *
 * 部署：wrangler deploy
 * 环境变量（wrangler secret put）：ARK_API_KEY；普通变量：ARK_MODEL
 */

const STEMS = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
const BRANCHES = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Max-Age': '86400',
};

function chartToText(chart) {
  const bi = chart.birthInfo || {};
  const lines = [];
  lines.push(`性别：${bi.gender === 'male' ? '男' : '女'}`);
  if (bi.year) lines.push(`公历生日：${bi.year}-${String(bi.month).padStart(2, '0')}-${String(bi.day).padStart(2, '0')}（时辰序 ${bi.hour}）`);
  if (bi.city || bi.province) lines.push(`出生地：${[bi.province, bi.city].filter(Boolean).join(' ')}`);
  lines.push(`五行局：${chart.wuxingJuName || '未知'}`);
  lines.push(`命宫：${BRANCHES[(chart.mingGongBranch ?? 0) % 12]}；身宫：${BRANCHES[(chart.shenGongBranch ?? 0) % 12]}`);
  if (chart.mingZhu) lines.push(`命主：${chart.mingZhu}；身主：${chart.shenZhu || '—'}`);

  lines.push('');
  lines.push('【十二宫】');
  for (const p of chart.palaces || []) {
    const stem = STEMS[(p.stem ?? 0) % 10];
    const branch = BRANCHES[(p.branch ?? 0) % 12];
    const stars = (p.stars || [])
      .map((s) => `${s.name}${s.siHua ? `(化${s.siHua})` : ''}${s.brightnessRaw ? `[${s.brightnessRaw}]` : ''}`)
      .join('、');
    const flags = [p.isMingGong ? '命宫' : '', p.isShenGong ? '身宫' : ''].filter(Boolean).join('/');
    lines.push(`${p.name}${flags ? `(${flags})` : ''} ${stem}${branch}：${stars || '空宫'}`);
  }

  const dx = chart.daXians || [];
  if (dx.length) {
    lines.push('');
    lines.push('【大限】');
    lines.push(dx.map((d) => `${d.startAge}-${d.endAge}岁 ${d.palaceName}`).join('；'));
  }
  lines.push(`当前年龄：${chart.currentAge ?? '—'} 岁`);
  return lines.join('\n');
}

const SYSTEM_PROMPT = `你是紫微斗数解读助手，服务对象是普通用户，不是命理师。

规则：
1. 只依据【命盘数据】里出现的星曜、宫位、四化说话。数据里没有的星曜一律不许编造，宁可不提。
2. 术语第一次出现时用一句大白话解释（例：化忌＝执着、易卡住的点）。
3. 回答结构：先一句话给结论 → 再拆 2–4 条依据，每条对应具体宫位和星曜 → 最后给一条可执行的建议。
4. 中文简体，口语化，不堆砌吉凶断语，不做生死、疾病确诊、婚姻必然结果这类断言。
5. 长度控制在 400 字以内，除非用户明确要求展开。
6. 用户在问具体问题（换工作、感情、财运）时，紧扣问题答，不要泛泛复述整张盘。
7. 结尾不写免责声明套话。`;

function sse(obj) {
  return `data: ${JSON.stringify(obj)}\n\n`;
}

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS });
    }
    if (request.method !== 'POST') {
      return new Response('Method Not Allowed', { status: 405, headers: CORS });
    }

    let payload;
    try {
      payload = await request.json();
    } catch {
      return new Response('Invalid JSON', { status: 400, headers: CORS });
    }

    const { chart, messages } = payload || {};
    if (!chart) {
      return new Response('Missing chart', { status: 400, headers: CORS });
    }
    if (!env.ARK_API_KEY) {
      return new Response('Worker 未配置 ARK_API_KEY', { status: 500, headers: CORS });
    }

    const history = (Array.isArray(messages) ? messages : [])
      .filter((m) => m && m.content && (m.role === 'user' || m.role === 'assistant'))
      .slice(-8)
      .map((m) => ({ role: m.role, content: String(m.content).slice(0, 3000) }));

    const upstreamBody = {
      model: env.ARK_MODEL || 'doubao-seed-1-6-250615',
      stream: true,
      temperature: 0.7,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'system', content: `【命盘数据】\n${chartToText(chart)}` },
        ...history,
      ],
    };

    const upstream = await fetch('https://ark.cn-beijing.volces.com/api/v3/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${env.ARK_API_KEY}`,
      },
      body: JSON.stringify(upstreamBody),
    });

    if (!upstream.ok) {
      const errText = await upstream.text();
      return new Response(`上游模型返回 ${upstream.status}：${errText.slice(0, 300)}`, {
        status: 502,
        headers: CORS,
      });
    }

    const { readable, writable } = new TransformStream();
    const writer = writable.getWriter();
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();

    (async () => {
      const reader = upstream.body.getReader();
      let buf = '';
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buf += decoder.decode(value, { stream: true });
          const parts = buf.split('\n');
          buf = parts.pop() || '';
          for (const raw of parts) {
            const line = raw.trim();
            if (!line.startsWith('data:')) continue;
            const data = line.slice(5).trim();
            if (data === '[DONE]') continue;
            try {
              const json = JSON.parse(data);
              const text = json.choices?.[0]?.delta?.content;
              if (text) await writer.write(encoder.encode(sse({ delta: { text } })));
            } catch { /* 跳过不完整帧 */ }
          }
        }
        await writer.write(encoder.encode('data: [DONE]\n\n'));
      } catch (e) {
        await writer.write(encoder.encode(sse({ delta: { text: `\n[中断] ${e.message}` } })));
      } finally {
        await writer.close();
      }
    })();

    return new Response(readable, {
      headers: {
        ...CORS,
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache',
      },
    });
  },
};
