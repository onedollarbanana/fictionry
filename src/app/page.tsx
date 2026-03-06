export const revalidate = 60
import { Suspense } from 'react'
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
import { GenreLinks } from "@/components/home/genre-links";
import { StoryCarousel } from "@/components/home/story-carousel";
import { PersonalizedShelves } from "@/components/home/personalized-shelves";
import { PersonalizedSkeleton } from "@/components/home/personalized-skeleton";
import { Rocket, Clock, Heart, Sparkles, Award, Trophy, Sword, Search, Skull, Gamepad2, Scroll, TrendingUp, Flame } from "lucide-react";
import type { Metadata } from "next";

/* eslint-disable @typescript-eslint/no-explicit-any */

export const metadata: Metadata = {
  title: "Fictionry — The Modern Way to Read and Write Fiction",
  description:
    "Discover thousands of free stories across every genre, or publish your own. Fictionry is the modern platform for readers and writers of fiction.",
  openGraph: {
    title: "Fictionry — The Modern Way to Read and Write Fiction",
    description:
      "Discover thousands of free stories across every genre, or publish your own. Fictionry is the modern platform for readers and writers of fiction.",
    type: "website",
    siteName: "Fictionry",
  },
  twitter: {
    card: "summary_large_image",
    title: "Fictionry — The Modern Way to Read and Write Fiction",
    description:
      "Discover thousands of free stories across every genre, or publish your own. Fictionry is the modern platform for readers and writers of fiction.",
  },
};

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

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Fictionry",
    url: "https://www.fictionry.com",
    description:
      "Discover thousands of free stories across every genre, or publish your own. Fictionry is the modern platform for readers and writers of fiction.",
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate:
          "https://www.fictionry.com/browse?q={search_term_string}",
      },
      "query-input": "required name=search_term_string",
    },
  };

  return (
    <div className="bg-background min-h-screen">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <main className="container mx-auto px-4 py-8">
        {/* Announcement Banner */}
        <AnnouncementBanner />

        {/* Hero Section - only for logged-out users */}
        <HeroSection isLoggedIn={isLoggedIn} />

        {/* Personalized content - streams in for logged-in users */}
        {isLoggedIn && (
          <Suspense fallback={<PersonalizedSkeleton />}>
            <PersonalizedShelves userId={user!.id} />
          </Suspense>
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
            surface="homepage"
          />
        )}
        {staffPicks.length > 0 && (
          <StoryCarousel
            title="Staff Picks"
            icon={<Award className="h-5 w-5 text-yellow-500" />}
            stories={staffPicks}
            viewAllLink="/featured"
            emptyMessage="Staff picks coming soon!"
            surface="featured"
          />
        )}
        {communityPicks.length > 0 && (
          <StoryCarousel
            title="Community Picks"
            icon={<Trophy className="h-5 w-5 text-amber-500" />}
            stories={communityPicks}
            viewAllLink="/community-picks"
            emptyMessage="Community picks coming soon!"
            surface="community_picks"
          />
        )}
        <StoryCarousel
          title="New Releases"
          icon={<Sparkles className="h-5 w-5 text-emerald-500" />}
          stories={newReleases}
          viewAllLink="/new-releases"
          emptyMessage="New stories coming soon!"
          surface="new_releases"
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
                  surface="homepage"
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
                  surface="homepage"
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
            surface="homepage"
          />
        ))}

        <StoryCarousel
          title="Rising Stars"
          icon={<Rocket className="h-5 w-5 text-orange-500" />}
          stories={risingStars}
          viewAllLink="/rising-stars"
          emptyMessage="New stories coming soon!"
          surface="rising"
        />

        {fastestGrowing.length > 0 && (
          <StoryCarousel
            title="Fastest Growing"
            icon={<TrendingUp className="h-5 w-5 text-green-500" />}
            stories={fastestGrowing}
            viewAllLink="/browse"
            emptyMessage="Check back soon!"
            surface="homepage"
          />
        )}

        <StoryCarousel
          title="Latest Updates"
          icon={<Clock className="h-5 w-5 text-blue-500" />}
          stories={latestUpdates}
          viewAllLink="/recently-updated"
          emptyMessage="No recent updates"
          surface="recently_updated"
        />
      </main>
    </div>
  );
}
