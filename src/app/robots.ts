import type { MetadataRoute } from 'next';
import { headers } from 'next/headers';
import { searchPageForHost } from '@/lib/search';

export const dynamic = 'force-dynamic';
export default async function robots(): Promise<MetadataRoute.Robots> {
  const page = await searchPageForHost((await headers()).get('host') ?? '');
  // Let crawlers read noindex on excluded HTML pages; disallowing / would hide that instruction.
  return {
    rules: { userAgent: '*', allow: '/', disallow: ['/api/'] },
    ...(page ? { sitemap: `${page.url}sitemap.xml` } : {}),
  };
}
