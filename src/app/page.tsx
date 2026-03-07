export const revalidate = 60
import { Suspense } from 'react'
import { createClient } from "@/lib/supabase/server";
import { getCommunityPicksForHomepage } from "@/lib/community-picks";
import { getRisingStars, getStoriesByGenre } from "@/lib/rankings";
import { HeroSection } from "@/components/home/hero-section";
import { AnnouncementBanner } from "@/components/home/announcement-banner";
import { GenreLinks } from "@/components/home/genre-links";
import { StoryCarousel } from "@/components/home/story-carousel";
import { PersonalizedShelves } from "@/components/home/personalized-shelves";
import { PersonalizedSkeleton } from "@/components/home/personalized-skeleton";
import { WelcomeBackHeader } from "@/components/home/welcome-back-header";
import { ForAuthors } from "@/components/home/for-authors";
import { Rocket, Heart, Sparkles, Award, Trophy, Sword, Search, Skull, Gamepad2, Scroll } from "lucide-react";
import type { Metadata } from "next";

/* eslint-disable @typescript-eslint/no-explicit-any */

export const metadata: Metadata = {
  title: "Fictionry — Where Great Fiction Finds Its Readers",
  description:
    "No algorithm gaming. No AI content floods. No predatory contracts. Just quality stories rising on reader love. Discover your next obsession on Fictionry.",
  openGraph: {
    title: "Fictionry — Where Great Fiction Finds Its Readers",
    description:
      "No algorithm gaming. No AI content floods. No predatory contracts. Just quality stories rising on reader love.",
    type: "website",
    siteName: "Fictionry",
  },
  twitter: {
    card: "summary_large_image",
    title: "Fictionry — Where Great Fiction Finds Its Readers",
    description:
      "No algorithm gaming. No AI content floods. No predatory contracts. Just quality stories rising on reader love.",
  },
};

const GENRE_SHELVES = [
  { name: 'Fantasy', slug: 'fantasy', icon: <Sword className="h-5 w-5 text-purple-500" /> },
  { name: 'Science Fiction', slug: 'science-fiction', icon: <Rocket className="h-5 w-5 text-cyan-500" /> },
  { name: 'Romance', slug: 'romance', icon: <Heart className="h-5 w-5 text-pink-500" /> },
  { name: 'Thriller & Mystery', slug: 'thriller-mystery', icon: <Search className="h-5 w-5 text-slate-500" /> },
  { name: 'Horror', slug: 'horror', icon: <Skull className="h-5 w-5 text-red-500" /> },
  { name: 'LitRPG', slug: 'litrpg', icon: <Gamepad2 className="h-5 w-5 text-emerald-500" /> },
  { name: 'Historical Fiction', slug: 'historical-fiction', icon: <Scroll className="h-5 w-5 text-amber-500" /> },
];

export default async function Home() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const isLoggedIn = !!user;

  // Community picks shown on both homepage variants
  const communityPicks = await getCommunityPicksForHomepage(10, supabase);

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
        urlTemplate: "https://www.fictionry.com/browse?q={search_term_string}",
      },
      "query-input": "required name=search_term_string",
    },
  };

  // ── LOGGED-OUT HOMEPAGE ──────────────────────────────────────────────────
  if (!isLoggedIn) {
    const [risingStars, { count: storyCount }] = await Promise.all([
      getRisingStars(10, supabase),
      supabase.from('stories').select('*', { count: 'exact', head: true }).eq('visibility', 'published'),
    ]);

    return (
      <div className="bg-background min-h-screen">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <main className="container mx-auto px-4 py-8">
          <AnnouncementBanner />
          <HeroSection isLoggedIn={false} storyCount={storyCount ?? undefined} />
          <GenreLinks />
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
            title="Breaking Out"
            icon={<Sparkles className="h-5 w-5 text-orange-500" />}
            stories={risingStars}
            viewAllLink="/breaking-out"
            emptyMessage="Stories coming soon!"
            surface="rising"
          />
          <ForAuthors />
        </main>
      </div>
    );
  }

  // ── LOGGED-IN HOMEPAGE ───────────────────────────────────────────────────
  const { getUserGenreOrder } = await import('@/lib/recommendations');
  const userGenrePreferences = await getUserGenreOrder(user!.id, supabase);

  const genreResults = await Promise.all(
    GENRE_SHELVES.map(g => getStoriesByGenre(g.slug, 10, supabase))
  );

  const genreShelvesWithData = GENRE_SHELVES.map((genre, index) => ({
    ...genre,
    stories: genreResults[index] || [],
  })).filter(g => g.stories.length > 0);

  let preferredShelves: typeof genreShelvesWithData;
  let otherShelves: typeof genreShelvesWithData;

  if (userGenrePreferences.length > 0) {
    preferredShelves = genreShelvesWithData.filter(g => userGenrePreferences.includes(g.slug));
    otherShelves = genreShelvesWithData.filter(g => !userGenrePreferences.includes(g.slug));
  } else {
    preferredShelves = genreShelvesWithData;
    otherShelves = [];
  }

  return (
    <div className="bg-background min-h-screen">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <main className="container mx-auto px-4 py-8">
        <AnnouncementBanner />

        {/* Welcome back header */}
        <Suspense fallback={<div className="h-14 mb-6" />}>
          <WelcomeBackHeader userId={user!.id} />
        </Suspense>

        {/* Personalized: Continue Reading + New Chapters + Recommendations */}
        <Suspense fallback={<PersonalizedSkeleton />}>
          <PersonalizedShelves userId={user!.id} />
        </Suspense>

        {/* Community Picks */}
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

        {/* Breaking Out in preferred genres */}
        {preferredShelves.map((genre) => (
          <StoryCarousel
            key={genre.name}
            title={`Breaking Out in ${genre.name}`}
            icon={genre.icon}
            stories={genre.stories}
            viewAllLink={`/browse/genre/${genre.slug}`}
            surface="homepage"
          />
        ))}

        {/* Explore Something New — genres outside user's preferences */}
        {otherShelves.length > 0 && (
          <>
            <div className="mt-10 mb-4">
              <h2 className="text-xl font-bold">Explore New Genres</h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                Stories breaking out in genres outside your usual reads
              </p>
            </div>
            {otherShelves.map((genre) => (
              <StoryCarousel
                key={genre.name}
                title={genre.name}
                icon={genre.icon}
                stories={genre.stories}
                viewAllLink={`/browse/genre/${genre.slug}`}
                surface="homepage"
              />
            ))}
          </>
        )}

        {/* Genre grid at bottom for logged-in users */}
        <GenreLinks />
      </main>
    </div>
  );
}
