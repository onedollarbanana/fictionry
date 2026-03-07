import { createClient } from '@/lib/supabase/server';
import { StoryCard, type StoryCardData } from '@/components/story/story-card';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { User } from 'lucide-react';
import Link from 'next/link';

interface MoreFromAuthorProps {
  storyId: string;
  authorId: string;
  authorName: string;
  authorUsername: string;
  limit?: number;
}

export async function MoreFromAuthor({ 
  storyId, 
  authorId,
  authorName,
  authorUsername,
  limit = 3 
}: MoreFromAuthorProps) {
  const supabase = await createClient();

  // Find other stories by the same author
  const { data: stories, error } = await supabase
    .from('stories')
    .select(`
      id, slug, short_id,
      title,
      tagline,
      blurb,
      cover_url,
      primary_genre,
      subgenres,
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
    .eq('author_id', authorId)
    .eq('visibility', 'published')
    .neq('id', storyId)
    .gt('chapter_count', 0)
    .order('total_views', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching more from author:', error);
    return null;
  }

  if (!stories || stories.length === 0) {
    return null;
  }

  const typedStories = stories as unknown as StoryCardData[];

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-lg">
          <div className="flex items-center gap-2">
            <User className="h-5 w-5 text-primary" />
            More from {authorName}
          </div>
          <Link 
            href={`/profile/${authorUsername}`}
            className="text-sm font-normal text-primary hover:underline"
          >
            View all
          </Link>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {typedStories.map((story) => (
            <StoryCard
              key={story.id}
              story={story}
              variant="horizontal"
              size="sm"
              hideAuthor
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
