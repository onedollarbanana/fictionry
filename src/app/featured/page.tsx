export const revalidate = 60
import { createClient } from '@/lib/supabase/server';
import { Award } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { type StoryCardData } from '@/components/story/story-card';
import { BrowseStoryGrid } from '@/components/story/browse-story-grid';
import { GenreTagSort } from '@/components/browse/genre-tag-sort';
import { enrichWithCommunityPicks } from '@/lib/community-picks';

export const metadata = {
  title: 'Staff Picks | Fictionry',
  description: 'Hand-picked stories by our editorial team',
};

interface PageProps {
  searchParams: Promise<{ sort?: string }>;
}

export default async function FeaturedPage({ searchParams }: PageProps) {
  const { sort = 'featured' } = await searchParams;
  const supabase = await createClient();

  // Fetch featured stories with nested story data
  const { data: featuredData, error } = await supabase
    .from('featured_stories')
    .select(`
      display_order,
      note,
      stories!story_id(
        id, slug, short_id, title, tagline, blurb, cover_url, primary_genre, subgenres, tags, status,
        total_views, follower_count, chapter_count, rating_count, rating_sentiment, rating_confidence, bayesian_rating,
        created_at, updated_at,
        profiles!author_id(username, display_name)
      )
    `)
    .order('display_order', { ascending: true })
    .order('featured_at', { ascending: false })
    .limit(100);

  if (error) console.error('Error:', error);

  // Extract stories from the nested join
  let typedStories = (featuredData || [])
    .map((row: any) => {
      const story = Array.isArray(row.stories) ? row.stories[0] : row.stories;
      return story as StoryCardData;
    })
    .filter(Boolean) as StoryCardData[];

  await enrichWithCommunityPicks(typedStories, supabase);

  // Apply secondary sort if requested
  if (sort === 'newest') {
    typedStories.sort((a, b) => new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime());
  } else if (sort === 'popular') {
    typedStories.sort((a, b) => (b.total_views || 0) - (a.total_views || 0));
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Award className="h-7 w-7 text-yellow-500" />
            <h1 className="text-3xl font-bold">Staff Picks</h1>
          </div>
          <p className="text-muted-foreground mt-1">
            Hand-picked stories by our editorial team &mdash; {typedStories.length} {typedStories.length === 1 ? 'story' : 'stories'}
          </p>
        </div>
        <GenreTagSort currentSort={sort} />
      </div>

      {typedStories.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Award className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No staff picks yet. Check back soon!</p>
          </CardContent>
        </Card>
      ) : (
        <BrowseStoryGrid stories={typedStories} />
      )}
    </div>
  );
}
