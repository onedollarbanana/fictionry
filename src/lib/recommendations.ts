import { createClient } from '@/lib/supabase/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { StoryCardData } from '@/components/story/story-card';

type SupabaseClientType = SupabaseClient<any, 'public', any>;

/**
 * Get user's genre weights, computing them if stale or missing.
 * Returns genres ordered by behavioral weight (strongest interest first).
 * Falls back to stated genre_preferences if no behavioral data exists.
 */
export async function getUserGenreOrder(userId: string, supabase?: SupabaseClientType): Promise<string[]> {
  const client = supabase || await createClient();
  
  // Get current weights
  const { data: profile } = await client
    .from('profiles')
    .select('computed_genre_weights, genre_preferences')
    .eq('id', userId)
    .single();
  
  if (!profile) return [];
  
  const weights = profile.computed_genre_weights as Record<string, number> | null;
  
  // If we have computed weights, use them
  if (weights && Object.keys(weights).length > 0) {
    return Object.entries(weights)
      .sort(([, a], [, b]) => b - a)
      .map(([genre]) => genre);
  }
  
  // Fall back to stated preferences
  return profile.genre_preferences || [];
}

/**
 * Trigger recomputation of genre weights for a user.
 * Call this after significant reading activity.
 */
export async function recomputeGenreWeights(userId: string, supabase?: SupabaseClientType): Promise<Record<string, number>> {
  const client = supabase || await createClient();
  
  const { data, error } = await client.rpc('compute_user_genre_weights', {
    target_user_id: userId
  });
  
  if (error) {
    console.error('Error computing genre weights:', error);
    return {};
  }
  
  return data as Record<string, number> || {};
}

/**
 * Get "Because you read X" recommendations.
 * Returns up to 3 shelves, each with a source story and similar stories.
 */
export async function getBecauseYouRead(
  userId: string,
  storiesPerShelf: number = 8,
  supabase?: SupabaseClientType
): Promise<{ sourceTitle: string; sourceId: string; sourceSlug?: string; sourceShortId?: string; stories: StoryCardData[] }[]> {
  const client = supabase || await createClient();
  
  // Get user's 3 most recently read stories
  const { data: recentReads, error: recentError } = await client.rpc('get_recent_reads', {
    target_user_id: userId,
    limit_count: 3
  });
  
  if (recentError || !recentReads?.length) return [];
  
  // For each recent read, get similar stories
  const shelves = await Promise.all(
    recentReads.map(async (read: any) => {
      const { data: similar, error } = await client.rpc('get_similar_stories', {
        source_story_id: read.story_id,
        limit_count: storiesPerShelf
      });
      
      if (error || !similar?.length) return null;
      
      // Map RPC results to StoryCardData format
      const stories: StoryCardData[] = similar.map((row: any) => ({
        id: row.id,
        slug: row.slug,
        short_id: row.short_id,
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
        rating_sentiment: row.rating_sentiment ?? null,
        rating_confidence: row.rating_confidence ?? null,
        bayesian_rating: row.bayesian_rating ?? null,
        created_at: row.created_at,
        updated_at: row.updated_at,
        profiles: {
          username: row.author_username,
          display_name: row.author_display_name,
        },
      }));

      return {
        sourceTitle: read.story_title,
        sourceId: read.story_id,
        sourceSlug: read.slug || null,
        sourceShortId: read.short_id || null,
        stories,
      };
    })
  );
  
  return shelves.filter(Boolean) as { sourceTitle: string; sourceId: string; sourceSlug?: string; sourceShortId?: string; stories: StoryCardData[] }[];
}

/**
 * Get collaborative filtering recommendations.
 * "Readers like you enjoyed" - finds stories read by users with similar taste.
 */
export async function getCollaborativeRecommendations(
  userId: string,
  limit: number = 10,
  supabase?: SupabaseClientType
): Promise<StoryCardData[]> {
  const client = supabase || await createClient();
  
  const { data, error } = await client.rpc('get_collaborative_recommendations', {
    target_user_id: userId,
    limit_count: limit
  });
  
  if (error) {
    console.error('Error fetching collaborative recommendations:', error);
    return [];
  }
  
  if (!data?.length) return [];
  
  return data.map((row: any) => ({
    id: row.id,
    slug: row.slug,
    short_id: row.short_id,
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
    rating_sentiment: row.rating_sentiment ?? null,
    rating_confidence: row.rating_confidence ?? null,
    bayesian_rating: row.bayesian_rating ?? null,
    created_at: row.created_at,
    updated_at: row.updated_at,
    profiles: {
      username: row.author_username,
      display_name: row.author_display_name,
    },
  })) as StoryCardData[];
}
