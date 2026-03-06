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
  title: "New Releases | Fictionry",
  description: "Fresh stories just published in the last 60 days",
};

const PAGE_SIZE = 50;

interface PageProps {
  searchParams: Promise<{ genre?: string; page?: string }>;
}

export default async function NewReleasesPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const genre = params.genre || "";
  const page = Math.max(1, parseInt(params.page || "1", 10));
  const offset = (page - 1) * PAGE_SIZE;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // 60 days ago
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 60);
  const cutoffStr = cutoff.toISOString();

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
    .gte("created_at", cutoffStr)
    .order("created_at", { ascending: false })
    .range(offset, offset + PAGE_SIZE - 1);

  if (genre) {
    query = query.eq("primary_genre", genre);
  }

  const { data, count, error } = await query;
  if (error) console.error("New releases query error:", error);

  const typedStories = (data || []) as unknown as StoryCardData[];

  await enrichWithCommunityPicks(typedStories, supabase);

  const totalPages = Math.ceil((count || 0) / PAGE_SIZE);

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">New Releases</h1>
        <p className="text-muted-foreground mt-1">
          Fresh stories published in the last 60 days
        </p>
      </div>

      <div className="mb-6">
        <DiscoveryFilter />
      </div>

      {typedStories.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">
              No new releases found{genre ? ` in ${genre}` : ""}. Check back
              soon!
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <DiscoveryStoryList stories={typedStories} surface="new_releases" userId={user?.id ?? null} />
          <DiscoveryPagination
            currentPage={page}
            totalPages={totalPages}
            basePath="/new-releases"
          />
        </>
      )}
    </div>
  );
}
