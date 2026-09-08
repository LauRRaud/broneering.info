import type { NextConfig } from 'next';
const config: NextConfig = {
  output: 'standalone',
  // Runtime data and local verification artifacts are not application dependencies.
  outputFileTracingExcludes: {'/*': ['./output/**/*', './.private/**/*', './.env*']},
  poweredByHeader: false,
  allowedDevOrigins: ['ilutegu.localhost', 'teine.localhost', 'haldus.localhost'],
  async headers() {
    return [{ source: '/:path*', headers: [
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'Referrer-Policy', value: 'no-referrer' },
      { key: 'Content-Security-Policy', value: "frame-ancestors 'none'; object-src 'none'; base-uri 'self'" },
      { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' }
    ] }];
  }
};
export default config;
