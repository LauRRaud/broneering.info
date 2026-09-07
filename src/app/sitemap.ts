import type { MetadataRoute } from 'next';
import { headers } from 'next/headers';
import { searchPageForHost } from '@/lib/search';

export const dynamic = 'force-dynamic';
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const page = await searchPageForHost((await headers()).get('host') ?? '');
  return page ? [{ url: page.url }] : [];
}
