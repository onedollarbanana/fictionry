export const revalidate = 60
import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import { BookOpen, Tag } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { type StoryCardData } from '@/components/story/story-card';
import { BrowseStoryGrid } from '@/components/story/browse-story-grid';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { GenreTagSort } from '@/components/browse/genre-tag-sort';
import { enrichWithCommunityPicks } from '@/lib/community-picks';

interface TagPageProps {
  params: Promise<{ tag: string }>;
  searchParams: Promise<{ sort?: string }>;
}

export async function generateMetadata({ params }: TagPageProps) {
  const { tag } = await params;
  const decodedTag = decodeURIComponent(tag);
  return {
    title: `#${decodedTag} Stories | Fictionry`,
    description: `Discover stories tagged with ${decodedTag} on Fictionry`
  };
}

export default async function TagPage({ params, searchParams }: TagPageProps) {
  const { tag } = await params;
  const { sort = 'popular' } = await searchParams;
  const decodedTag = decodeURIComponent(tag).toLowerCase();
  const supabase = await createClient();
  
  // Determine sort order
  const orderColumn = sort === 'newest' ? 'created_at' : 
                      sort === 'updated' ? 'updated_at' : 'total_views';
  
  // Fetch stories with this tag
  const { data: stories, error } = await supabase
    .from('stories')
    .select(`
      id, slug, short_id,
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
      rating_count,
      rating_sentiment,
      rating_confidence,
      bayesian_rating,
      created_at,
      updated_at,
      profiles!author_id(
        username,
        display_name
      )
    `)
    .eq('visibility', 'published')
    .contains('tags', [decodedTag])
    .order(orderColumn, { ascending: false })
    .limit(100);

  if (error) {
    console.error('Error fetching tag stories:', error);
  }

  const typedStories = (stories || []) as unknown as StoryCardData[];
  await enrichWithCommunityPicks(typedStories, supabase);

  // If no stories found with this tag, show 404
  if (typedStories.length === 0) {
    notFound();
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <Breadcrumb 
        items={[
          { label: 'Tags', href: '/browse' },
          { label: `#${decodedTag}` }
        ]} 
      />
      
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Tag className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">#{decodedTag}</h1>
            <p className="text-muted-foreground mt-1">
              {typedStories.length} {typedStories.length === 1 ? 'story' : 'stories'}
            </p>
          </div>
        </div>
        <GenreTagSort currentSort={sort} />
      </div>
      
      <BrowseStoryGrid stories={typedStories} />
    </div>
  );
}
