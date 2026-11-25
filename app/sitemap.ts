import type { MetadataRoute } from 'next';
import { PUBLIC_PATHS, SITE_URL } from '@/lib/site';

export default function sitemap(): MetadataRoute.Sitemap {
  return PUBLIC_PATHS.map((path) => ({
    url: `${SITE_URL}${path === '/' ? '' : path}`,
    changeFrequency: path === '/schedules' || path === '/sections' ? 'daily' : 'monthly',
    priority: path === '/' ? 1 : path === '/schedules' ? 0.9 : 0.5,
  }));
}
