import { createClient } from '@/lib/supabase/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { StoryCardData } from '@/components/story/story-card';

// Re-export StoryCardData as RankedStory for backward compatibility
export type RankedStory = StoryCardData;

export type RankingPeriod = 'daily' | 'weekly' | 'monthly' | 'all-time';
export type RankingType = 'trending' | 'popular' | 'top-rated' | 'rising';

// Helper type for Supabase client
type SupabaseClientType = SupabaseClient<any, 'public', any>;

/* eslint-disable @typescript-eslint/no-explicit-any */

const STORY_SELECT = `
  id, slug, short_id, title, tagline, blurb, cover_url, primary_genre, subgenres, tags, status,
  total_views, follower_count, chapter_count, rating_count, rating_sentiment, rating_confidence, bayesian_rating,
  created_at, updated_at,
  profiles!author_id(username, display_name)
`;

function mapRpcRow(row: any): StoryCardData {
  return {
    ...row,
    profiles: {
      username: row.author_username ?? row.username,
      display_name: row.author_display_name ?? row.display_name,
    },
  } as StoryCardData;
}

// ─── Homepage shelf functions ────────────────────────────────────────────────

/** Rising Stars — cross-genre engagement velocity, falls back to follower growth */
export async function getRisingStars(limit: number = 10, supabase?: SupabaseClientType): Promise<StoryCardData[]> {
  const client = supabase || await createClient();

  const { data, error } = await client.rpc('get_cross_genre_rising', { p_limit: limit });
  if (!error && data?.length) return data.map(mapRpcRow);

  // Fallback: recently-created stories with most followers
  const { data: fallback } = await client
    .from('stories')
    .select(STORY_SELECT)
    .eq('visibility', 'published')
    .gt('chapter_count', 0)
    .order('follower_count', { ascending: false })
    .limit(limit);
  return (fallback || []) as unknown as StoryCardData[];
}

/** Trending This Week — per-genre trending, falls back to recent activity */
export async function getTrendingThisWeek(limit: number = 10, supabase?: SupabaseClientType): Promise<StoryCardData[]> {
  const client = supabase || await createClient();

  // Use existing get_trending_this_week RPC if it has data
  const { data: legacyData, error: legacyError } = await client.rpc('get_trending_this_week', { limit_count: limit });
  if (!legacyError && legacyData?.length) {
    return legacyData.map((row: any) => ({
      ...row,
      profiles: { username: row.author_username, display_name: row.author_display_name },
    })) as StoryCardData[];
  }

  // Fallback: cross-genre rising (same data, different framing)
  const { data } = await client.rpc('get_cross_genre_rising', { p_limit: limit });
  if (data?.length) return data.map(mapRpcRow);

  // Final fallback: views-based
  const { data: fallback } = await client
    .from('stories')
    .select(STORY_SELECT)
    .eq('visibility', 'published')
    .gt('chapter_count', 0)
    .order('total_views', { ascending: false })
    .limit(limit);
  return (fallback || []) as unknown as StoryCardData[];
}

/** New Releases — recently published, ordered by freshness */
export async function getNewReleases(limit: number = 10, supabase?: SupabaseClientType): Promise<StoryCardData[]> {
  const client = supabase || await createClient();

  const sixtyDaysAgo = new Date();
  sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

  const { data, error } = await client
    .from('stories')
    .select(STORY_SELECT)
    .eq('visibility', 'published')
    .gt('chapter_count', 0)
    .gte('created_at', sixtyDaysAgo.toISOString())
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) console.error('Error fetching new releases:', error);
  return (data || []) as unknown as StoryCardData[];
}

/** Latest Updates — most recently updated stories */
export async function getLatestUpdates(limit: number = 10, supabase?: SupabaseClientType): Promise<StoryCardData[]> {
  const client = supabase || await createClient();

  const { data, error } = await client
    .from('stories')
    .select(STORY_SELECT)
    .eq('visibility', 'published')
    .gt('chapter_count', 0)
    .order('updated_at', { ascending: false })
    .limit(limit);

  if (error) console.error('Error fetching latest updates:', error);
  return (data || []) as unknown as StoryCardData[];
}

/** Staff Picks — editorially featured stories */
export async function getStaffPicks(limit: number = 10, supabase?: SupabaseClientType): Promise<StoryCardData[]> {
  const client = supabase || await createClient();

  const { data, error } = await client
    .from('featured_stories')
    .select(`
      display_order, note,
      stories!story_id(
        id, slug, short_id, title, tagline, blurb, cover_url, primary_genre, subgenres, tags, status,
        total_views, follower_count, chapter_count, rating_count, rating_sentiment, rating_confidence, bayesian_rating,
        created_at, updated_at,
        profiles!author_id(username, display_name)
      )
    `)
    .order('display_order', { ascending: true })
    .order('featured_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching staff picks:', error);
    return [];
  }

  return (data || [])
    .map((row: any) => {
      const story = Array.isArray(row.stories) ? row.stories[0] : row.stories;
      return story || null;
    })
    .filter(Boolean) as StoryCardData[];
}

/** Stories by genre — for homepage genre shelves, uses rising RPC */
export async function getStoriesByGenre(genre: string, limit: number = 10, supabase?: SupabaseClientType): Promise<StoryCardData[]> {
  const client = supabase || await createClient();

  const { data, error } = await client.rpc('get_rising_in_genre', { p_genre: genre, p_limit: limit });
  if (!error && data?.length) return data.map(mapRpcRow);

  // Fallback: direct query ordered by follower_count
  const { data: fallback } = await client
    .from('stories')
    .select(STORY_SELECT)
    .eq('visibility', 'published')
    .gt('chapter_count', 0)
    .eq('primary_genre', genre)
    .order('follower_count', { ascending: false })
    .limit(limit);
  return (fallback || []) as unknown as StoryCardData[];
}

/** Fastest Growing — high velocity stories */
export async function getFastestGrowing(limit: number = 10, supabase?: SupabaseClientType): Promise<StoryCardData[]> {
  const client = supabase || await createClient();

  const { data, error } = await client.rpc('get_fastest_growing', { limit_count: limit });
  if (!error && data?.length) {
    return data.map((row: any) => ({
      ...row,
      profiles: { username: row.author_username, display_name: row.author_display_name },
    })) as StoryCardData[];
  }

  // Fallback: cross-genre rising
  const { data: fallback } = await client.rpc('get_cross_genre_rising', { p_limit: limit });
  if (fallback?.length) return fallback.map(mapRpcRow);
  return [];
}

// ─── Legacy compatibility ────────────────────────────────────────────────────

export async function getRankings(): Promise<StoryCardData[]> {
  return getRisingStars(50);
}

export function getPeriodLabel(period: RankingPeriod): string {
  const labels: Record<RankingPeriod, string> = {
    daily: 'Today', weekly: 'This Week', monthly: 'This Month', 'all-time': 'All Time',
  };
  return labels[period];
}

export function getTypeLabel(type: RankingType): string {
  const labels: Record<RankingType, string> = {
    trending: 'Trending', popular: 'Most Popular', 'top-rated': 'Top Rated', rising: 'Rising Stars',
  };
  return labels[type];
}
