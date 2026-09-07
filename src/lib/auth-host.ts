const production = process.env.NODE_ENV === 'production';
const configured = process.env.AUTH_BASE_URL?.trim();
const raw = configured || 'http://haldus.localhost:3107';

function parse(value: string): URL {
  try {
    const url = new URL(value);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') throw new Error();
    if (url.username || url.password || url.pathname !== '/' || url.search || url.hash) throw new Error();
    return url;
  } catch { throw new Error('AUTH_BASE_URL must be an absolute http(s) origin'); }
}

let parsed: URL;
let configurationError: string | undefined;
try { parsed = parse(raw); }
catch { parsed = parse('http://haldus.localhost:3107'); configurationError = 'AUTH_BASE_URL must be an absolute http(s) origin'; }
export const authBaseUrl = parsed.origin;
export const authHost = parsed.host.toLowerCase();
export const authIsProduction = production;

/** Runtime guard: build-time imports must remain possible without deployment secrets. */
export function assertAuthConfiguration(): void {
  if (configurationError) throw new Error(configurationError);
  if (authIsProduction && !configured) throw new Error('AUTH_BASE_URL is required in production');
  if (authIsProduction && parsed.protocol !== 'https:') throw new Error('AUTH_BASE_URL must use HTTPS in production');
  const secret = process.env.AUTH_SECRET?.trim();
  if (authIsProduction && !secret) throw new Error('AUTH_SECRET is required in production');
  if (authIsProduction && secret && new TextEncoder().encode(secret).byteLength < 32) throw new Error('AUTH_SECRET must be at least 32 bytes in production');
}

export function isExactAuthHost(request: Request): boolean {
  const host = request.headers.get('host')?.trim().toLowerCase() || (() => {
    try { return new URL(request.url).host.toLowerCase(); } catch { return ''; }
  })();
  return host === authHost;
}

export function isExactAuthOrigin(origin: string | null | undefined): boolean { return origin === authBaseUrl; }
