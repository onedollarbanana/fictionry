export const revalidate = 60;

import { createClient } from "@/lib/supabase/server";
import { BookOpen } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { type StoryCardData } from "@/components/story/story-card";
import { DiscoveryFilter } from "@/components/discovery/discovery-filter";
import { DiscoveryStoryList } from "@/components/discovery/discovery-story-list";
import { enrichWithCommunityPicks } from "@/lib/community-picks";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Breaking Out | Fictionry",
  description: "Stories gaining momentum — breaking out across Fictionry",
  openGraph: {
    title: "Breaking Out | Fictionry",
    description:
      "Discover stories breaking out across Fictionry, ranked by engagement velocity.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Breaking Out | Fictionry",
    description:
      "Discover stories breaking out across Fictionry, ranked by engagement velocity.",
  },
  alternates: {
    canonical: "/breaking-out",
  },
};

interface PageProps {
  searchParams: Promise<{ genre?: string }>;
}

export default async function BreakingOutPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const genre = params.genre || "";
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Query story_rankings snapshot
  const today = new Date().toISOString().split("T")[0];
  let query = supabase
    .from("story_rankings")
    .select(
      `rank, score, stories!story_id(
        id, slug, short_id, title, tagline, blurb, cover_url, primary_genre, subgenres, tags, status,
        total_views, follower_count, chapter_count, word_count, rating_count, rating_sentiment, rating_confidence, bayesian_rating,
        created_at, updated_at,
        profiles!author_id(username, display_name)
      )`
    )
    .eq("page_slug", "breaking-out")
    .eq("snapshot_date", today)
    .order("rank", { ascending: true })
    .limit(50);

  if (genre) {
    query = query.eq("genre", genre);
  } else {
    query = query.is("genre", null);
  }

  const { data, error } = await query;
  if (error) console.error("Breaking out query error:", error);

  // Flatten results
  const stories = (data || []).map((r: any) => ({
    ...(r.stories as any),
    rank: r.rank,
    score: r.score,
  })) as (StoryCardData & { rank: number; score: number })[];

  await enrichWithCommunityPicks(stories, supabase);

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Breaking Out</h1>
        <p className="text-muted-foreground mt-1">
          Stories gaining momentum — ranked by engagement velocity
        </p>
      </div>

      <div className="mb-6">
        <DiscoveryFilter />
      </div>

      {stories.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">
              No stories breaking out{genre ? ` in ${genre}` : ""} yet. Check back
              soon!
            </p>
          </CardContent>
        </Card>
      ) : (
        <DiscoveryStoryList stories={stories} showRank surface="rising" userId={user?.id ?? null} />
      )}
    </div>
  );
}
