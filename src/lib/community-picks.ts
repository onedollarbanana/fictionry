import { createClient } from '@/lib/supabase/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { StoryCardData } from '@/components/story/story-card';

type SupabaseClientType = SupabaseClient<any, 'public', any>;

export interface CommunityPickStory extends StoryCardData {
  nominationCount?: number;
  communityPickMonth?: string;
}

function getCurrentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
}

export async function getCommunityPicksLeaderboard(
  month?: string,
  limit: number = 20,
  supabase?: SupabaseClientType
): Promise<CommunityPickStory[]> {
  const client = supabase || await createClient();
  const targetMonth = month || getCurrentMonth();

  const { data, error } = await client.rpc('get_community_nominations_leaderboard', {
    target_month: targetMonth,
    limit_count: limit,
  });

  if (error) {
    console.error('Error fetching community picks leaderboard:', error);
    return [];
  }

  return (data || []).map((row: any) => ({
    id: row.id,
    slug: row.slug,
    short_id: row.shortId,
    title: row.title,
    tagline: row.tagline,
    blurb: row.blurb,
    cover_url: row.coverUrl,
    tags: row.tags,
    status: row.status,
    total_views: row.totalViews,
    follower_count: row.followerCount,
    chapter_count: row.chapterCount,
    rating_count: row.ratingCount,
    rating_sentiment: row.ratingSentiment ?? null,
    rating_confidence: row.ratingConfidence ?? null,
    bayesian_rating: row.bayesianRating ?? null,
    word_count: row.wordCount,
    created_at: row.createdAt,
    updated_at: row.updatedAt,
    profiles: {
      username: row.authorUsername,
      display_name: row.authorDisplayName,
    },
    nominationCount: Number(row.nominationCount),
  })) as CommunityPickStory[];
}

export async function getPastCommunityPicks(
  limit: number = 10,
  supabase?: SupabaseClientType
): Promise<CommunityPickStory[]> {
  const client = supabase || await createClient();

  const { data, error } = await client
    .from('community_picks')
    .select(`
      id,
      pick_month,
      vote_count,
      rank,
      stories!story_id(
        id, slug, short_id, title, tagline, blurb, cover_url, primary_genre, subgenres, tags, status,
        total_views, follower_count, chapter_count, rating_count, rating_sentiment, rating_confidence, bayesian_rating,
        word_count, created_at, updated_at,
        profiles!author_id(username, display_name)
      )
    `)
    .order('pick_month', { ascending: false })
    .order('rank', { ascending: true })
    .limit(limit);

  if (error) {
    console.error('Error fetching past community picks:', error);
    return [];
  }

  return (data || [])
    .map((row: any) => {
      const story = Array.isArray(row.stories) ? row.stories[0] : row.stories;
      if (!story) return null;
      return {
        ...story,
        nominationCount: row.vote_count,
        communityPickMonth: row.pick_month,
      } as CommunityPickStory;
    })
    .filter(Boolean) as CommunityPickStory[];
}

export async function getCommunityPicksForHomepage(
  limit: number = 10,
  supabase?: SupabaseClientType
): Promise<CommunityPickStory[]> {
  const client = supabase || await createClient();

  // First try locked picks from recent months
  const picks = await getPastCommunityPicks(limit, client);
  if (picks.length > 0) return picks;

  // Fall back to current month leaderboard
  return getCommunityPicksLeaderboard(undefined, limit, client);
}

export async function getCommunityPickBadge(
  storyId: string,
  supabase?: SupabaseClientType
): Promise<{ pickMonth: string } | null> {
  const client = supabase || await createClient();

  const { data, error } = await client
    .from('community_picks')
    .select('pick_month, stories!story_id(hide_community_badge)')
    .eq('story_id', storyId)
    .order('pick_month', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;

  const story = Array.isArray(data.stories) ? data.stories[0] : data.stories;
  if ((story as any)?.hide_community_badge) return null;

  return { pickMonth: data.pick_month };
}

/**
 * Enrich an array of stories with community pick month info.
 * Queries community_picks table for matching story IDs.
 */
export async function enrichWithCommunityPicks(
  stories: { id: string; communityPickMonth?: string | null }[],
  supabase: any
): Promise<void> {
  if (!stories.length) return;
  const storyIds = stories.map((s) => s.id);
  const { data: picks } = await supabase
    .from("community_picks")
    .select("story_id, pick_month")
    .in("story_id", storyIds);
  if (!picks?.length) return;
  // Use the most recent pick month per story
  const pickMap = new Map<string, string>();
  for (const p of picks) {
    const existing = pickMap.get(p.story_id);
    if (!existing || p.pick_month > existing) {
      pickMap.set(p.story_id, p.pick_month);
    }
  }
  for (const story of stories) {
    story.communityPickMonth = pickMap.get(story.id) || null;
  }
}
