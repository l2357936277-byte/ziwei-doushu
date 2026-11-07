/**
 * AI 解读接口地址。
 * 静态部署（GitHub Pages）时由 NEXT_PUBLIC_INTERPRET_API 指向自建 Worker；
 * 未配置则退回同域 /api/interpret（自托管 Next.js 时使用）。
 */
export const INTERPRET_API = process.env.NEXT_PUBLIC_INTERPRET_API || '/api/interpret';
