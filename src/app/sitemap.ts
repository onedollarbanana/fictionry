import { MetadataRoute } from 'next';
import { createClient } from '@supabase/supabase-js';
import { PRIMARY_GENRE_SLUGS } from '@/lib/constants';
import { getStoryUrl } from '@/lib/url-utils';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  const baseUrl = 'https://www.fictionry.com';

  // Static pages
  const staticPages = [
    '',
    '/browse',
    '/popular',
    '/rising-stars',
    '/new-releases',
    '/recently-updated',
    '/featured',
    '/community-picks',
    '/most-followed',
    '/tags',
    '/genres',
    '/guides',
    '/guides/authors',
    '/guides/readers',
    '/guides/migration',
    '/guides/community',
  ].map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: route === '' ? ('daily' as const) : ('weekly' as const),
    priority: route === '' ? 1 : 0.8,
  }));

  // Guide pages
  const guidePages = [
    '/guides/authors/getting-started',
    '/guides/authors/editor-formatting',
    '/guides/authors/publishing-chapters',
    '/guides/authors/story-analytics',
    '/guides/authors/monetization-setup',
    '/guides/authors/growing-audience',
    '/guides/readers/finding-stories',
    '/guides/readers/reading-experience',
    '/guides/readers/library-management',
    '/guides/readers/premium-features',
    '/guides/migration/from-wattpad',
    '/guides/migration/from-royal-road',
    '/guides/migration/from-ao3',
    '/guides/migration/from-scribblehub',
    '/guides/migration/bulk-import',
    '/guides/community/commenting-etiquette',
    '/guides/community/reviews-ratings',
    '/guides/community/reporting-content',
  ].map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: 'monthly' as const,
    priority: 0.6,
  }));

  // Genre pages (slugs are already URL-safe)
  const genrePages = PRIMARY_GENRE_SLUGS.map((slug) => ({
    url: `${baseUrl}/browse/genre/${slug}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.7,
  }));

  // Dynamic: stories
  const { data: stories } = await supabase
    .from('stories')
    .select('id, slug, short_id, updated_at')
    .eq('status', 'published');

  const storyPages = (stories || []).map((story) => ({
    url: `${baseUrl}${getStoryUrl(story)}`,
    lastModified: new Date(story.updated_at),
    changeFrequency: 'weekly' as const,
    priority: 0.7,
  }));

  // Dynamic: profiles
  const { data: profiles } = await supabase
    .from('profiles')
    .select('username, updated_at')
    .not('username', 'is', null);

  const profilePages = (profiles || []).map((profile) => ({
    url: `${baseUrl}/profile/${profile.username}`,
    lastModified: new Date(profile.updated_at),
    changeFrequency: 'weekly' as const,
    priority: 0.5,
  }));

  return [
    ...staticPages,
    ...guidePages,
    ...genrePages,
    ...storyPages,
    ...profilePages,
  ];
}
