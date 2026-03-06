import { createClient } from '@/lib/supabase/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { StoryCardData } from '@/components/story/story-card';

// Re-export StoryCardData as RankedStory for backward compatibility
export type RankedStory = StoryCardData;

export type RankingPeriod = 'daily' | 'weekly' | 'monthly' | 'all-time';
export type RankingType = 'trending' | 'popular' | 'top-rated' | 'rising';

interface RankingOptions {
  period: RankingPeriod;
  type: RankingType;
  limit?: number;
}

// Helper type for Supabase client
type SupabaseClientType = SupabaseClient<any, 'public', any>;

export async function getRankings(options: RankingOptions): Promise<StoryCardData[]> {
  const { type, limit = 50 } = options;
  const supabase = await createClient();

  // Build query based on ranking type
  let query = supabase
    .from('stories')
    .select(`
      id, slug, short_id,
      title,
      tagline,
      blurb,
      cover_url,
      genres,
      tags,
      status,
      total_views,
      follower_count,
      chapter_count,
      rating_count,
      rating_sentiment,
      rating_confidence,
      bayesian_rating,
      created_at,
      updated_at,
      profiles!author_id(
        username,
        display_name
      )
    `)
    .eq('visibility', 'published')
    .gt('chapter_count', 0); // Only stories with at least one chapter

  // Apply sorting based on ranking type
  switch (type) {
    case 'trending':
    case 'popular':
      query = query.order('total_views', { ascending: false });
      break;
    case 'top-rated':
      query = query
        .in('rating_confidence', ['forming', 'established'])
        .order('bayesian_rating', { ascending: false });
      break;
    case 'rising':
      query = query.order('follower_count', { ascending: false });
      break;
  }

  query = query.limit(limit);

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching rankings:', error);
    return [];
  }

  return (data || []) as unknown as StoryCardData[];
}

export function getPeriodLabel(period: RankingPeriod): string {
  switch (period) {
    case 'daily':
      return 'Today';
    case 'weekly':
      return 'This Week';
    case 'monthly':
      return 'This Month';
    case 'all-time':
      return 'All Time';
  }
}

export function getTypeLabel(type: RankingType): string {
  switch (type) {
    case 'trending':
      return 'Trending';
    case 'popular':
      return 'Most Popular';
    case 'top-rated':
      return 'Top Rated';
    case 'rising':
      return 'Rising Stars';
  }
}

// Homepage-specific ranking functions
export async function getRisingStars(limit: number = 10, supabase?: SupabaseClientType): Promise<StoryCardData[]> {
  const client = supabase || await createClient();
  
  const { data, error } = await client.rpc('get_trending_stories', { limit_count: limit });

  if (error) {
    console.error('Error fetching rising stars:', error);
    return [];
  }

  // Map RPC result to StoryCardData format (profiles nested object)
  return (data || []).map((row: any) => ({
    id: row.id,
    title: row.title,
    tagline: row.tagline,
    blurb: row.blurb,
    cover_url: row.cover_url,
    genres: row.genres,
    tags: row.tags,
    status: row.status,
    total_views: row.total_views,
    follower_count: row.follower_count,
    chapter_count: row.chapter_count,
    rating_count: row.rating_count,
    rating_sentiment: row.rating_sentiment,
    rating_confidence: row.rating_confidence,
    bayesian_rating: row.bayesian_rating,
    created_at: row.created_at,
    updated_at: row.updated_at,
    profiles: {
      username: row.author_username,
      display_name: row.author_display_name,
    },
  })) as StoryCardData[];
}

export async function getPopularThisWeek(limit: number = 10, supabase?: SupabaseClientType): Promise<StoryCardData[]> {
  const client = supabase || await createClient();
  
  const { data, error } = await client
    .from('stories')
    .select(`
      id, slug, short_id,
      title,
      tagline,
      blurb,
      cover_url,
      genres,
      tags,
      status,
      total_views,
      follower_count,
      chapter_count,
      rating_count,
      rating_sentiment,
      rating_confidence,
      bayesian_rating,
      created_at,
      updated_at,
      profiles!author_id(
        username,
        display_name
      )
    `)
    .eq('visibility', 'published')
    .gt('chapter_count', 0)
    .order('total_views', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching popular this week:', error);
    return [];
  }

  return (data || []) as unknown as StoryCardData[];
}

export async function getLatestUpdates(limit: number = 10, supabase?: SupabaseClientType): Promise<StoryCardData[]> {
  const client = supabase || await createClient();
  
  const { data, error } = await client
    .from('stories')
    .select(`
      id, slug, short_id,
      title,
      tagline,
      blurb,
      cover_url,
      genres,
      tags,
      status,
      total_views,
      follower_count,
      chapter_count,
      rating_count,
      rating_sentiment,
      rating_confidence,
      bayesian_rating,
      created_at,
      updated_at,
      profiles!author_id(
        username,
        display_name
      )
    `)
    .eq('visibility', 'published')
    .gt('chapter_count', 0)
    .order('updated_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching latest updates:', error);
    return [];
  }

  return (data || []) as unknown as StoryCardData[];
}

