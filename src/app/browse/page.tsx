export const revalidate = 60
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { BookOpen } from "lucide-react";
import { Suspense } from "react";
import Link from "next/link";
import { BrowseFilters } from "@/components/browse/browse-filters";
import { type StoryCardData } from "@/components/story/story-card";
import { BrowseStoryGrid } from "@/components/story/browse-story-grid";
import { enrichWithCommunityPicks } from "@/lib/community-picks";

interface SearchParams {
  search?: string;
  genre?: string;
  sort?: string;
  tag?: string;
  page?: string;
}

const PAGE_SIZE = 40;

function buildPageUrl(searchParams: SearchParams, page: number): string {
  const params = new URLSearchParams();
  if (searchParams.search) params.set("q", searchParams.search);
  if (searchParams.genre) params.set("genre", searchParams.genre);
  if (searchParams.sort && searchParams.sort !== "updated") params.set("sort", searchParams.sort);
  if (searchParams.tag) params.set("tag", searchParams.tag);
  if (page > 1) params.set("page", String(page));
  const qs = params.toString();
  return `/browse${qs ? `?${qs}` : ""}`;
}

export default async function BrowsePage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const { search, genre, sort = "updated", tag, page } = await searchParams;
  const supabase = await createClient();

  // Fetch all stories with author info and ratings
  const { data: stories, error } = await supabase
    .from("stories")
    .select(`
      id,
      slug,
      short_id,
      title,
      tagline,
      blurb,
      cover_url,
      genres,
      tags,
      status,
      total_views,
      follower_count,
      chapter_count,
      rating_average,
      rating_count,
      updated_at,
      profiles!author_id(
        username,
        display_name
      )
    `)
    .eq('visibility', 'published')
    .order("updated_at", { ascending: false });

  if (error) {
    console.error("Error fetching stories:", error);
  }

  let filteredStories = (stories as unknown as StoryCardData[]) || [];

  // Compute genre counts for filters
  const genreCounts: Record<string, number> = {};
  (stories as unknown as StoryCardData[])?.forEach(story => {
    story.genres?.forEach((g: string) => {
      genreCounts[g] = (genreCounts[g] || 0) + 1;
    });
  });

  // Apply search filter
  if (search) {
    const searchLower = search.toLowerCase();
    filteredStories = filteredStories.filter((story) =>
      story.title.toLowerCase().includes(searchLower) ||
      story.tagline?.toLowerCase().includes(searchLower) ||
      story.blurb?.toLowerCase().includes(searchLower) ||
      story.profiles?.username.toLowerCase().includes(searchLower)
    );
  }

  // Apply genre filter
  if (genre) {
    filteredStories = filteredStories.filter((story) =>
      story.genres?.includes(genre)
    );
  }

  // Apply tag filter
  const selectedTags = tag ? tag.split(',').map(t => t.trim().toLowerCase()) : [];
  if (selectedTags.length > 0) {
    filteredStories = filteredStories.filter((story) =>
      selectedTags.every((t) =>
        story.tags?.some((st: string) => st.toLowerCase() === t)
      )
    );
  }

  // Apply sorting
  filteredStories.sort((a, b) => {
    switch (sort) {
      case "newest":
        return new Date(b.updated_at || 0).getTime() - new Date(a.updated_at || 0).getTime();
      case "popular":
        return (b.total_views ?? 0) - (a.total_views ?? 0);
      case "followers":
        return (b.follower_count ?? 0) - (a.follower_count ?? 0);
      case "rating":
        return (Number(b.rating_average) || 0) - (Number(a.rating_average) || 0);
      default: // "updated"
        return new Date(b.updated_at || 0).getTime() - new Date(a.updated_at || 0).getTime();
    }
  });

  await enrichWithCommunityPicks(filteredStories, supabase);

  // Pagination
  const currentPage = Math.max(1, parseInt(page || '1'));
  const totalPages = Math.ceil(filteredStories.length / PAGE_SIZE);
  const paginatedStories = filteredStories.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const resultCount = filteredStories.length;
  const hasFilters = search || genre || sort !== "updated" || tag;
  const sp = { search, genre, sort, tag, page };

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <h1 className="text-3xl font-bold mb-6">Browse Stories</h1>

      <Suspense fallback={<div className="h-12 bg-muted animate-pulse rounded-md mb-6" />}>
        <BrowseFilters genreCounts={genreCounts} />
      </Suspense>

      {hasFilters && (
        <p className="text-sm text-muted-foreground mb-4">
          {resultCount} {resultCount === 1 ? "story" : "stories"} found
        </p>
      )}

      {paginatedStories.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">
              {search || genre || tag ? "No stories match your filters" : "No stories published yet"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <BrowseStoryGrid stories={paginatedStories} />
      )}

      {totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-8">
          {currentPage > 1 && (
            <Link
              href={buildPageUrl(sp, currentPage - 1)}
              className="px-4 py-2 text-sm border rounded-md hover:bg-muted transition-colors"
            >
              ← Previous
            </Link>
          )}
          <span className="px-4 py-2 text-sm text-muted-foreground">
            Page {currentPage} of {totalPages}
          </span>
          {currentPage < totalPages && (
            <Link
              href={buildPageUrl(sp, currentPage + 1)}
              className="px-4 py-2 text-sm border rounded-md hover:bg-muted transition-colors"
            >
              Next →
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
