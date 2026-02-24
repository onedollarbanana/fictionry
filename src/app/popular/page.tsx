export const revalidate = 60
import { createClient } from '@/lib/supabase/server';
import { BookOpen } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { type StoryCardData } from '@/components/story/story-card';
import { BrowseStoryGrid } from '@/components/story/browse-story-grid';
import { GenreTagSort } from '@/components/browse/genre-tag-sort';
import { enrichWithCommunityPicks } from '@/lib/community-picks';

export const metadata = {
  title: 'Most Popular | Fictionry',
  description: 'All-time most viewed stories',
};

interface PageProps {
  searchParams: Promise<{ sort?: string }>;
}

export default async function PopularPage({ searchParams }: PageProps) {
  const { sort = 'popular' } = await searchParams;
  const supabase = await createClient();

  let orderColumn = 'total_views';
  const ascending = false;
  if (sort === 'newest') orderColumn = 'created_at';
  else if (sort === 'updated') orderColumn = 'updated_at';
  else if (sort === 'popular') orderColumn = 'total_views';

  const { data: stories, error } = await supabase
    .from('stories')
    .select(`
      id, slug, short_id, title, tagline, blurb, cover_url, genres, tags, status,
      total_views, follower_count, chapter_count, rating_average, rating_count,
      created_at, updated_at,
      profiles!author_id(username, display_name)
    `)
    .eq('visibility', 'published')
    .gt('chapter_count', 0)
    .order(orderColumn, { ascending })
    .limit(100);

  if (error) console.error('Error:', error);
  const typedStories = (stories || []) as unknown as StoryCardData[];

  // Normalize: sort by views per chapter for fairer ranking
  if (sort === 'popular') {
    typedStories.sort((a, b) => {
      const aScore = (a.total_views || 0) / Math.max(a.chapter_count || 1, 1);
      const bScore = (b.total_views || 0) / Math.max(b.chapter_count || 1, 1);
      return bScore - aScore;
    });
  }

  await enrichWithCommunityPicks(typedStories, supabase);

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Most Popular</h1>
          <p className="text-muted-foreground mt-1">
            Highest rated by views per chapter — fairer ranking for stories of all lengths
          </p>
        </div>
        <GenreTagSort currentSort={sort} />
      </div>

      {typedStories.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No popular stories yet.</p>
          </CardContent>
        </Card>
      ) : (
        <BrowseStoryGrid stories={typedStories} />
      )}
    </div>
  );
}