export async function getMostFollowed(limit: number = 10, supabase?: SupabaseClientType): Promise<StoryCardData[]> {
  const client = supabase || await createClient();
  
  const { data, error } = await client
    .from('stories')
    .select(`
      id, slug, short_id,
      title,
      tagline,
      blurb,
      cover_url,
      genres,
      tags,
      status,
      total_views,
      follower_count,
      chapter_count,
      rating_count,
      rating_sentiment,
      rating_confidence,
      bayesian_rating,
      created_at,
      updated_at,
      profiles!author_id(
        username,
        display_name
      )
    `)
    .eq('visibility', 'published')
    .gt('chapter_count', 0)
    .order('follower_count', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching most followed:', error);
    return [];
  }

  return (data || []) as unknown as StoryCardData[];
}

export async function getNewReleases(limit: number = 10, supabase?: SupabaseClientType): Promise<StoryCardData[]> {
  const client = supabase || await createClient();

  const sixtyDaysAgo = new Date();
  sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

  const { data, error } = await client
    .from('stories')
    .select(`
      id, slug, short_id,
      title,
      tagline,
      blurb,
      cover_url,
      genres,
      tags,
      status,
      total_views,
      follower_count,
      chapter_count,
      rating_count,
      rating_sentiment,
      rating_confidence,
      bayesian_rating,
      created_at,
      updated_at,
      profiles!author_id(
        username,
        display_name
      )
    `)
    .eq('visibility', 'published')
    .gt('chapter_count', 0)
    .gte('created_at', sixtyDaysAgo.toISOString())
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching new releases:', error);
    return [];
  }

  return (data || []) as unknown as StoryCardData[];
}

export async function getStaffPicks(limit: number = 10, supabase?: SupabaseClientType): Promise<StoryCardData[]> {
  const client = supabase || await createClient();
  
  const { data, error } = await client
    .from('featured_stories')
    .select(`
      display_order,
      note,
      stories!story_id(
        id, slug, short_id, title, tagline, blurb, cover_url, genres, tags, status,
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
      if (!story) return null;
      return story as StoryCardData;
    })
    .filter(Boolean) as StoryCardData[];
}

export async function getStoriesByGenre(genre: string, limit: number = 10, supabase?: SupabaseClientType): Promise<StoryCardData[]> {
  const client = supabase || await createClient();
  
  const { data, error } = await client
    .from('stories')
    .select(`
      id, slug, short_id, title, tagline, blurb, cover_url, genres, tags, status,
      total_views, follower_count, chapter_count, rating_count, rating_sentiment, rating_confidence, bayesian_rating,
      created_at, updated_at,
      profiles!author_id(username, display_name)
    `)
    .eq('visibility', 'published')
    .gt('chapter_count', 0)
    .contains('genres', [genre])
    .order('total_views', { ascending: false })
    .limit(limit);

  if (error) {
    console.error(`Error fetching stories for genre ${genre}:`, error);
    return [];
  }

  return (data || []) as unknown as StoryCardData[];
}

export async function getTrendingThisWeek(limit: number = 10, supabase?: SupabaseClientType): Promise<StoryCardData[]> {
  const client = supabase || await createClient();
  
  const { data, error } = await client.rpc('get_trending_this_week', { limit_count: limit });
  
  if (error) {
    console.error('Error fetching trending this week:', error);
    // Fallback to popular by views if RPC fails
    return getPopularThisWeek(limit, client);
  }
  
  if (!data?.length) {
    // No reading activity data yet, fall back
    return getPopularThisWeek(limit, client);
  }
  
  return (data || []).map((row: any) => ({
    id: row.id,
    title: row.title,
    tagline: row.tagline,
    blurb: row.blurb,
    cover_url: row.cover_url,
    genres: row.genres,
    tags: row.tags,
    status: row.status,
    total_views: row.total_views,
    follower_count: row.follower_count,
    chapter_count: row.chapter_count,
    rating_count: row.rating_count,
    rating_sentiment: row.rating_sentiment,
    rating_confidence: row.rating_confidence,
    bayesian_rating: row.bayesian_rating,
    created_at: row.created_at,
    updated_at: row.updated_at,
    profiles: {
      username: row.author_username,
      display_name: row.author_display_name,
    },
  })) as StoryCardData[];
}

export async function getFastestGrowing(limit: number = 10, supabase?: SupabaseClientType): Promise<StoryCardData[]> {
  const client = supabase || await createClient();
  
  const { data, error } = await client.rpc('get_fastest_growing', { limit_count: limit });
  
  if (error) {
    console.error('Error fetching fastest growing:', error);
    return [];
  }
  
  if (!data?.length) return [];
  
  return (data || []).map((row: any) => ({
    id: row.id,
    title: row.title,
    tagline: row.tagline,
    blurb: row.blurb,
    cover_url: row.cover_url,
    genres: row.genres,
    tags: row.tags,
    status: row.status,
    total_views: row.total_views,
    follower_count: row.follower_count,
    chapter_count: row.chapter_count,
    rating_count: row.rating_count,
    rating_sentiment: row.rating_sentiment,
    rating_confidence: row.rating_confidence,
    bayesian_rating: row.bayesian_rating,
    created_at: row.created_at,
    updated_at: row.updated_at,
    profiles: {
      username: row.author_username,
      display_name: row.author_display_name,
    },
  })) as StoryCardData[];
}
