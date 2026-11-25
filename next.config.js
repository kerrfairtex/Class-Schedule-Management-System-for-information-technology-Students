const isDev = process.env.NODE_ENV === 'development';

// No third-party origins: fonts are self-hosted by next/font and every image
// and script is served from this app. 'unsafe-inline' is needed for the
// inline scripts Next.js emits without nonces (see the Next.js CSP guide);
// 'unsafe-eval' only in development for fast refresh.
const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ''}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' blob: data:",
  "font-src 'self'",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join('; ');

const securityHeaders = [
  { key: 'Content-Security-Policy', value: contentSecurityPolicy },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), browsing-topics=()' },
  // Production is served over HTTPS only (Render). Not sent in development.
  ...(isDev ? [] : [{ key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' }]),
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  poweredByHeader: false,
  experimental: {
    forceSwcTransforms: true,
  },
  serverExternalPackages: ['better-sqlite3'],
  outputFileTracingRoot: __dirname,
  // Students have no accounts; their old portal links go to the public schedules.
  async redirects() {
    return [{ source: '/student/:path*', destination: '/schedules', permanent: false }];
  },
  async headers() {
    return [{ source: '/(.*)', headers: securityHeaders }];
  },
};
module.exports = nextConfig;
