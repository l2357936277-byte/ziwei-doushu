/** @type {import('next').NextConfig} */
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';

const nextConfig = {
  output: 'export',
  basePath,
  transpilePackages: ['lunar-javascript'],
  images: { unoptimized: true },
  trailingSlash: true,
};

module.exports = nextConfig;
