import { createClient } from '@/lib/supabase/server';
import { ContinueReading } from '@/components/home/continue-reading';
import { StoryCarousel } from '@/components/home/story-carousel';
import { BookOpen, Users } from 'lucide-react';
import type { StoryCardData } from '@/components/story/story-card';
import { getStoryUrl } from '@/lib/url-utils';

/* eslint-disable @typescript-eslint/no-explicit-any */

export async function PersonalizedShelves({ userId }: { userId: string }) {
  const supabase = await createClient();

  const { getBecauseYouRead, getCollaborativeRecommendations } = await import('@/lib/recommendations');

  // Fetch all user-specific data in parallel
  const [progressData, becauseYouReadShelves, collabRecommendations] = await Promise.all([
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
    getBecauseYouRead(userId, 8, supabase),
    getCollaborativeRecommendations(userId, 10, supabase),
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

  return (
    <>
      {/* Continue Reading - only for logged-in users */}
      <ContinueReading items={continueReadingItems} />

      {/* "Because You Read X" personalized shelves */}
      {becauseYouReadShelves.length > 0 && becauseYouReadShelves.map((shelf) => (
        <StoryCarousel
          key={`byr-${shelf.sourceId}`}
          title={`Because you read ${shelf.sourceTitle}`}
          icon={<BookOpen className="h-5 w-5 text-violet-500" />}
          stories={shelf.stories}
          viewAllLink={getStoryUrl({ id: shelf.sourceId, slug: shelf.sourceSlug || null, short_id: shelf.sourceShortId || null })}
        />
      ))}

      {/* Collaborative filtering shelf */}
      {collabRecommendations.length > 0 && (
        <StoryCarousel
          title="Readers like you enjoyed"
          icon={<Users className="h-5 w-5 text-indigo-500" />}
          stories={collabRecommendations}
          viewAllLink="/browse"
        />
      )}
    </>
  );
}
