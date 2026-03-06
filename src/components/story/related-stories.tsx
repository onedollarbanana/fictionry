import { createClient } from '@/lib/supabase/server';
import { StoryCard, type StoryCardData } from '@/components/story/story-card';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Sparkles } from 'lucide-react';

interface RelatedStoriesProps {
  storyId: string;
  genres: string[];
  authorId: string;
  limit?: number;
}

export async function RelatedStories({ 
  storyId, 
  genres, 
  authorId,
  limit = 4 
}: RelatedStoriesProps) {
  const supabase = await createClient();

  // Find stories with overlapping genres, excluding current story and same author
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
      updated_at,
      profiles!author_id(
        username,
        display_name
      )
    `)
    .eq('visibility', 'published')
    .neq('id', storyId)
    .neq('author_id', authorId)
    .overlaps('genres', genres)
    .gt('chapter_count', 0)
    .order('total_views', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching related stories:', error);
    return null;
  }

  if (!stories || stories.length === 0) {
    return null;
  }

  const typedStories = stories as unknown as StoryCardData[];

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Sparkles className="h-5 w-5 text-primary" />
          You Might Also Like
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {typedStories.map((story) => (
            <StoryCard
              key={story.id}
              story={story}
              variant="horizontal"
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
