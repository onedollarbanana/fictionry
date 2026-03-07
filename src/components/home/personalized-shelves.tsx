import { createClient } from '@/lib/supabase/server';
import { ContinueReading } from '@/components/home/continue-reading';
import { StoryCarousel } from '@/components/home/story-carousel';
import { Bell, Users } from 'lucide-react';
import type { StoryCardData } from '@/components/story/story-card';

/* eslint-disable @typescript-eslint/no-explicit-any */

const STORY_SELECT = `
  id, slug, short_id, title, tagline, cover_url, primary_genre, subgenres, tags, status,
  total_views, follower_count, chapter_count, rating_count, rating_sentiment, rating_confidence, bayesian_rating,
  created_at, updated_at, profiles!author_id(username, display_name)
`;

export async function PersonalizedShelves({ userId, preferredGenreSlugs }: { userId: string; preferredGenreSlugs: string[] }) {
  const supabase = await createClient();

  // Fetch all user-specific data in parallel
  const [progressData, followsData, newChaptersData] = await Promise.all([
    supabase
      .from("reading_progress")
      .select(`
        story_id,
        chapter_id,
        chapter_number,
        stories (
          id,
          title,
          slug,
          short_id,
          cover_url,
          chapter_count,
          updated_at,
          visibility,
          profiles!author_id(
            username
          )
        )
      `)
      .eq("user_id", userId)
      .order("updated_at", { ascending: false })
      .limit(10)
      .then(res => res.data),
    // Stories user already follows (to exclude from recommendations)
    supabase
      .from('follows')
      .select('story_id')
      .eq('user_id', userId)
      .then(res => res.data || []),
    // New chapters in followed stories since user last read them
    supabase.rpc('get_new_chapters_in_library', { p_user_id: userId, p_limit: 10 })
      .then(res => res.data || []),
  ]);

  // Process continue reading data
  let continueReadingItems: {
    story_id: string;
    story_slug: string | null;
    story_short_id: string | null;
    title: string;
    cover_url: string | null;
    chapter_number: number;
    total_chapters: number;
    continue_chapter_number: number;
    next_chapter_id: string | null;
    next_chapter_slug: string | null;
    next_chapter_short_id: string | null;
    author_name: string;
    updated_at: string;
  }[] = [];

  if (progressData && progressData.length > 0) {
    // Get next chapter IDs for each story
    const storyIds = progressData.map((p: any) => p.story_id);

    // Fetch which chapters the user has marked as read
    const { data: userReads } = await supabase
      .from('chapter_reads')
      .select('chapter_id')
      .eq('user_id', userId)
      .in('story_id', storyIds);

    const readChapterIds = new Set<string>();
    if (userReads) {
      for (const read of userReads as any[]) {
        readChapterIds.add(read.chapter_id);
      }
    }

    // Fetch next chapters
    const { data: nextChapters } = await supabase
      .from("chapters")
      .select("id, story_id, chapter_number, slug, short_id")
      .in("story_id", storyIds)
      .eq("is_published", true)
      .order("chapter_number", { ascending: true });

    // Create a map of story_id + chapter_number -> chapter_id
    const nextChapterMap = new Map<string, { id: string; slug: string; short_id: string }>();
    if (nextChapters) {
      nextChapters.forEach((ch: any) => {
        const key = `${ch.story_id}-${ch.chapter_number}`;
        if (!nextChapterMap.has(key)) {
          nextChapterMap.set(key, { id: ch.id, slug: ch.slug, short_id: ch.short_id });
        }
      });
    }

    continueReadingItems = progressData
      .filter((p: any) => {
        if (!p.stories) return false;
        const story = Array.isArray(p.stories) ? p.stories[0] : p.stories;
        // Filter out draft and removed stories
        return story?.visibility !== 'draft' && story?.visibility !== 'removed';
      })
      .map((p: any) => {
        // Supabase returns single relation as object, not array
        const story = Array.isArray(p.stories) ? p.stories[0] : p.stories;
        const profile = story?.profiles;
        const authorName = Array.isArray(profile) ? profile[0]?.username : profile?.username;
        // Determine if user is mid-chapter or finished
        const currentChapterId = p.chapter_id;
        const isMidRead = currentChapterId ? !readChapterIds.has(currentChapterId) : false;
        const continueChapterNum = isMidRead ? p.chapter_number : p.chapter_number + 1;
        const continueChapterInfo = isMidRead
          ? nextChapterMap.get(`${p.story_id}-${p.chapter_number}`) || null
          : nextChapterMap.get(`${p.story_id}-${p.chapter_number + 1}`) || null;
        return {
          story_id: p.story_id,
          story_slug: story?.slug || null,
          story_short_id: story?.short_id || null,
          title: story?.title || "Unknown",
          cover_url: story?.cover_url || null,
          chapter_number: p.chapter_number,
          total_chapters: story?.chapter_count || 0,
          continue_chapter_number: continueChapterNum,
          next_chapter_id: continueChapterInfo?.id || null,
          next_chapter_slug: continueChapterInfo?.slug || null,
          next_chapter_short_id: continueChapterInfo?.short_id || null,
          author_name: authorName || "Unknown",
          updated_at: story?.updated_at || new Date().toISOString(),
        };
      })
      .filter((item: { continue_chapter_number: number; total_chapters: number }) => item.continue_chapter_number <= item.total_chapters);
  }

  // Map new chapters RPC rows to StoryCardData shape
  const newChapterStories: StoryCardData[] = (newChaptersData as any[]).map((r) => ({
    ...r,
    profiles: { username: r.author_username, display_name: r.author_display_name },
  }));

  // Fetch "Recommended For You": stories in preferred genres not yet followed, with quality threshold
  let recommendedStories: StoryCardData[] = [];
  if (preferredGenreSlugs.length > 0) {
    const followedIds = (followsData as any[]).map((f: any) => f.story_id);

    let query = supabase
      .from('stories')
      .select(STORY_SELECT)
      .eq('visibility', 'published')
      .in('primary_genre', preferredGenreSlugs)
      .or('follower_count.gte.50,rating_count.gte.10')
      .order('follower_count', { ascending: false })
      .limit(10);

    if (followedIds.length > 0) {
      query = query.not('id', 'in', `(${followedIds.join(',')})`);
    }

    const { data: recData } = await query;
    if (recData) {
      recommendedStories = recData.map((r: any) => ({
        ...r,
        profiles: Array.isArray(r.profiles) ? r.profiles[0] : r.profiles,
      }));
    }
  }

  return (
    <>
      {/* Continue Reading - only for logged-in users */}
      <ContinueReading items={continueReadingItems} />

      {/* New chapters in followed stories */}
      {newChapterStories.length > 0 && (
        <StoryCarousel
          title="New in Your Library"
          icon={<Bell className="h-5 w-5 text-blue-500" />}
          stories={newChapterStories}
          viewAllLink="/library"
          emptyMessage=""
        />
      )}

      {/* Recommended For You */}
      {recommendedStories.length > 0 && (
        <StoryCarousel
          title="Recommended For You"
          icon={<Users className="h-5 w-5 text-violet-500" />}
          stories={recommendedStories}
          viewAllLink="/browse"
        />
      )}
    </>
  );
}
