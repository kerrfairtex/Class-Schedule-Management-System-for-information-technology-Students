/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  experimental: {
    forceSwcTransforms: true,
  },
  serverExternalPackages: ['better-sqlite3'],
  outputFileTracingRoot: __dirname,
};
module.exports = nextConfig;
