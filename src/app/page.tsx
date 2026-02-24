export const revalidate = 60
import { createClient } from "@/lib/supabase/server";
import { getCommunityPicksForHomepage } from "@/lib/community-picks";
import { 
  getRisingStars, 
  getLatestUpdates,
  getNewReleases,
  getStaffPicks,
  getStoriesByGenre,
  getTrendingThisWeek,
  getFastestGrowing 
} from "@/lib/rankings";
import { HeroSection } from "@/components/home/hero-section";
import { AnnouncementBanner } from "@/components/home/announcement-banner";
import { ContinueReading } from "@/components/home/continue-reading";
import { GenreLinks } from "@/components/home/genre-links";
import { StoryCarousel } from "@/components/home/story-carousel";
import { Rocket, Clock, Heart, Sparkles, Award, Trophy, Sword, Search, Skull, Gamepad2, Scroll, BookOpen, Users, TrendingUp, Flame } from "lucide-react";
import type { StoryCardData } from "@/components/story/story-card";
import { getStoryUrl } from '@/lib/url-utils'

/* eslint-disable @typescript-eslint/no-explicit-any */

export default async function Home() {
  // Create a single Supabase client for all queries
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Fetch user's genre order (behavioral weights > stated preferences)
  let userGenrePreferences: string[] = [];
  if (user) {
    const { getUserGenreOrder } = await import('@/lib/recommendations');
    userGenrePreferences = await getUserGenreOrder(user.id, supabase);
  }

  // Fetch Continue Reading data for logged-in users
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

  // "Because you read X" shelves for logged-in users
  let becauseYouReadShelves: { sourceTitle: string; sourceId: string; sourceSlug?: string; sourceShortId?: string; stories: StoryCardData[] }[] = [];

  // Collaborative filtering recommendations
  let collabRecommendations: StoryCardData[] = [];

  const GENRE_SHELVES = [
    { name: 'Fantasy', icon: <Sword className="h-5 w-5 text-purple-500" />, color: 'text-purple-500' },
    { name: 'Sci-Fi', icon: <Rocket className="h-5 w-5 text-cyan-500" />, color: 'text-cyan-500' },
    { name: 'Romance', icon: <Heart className="h-5 w-5 text-pink-500" />, color: 'text-pink-500' },
    { name: 'Mystery', icon: <Search className="h-5 w-5 text-slate-500" />, color: 'text-slate-500' },
    { name: 'Horror', icon: <Skull className="h-5 w-5 text-red-500" />, color: 'text-red-500' },
    { name: 'LitRPG', icon: <Gamepad2 className="h-5 w-5 text-emerald-500" />, color: 'text-emerald-500' },
    { name: 'Historical', icon: <Scroll className="h-5 w-5 text-amber-500" />, color: 'text-amber-500' },
  ];

  // Start fetching rankings in parallel immediately (don't wait for continue reading)
  const rankingsPromise = Promise.all([
    getRisingStars(10, supabase),
    getLatestUpdates(10, supabase),
    getNewReleases(10, supabase),
    getStaffPicks(10, supabase),
    getCommunityPicksForHomepage(10, supabase),
    getTrendingThisWeek(10, supabase),
    getFastestGrowing(10, supabase),
  ]);

  const genrePromise = Promise.all(
    GENRE_SHELVES.map(g => getStoriesByGenre(g.name, 10, supabase))
  );

  if (user) {
    // Get reading progress with story details
    const { data: progressData } = await supabase
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
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false })
      .limit(10);

    if (progressData && progressData.length > 0) {
      // Get next chapter IDs for each story
      const storyIds = progressData.map((p: any) => p.story_id);

      // Fetch which chapters the user has marked as read
      const { data: userReads } = await supabase
        .from('chapter_reads')
        .select('chapter_id')
        .eq('user_id', user.id)
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
        });
    }

    // Fetch "Because you read" and collaborative recommendations
    const { getBecauseYouRead, getCollaborativeRecommendations } = await import('@/lib/recommendations');
    becauseYouReadShelves = await getBecauseYouRead(user.id, 8, supabase);
    collabRecommendations = await getCollaborativeRecommendations(user.id, 10, supabase);
  }

  // Wait for rankings and genre results to complete
  const [risingStars, latestUpdates, newReleases, staffPicks, communityPicks, trendingThisWeek, fastestGrowing] = await rankingsPromise;
  const genreResults = await genrePromise;

  // Build ordered genre shelves: user's preferred genres first, then the rest
  const genreShelvesWithData = GENRE_SHELVES.map((genre, index) => ({
    ...genre,
    stories: genreResults[index] || [],
  })).filter(g => g.stories.length > 0);

  let orderedGenreShelves: typeof genreShelvesWithData;

  if (userGenrePreferences.length > 0) {
    const preferred = genreShelvesWithData.filter(g => 
      userGenrePreferences.includes(g.name)
    );
    const others = genreShelvesWithData.filter(g => 
      !userGenrePreferences.includes(g.name)
    );
    orderedGenreShelves = [...preferred, ...others];
  } else {
    orderedGenreShelves = genreShelvesWithData;
  }

  const isLoggedIn = !!user;

  return (
    <div className="bg-background min-h-screen">
      <main className="container mx-auto px-4 py-8">
        {/* Announcement Banner */}
        <AnnouncementBanner />

        {/* Hero Section - only for logged-out users */}
        <HeroSection isLoggedIn={isLoggedIn} />

        {/* Continue Reading - only for logged-in users */}
        {isLoggedIn && <ContinueReading items={continueReadingItems} />}

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

        {/* Genre Quick Links */}
        <GenreLinks />

        {/* Story Carousels */}
        {trendingThisWeek.length > 0 && (
          <StoryCarousel
            title="Trending This Week"
            icon={<Flame className="h-5 w-5 text-orange-500" />}
            stories={trendingThisWeek}
            viewAllLink="/browse"
            emptyMessage="Check back soon!"
          />
        )}
        {staffPicks.length > 0 && (
          <StoryCarousel
            title="Staff Picks"
            icon={<Award className="h-5 w-5 text-yellow-500" />}
            stories={staffPicks}
            viewAllLink="/featured"
            emptyMessage="Staff picks coming soon!"
          />
        )}
        {communityPicks.length > 0 && (
          <StoryCarousel
            title="Community Picks"
            icon={<Trophy className="h-5 w-5 text-amber-500" />}
            stories={communityPicks}
            viewAllLink="/community-picks"
            emptyMessage="Community picks coming soon!"
          />
        )}
        <StoryCarousel
          title="New Releases"
          icon={<Sparkles className="h-5 w-5 text-emerald-500" />}
          stories={newReleases}
          viewAllLink="/new-releases"
          emptyMessage="New stories coming soon!"
        />

        {/* Genre Shelves - personalized order for logged-in users */}
        {userGenrePreferences.length > 0 && orderedGenreShelves.some(g => !userGenrePreferences.includes(g.name)) && (
          <>
            {/* Preferred genre shelves */}
            {orderedGenreShelves
              .filter(g => userGenrePreferences.includes(g.name))
              .map((genre) => (
                <StoryCarousel
                  key={genre.name}
                  title={`Trending in ${genre.name}`}
                  icon={genre.icon}
                  stories={genre.stories}
                  viewAllLink={`/browse?genre=${encodeURIComponent(genre.name)}`}
                />
              ))}
            
            {/* Discover divider */}
            <div className="flex items-center gap-3 my-4">
              <div className="h-px flex-1 bg-border" />
              <span className="text-sm font-medium text-muted-foreground">Discover something different</span>
              <div className="h-px flex-1 bg-border" />
            </div>
            
            {/* Other genre shelves */}
            {orderedGenreShelves
              .filter(g => !userGenrePreferences.includes(g.name))
              .map((genre) => (
                <StoryCarousel
                  key={genre.name}
                  title={`Trending in ${genre.name}`}
                  icon={genre.icon}
                  stories={genre.stories}
                  viewAllLink={`/browse?genre=${encodeURIComponent(genre.name)}`}
                />
              ))}
          </>
        )}

        {/* No preferences or all genres are preferred - show all in default order */}
        {(userGenrePreferences.length === 0 || !orderedGenreShelves.some(g => !userGenrePreferences.includes(g.name))) && orderedGenreShelves.map((genre) => (
          <StoryCarousel
            key={genre.name}
            title={`Trending in ${genre.name}`}
            icon={genre.icon}
            stories={genre.stories}
            viewAllLink={`/browse?genre=${encodeURIComponent(genre.name)}`}
          />
        ))}

        <StoryCarousel
          title="Rising Stars"
          icon={<Rocket className="h-5 w-5 text-orange-500" />}
          stories={risingStars}
          viewAllLink="/rising-stars"
          emptyMessage="New stories coming soon!"
        />

        {fastestGrowing.length > 0 && (
          <StoryCarousel
            title="Fastest Growing"
            icon={<TrendingUp className="h-5 w-5 text-green-500" />}
            stories={fastestGrowing}
            viewAllLink="/browse"
            emptyMessage="Check back soon!"
          />
        )}

        <StoryCarousel
          title="Latest Updates"
          icon={<Clock className="h-5 w-5 text-blue-500" />}
          stories={latestUpdates}
          viewAllLink="/recently-updated"
          emptyMessage="No recent updates"
        />
      </main>
    </div>
  );
}
