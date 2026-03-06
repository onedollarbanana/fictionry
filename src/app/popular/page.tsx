export const revalidate = 60;

import { createClient } from "@/lib/supabase/server";
import { BookOpen } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { type StoryCardData } from "@/components/story/story-card";
import { DiscoveryFilter } from "@/components/discovery/discovery-filter";
import { DiscoveryStoryList } from "@/components/discovery/discovery-story-list";
import { DiscoveryPagination } from "@/components/discovery/discovery-pagination";
import { enrichWithCommunityPicks } from "@/lib/community-picks";

export const metadata = {
  title: "Most Popular | Fictionry",
  description:
    "Highest rated by views per chapter — fairer ranking for stories of all lengths",
};

const PAGE_SIZE = 50;

interface PageProps {
  searchParams: Promise<{ genre?: string; ongoing?: string; page?: string }>;
}

export default async function PopularPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const genre = params.genre || "";
  const ongoingOnly = params.ongoing === "true";
  const page = Math.max(1, parseInt(params.page || "1", 10));
  const offset = (page - 1) * PAGE_SIZE;

  const supabase = await createClient();

  // Query stories directly for flexibility with ongoing filter
  let query = supabase
    .from("stories")
    .select(
      `id, slug, short_id, title, tagline, blurb, cover_url, primary_genre, subgenres, tags, status,
       total_views, follower_count, chapter_count, rating_count, rating_sentiment, rating_confidence, bayesian_rating,
       created_at, updated_at,
       profiles!author_id(username, display_name)`,
      { count: "exact" }
    )
    .eq("visibility", "published")
    .gt("chapter_count", 0)
    .order("total_views", { ascending: false })
    .range(offset, offset + PAGE_SIZE - 1);

  if (genre) {
    query = query.eq("primary_genre", genre);
  }
  if (ongoingOnly) {
    query = query.eq("status", "ongoing");
  }

  const { data, count, error } = await query;
  if (error) console.error("Popular query error:", error);

  let typedStories = (data || []) as unknown as StoryCardData[];

  // Normalize: sort by views per chapter for fairer ranking
  typedStories.sort((a, b) => {
    const aScore =
      (a.total_views || 0) / Math.max(a.chapter_count || 1, 1);
    const bScore =
      (b.total_views || 0) / Math.max(b.chapter_count || 1, 1);
    return bScore - aScore;
  });

  // Add rank numbers based on position
  const rankedStories = typedStories.map((story, index) => ({
    ...story,
    rank: offset + index + 1,
  }));

  await enrichWithCommunityPicks(rankedStories, supabase);

  const totalPages = Math.ceil((count || 0) / PAGE_SIZE);

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Most Popular</h1>
        <p className="text-muted-foreground mt-1">
          Highest rated by views per chapter — fairer ranking for stories of all
          lengths
        </p>
      </div>

      <div className="mb-6">
        <DiscoveryFilter showOngoingToggle />
      </div>

      {rankedStories.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">
              No stories found{genre ? ` in ${genre}` : ""}.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <DiscoveryStoryList stories={rankedStories} showRank />
          <DiscoveryPagination
            currentPage={page}
            totalPages={totalPages}
            basePath="/popular"
          />
        </>
      )}
    </div>
  );
}
