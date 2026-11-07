# 部署说明（GitHub Pages）

## 线上地址
- 站点：https://l2357936277-byte.github.io/ziwei-doushu/
- 排盘页：https://l2357936277-byte.github.io/ziwei-doushu/chart/
- 仓库：https://github.com/l2357936277-byte/ziwei-doushu

## 来源
基于开源项目 `Renhuai123/ziwei-doushu` 的排盘引擎，改造为纯静态站点部署在 GitHub Pages。

## 为静态部署所做的改动
| 文件 | 改动 |
|---|---|
| `next.config.js` | 增加 `output: 'export'`、`basePath`（由 `NEXT_PUBLIC_BASE_PATH` 注入）、`images.unoptimized`、`trailingSlash` |
| `app/robots.ts` / `app/sitemap.ts` | 补充 `export const dynamic = 'force-static'`（export 模式要求） |
| `app/library/search/page.tsx` | 改为客户端组件，运行时从 `window.location.search` 取关键词 |
| `app/knowledge/[star]/[topic]` | 移除。开源版 `STAR_DB` 为空，该路由会生成 0 条静态页导致构建失败 |
| `app/knowledge/page.tsx` | 主星卡片改为非跳转元素（详情页不存在） |
| `app/page.tsx`、`app/privacy`、`app/terms` | 原生 `<a href>` 补 `BASE_PATH` 前缀（`<Link>` 会自动处理，无需改） |
| `lib/basePath.ts` | 新增，导出 `NEXT_PUBLIC_BASE_PATH` |
| `.github/workflows/deploy-pages.yml` | 新增 Pages 构建与发布流水线 |

## 更新流程
```bash
git add -A && git commit -m "update" && git push myrepo main:main
```
推送后 Actions 自动构建，约 2 分钟上线。

## 本地运行
```bash
npm install          # 首次需要
npm run dev          # 开发模式 http://localhost:3000
# 或预览静态产物：
NEXT_PUBLIC_BASE_PATH= NEXT_PUBLIC_SITE_URL=http://localhost:8099 npm run build
cd out && python3 -m http.server 8099
```
注意：本地预览静态产物时 `NEXT_PUBLIC_BASE_PATH` 必须置空，否则资源路径会带 `/ziwei-doushu` 前缀而本地找不到。

## 已知限制（源于开源版本身）
- **命理解读 / AI 追问**：开源仓库不含 `/api/interpret` 后端，页面会提示「解读失败」。需要自行实现 OpenAI 兼容接口，参考 `.env.example`。
- **合盘（/heming）**：依赖 `/api/heming`，静态站点上不可用。
- **知识库详情页**：开源版论断库 `STAR_DB` 为空，已移除对应路由。

## 仓库可见性
公开仓库，Pages 免费。网址公开可访问，任何人可打开。
