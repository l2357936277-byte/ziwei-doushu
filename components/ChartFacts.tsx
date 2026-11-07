'use client';

/**
 * 命盘速览 —— 右侧静态信息栏
 * 替代原 InsightPanel（AI 解读需要后端，静态站点不提供）。
 */

import type { ZiweiChart } from '@/lib/ziwei/types';

const BRANCH = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
const STEM = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
const SIHUA_ORDER = ['禄', '权', '科', '忌'] as const;
const SIHUA_COLOR: Record<string, string> = {
  禄: 'var(--lu)',
  权: 'var(--quan)',
  科: 'var(--ke)',
  忌: 'var(--ji)',
};

export default function ChartFacts({ chart }: { chart: ZiweiChart }) {
  const sihuaMap: Record<string, string> = {};
  for (const p of chart.palaces) {
    for (const s of p.stars) {
      if (s.siHua) sihuaMap[s.siHua] = s.name;
    }
  }

  const currentDaxian = chart.daXians?.[chart.currentDaXianIndex];

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--ac-bdr)',
        padding: '18px 16px',
      }}
    >
      <div
        style={{
          fontSize: '11px',
          letterSpacing: '0.3em',
          color: 'var(--ac)',
          textAlign: 'center',
          marginBottom: '14px',
        }}
      >
        命盘速览
      </div>

      {/* 基本信息 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 8px', marginBottom: '16px' }}>
        {[
          ['命宫', BRANCH[chart.mingGongBranch] || '—'],
          ['身宫', BRANCH[chart.shenGongBranch] || '—'],
          ['五行局', chart.wuxingJuName || '—'],
          ['大限', currentDaxian ? `${currentDaxian.startAge}–${currentDaxian.endAge} ${currentDaxian.palaceName}` : '—'],
          ['命主', chart.mingZhu || '—'],
          ['身主', chart.shenZhu || '—'],
        ].map(([label, value]) => (
          <div key={label} style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
            <span style={{ fontSize: '10px', color: 'var(--tx-3)' }}>{label}</span>
            <span style={{ fontSize: '12px', color: 'var(--tx-0)', fontWeight: 600 }}>{value}</span>
          </div>
        ))}
      </div>

      {/* 生年四化 */}
      <div style={{ marginBottom: '16px' }}>
        <div style={{ fontSize: '10px', color: 'var(--tx-3)', letterSpacing: '0.2em', marginBottom: '8px' }}>
          生年四化
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
          {SIHUA_ORDER.map((k) => (
            <span
              key={k}
              style={{
                fontSize: '11px',
                padding: '3px 8px',
                borderRadius: '999px',
                border: `1px solid ${SIHUA_COLOR[k]}`,
                color: SIHUA_COLOR[k],
                opacity: sihuaMap[k] ? 1 : 0.35,
              }}
            >
              {k}·{sihuaMap[k] || '—'}
            </span>
          ))}
        </div>
      </div>

      {/* 十二宫主星 */}
      <div style={{ fontSize: '10px', color: 'var(--tx-3)', letterSpacing: '0.2em', marginBottom: '8px' }}>
        十二宫主星
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
        {chart.palaces.map((p) => {
          const majors = p.stars.filter((s) => s.type === 'major');
          const isCurrent = p.isCurrentDaXian;
          return (
            <div
              key={p.branch}
              style={{
                display: 'grid',
                gridTemplateColumns: '64px 1fr',
                alignItems: 'baseline',
                gap: '8px',
                padding: '5px 4px',
                borderRadius: '6px',
                background: isCurrent ? 'var(--ac-bg)' : 'transparent',
              }}
            >
              <span style={{ fontSize: '11px', color: 'var(--tx-2)' }}>{p.name}</span>
              <span style={{ fontSize: '11px', color: 'var(--tx-0)' }}>
                {majors.length === 0 ? (
                  <span style={{ color: 'var(--tx-3)' }}>空宫</span>
                ) : (
                  majors.map((s, i) => (
                    <span key={s.name + i}>
                      {s.name}
                      {s.siHua && <span style={{ color: SIHUA_COLOR[s.siHua] }}>{s.siHua}</span>}
                      {i < majors.length - 1 && '、'}
                    </span>
                  ))
                )}
              </span>
            </div>
          );
        })}
      </div>

      <div
        style={{
          marginTop: '14px',
          paddingTop: '12px',
          borderTop: '1px solid var(--bdr)',
          fontSize: '10px',
          lineHeight: 1.7,
          color: 'var(--tx-3)',
        }}
      >
        命盘由本站开源排盘引擎在本地浏览器计算，数据不上传。AI 解读需要自建后端，本站在线版不提供。
      </div>
    </div>
  );
}
