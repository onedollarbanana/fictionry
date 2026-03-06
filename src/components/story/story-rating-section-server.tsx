import { createClient } from '@/lib/supabase/server';
import { StoryRatingSection } from './story-rating-section';

interface StoryRatingSectionServerProps {
  storyId: string;
  authorId: string;
}

export async function StoryRatingSectionServer({ storyId, authorId }: StoryRatingSectionServerProps) {
  const supabase = await createClient();

  const [storyResult, userResult] = await Promise.all([
    supabase
      .from('stories')
      .select('rating_sentiment, rating_confidence, rating_count, chapter_count, word_count')
      .eq('id', storyId)
      .single(),
    supabase.auth.getUser(),
  ]);

  const currentUserId = userResult.data?.user?.id ?? null;
  const story = storyResult.data;

  const stats = {
    sentiment: story?.rating_sentiment ?? null,
    confidence: story?.rating_confidence ?? 'not_yet_rated',
    ratingCount: story?.rating_count ?? 0,
  };

  let userRating: number | null = null;
  let reviewText: string | null = null;
  let chaptersRead = 0;
  let wordsRead = 0;
  let reviewEligible = false;

  if (currentUserId) {
    const [userRatingResult, chaptersReadResult, wordsReadResult] = await Promise.all([
      supabase
        .from('story_ratings')
        .select('overall_rating, review_text')
        .eq('story_id', storyId)
        .eq('user_id', currentUserId)
        .maybeSingle(),
      supabase
        .from('chapter_reads')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', currentUserId)
        .eq('story_id', storyId),
      supabase
        .from('chapter_reads')
        .select('chapters!chapter_id(word_count)')
        .eq('user_id', currentUserId)
        .eq('story_id', storyId),
    ]);

    userRating = userRatingResult.data ? Number(userRatingResult.data.overall_rating) : null;
    reviewText = userRatingResult.data?.review_text ?? null;
    chaptersRead = chaptersReadResult.count ?? 0;

    wordsRead = ((wordsReadResult.data ?? []) as any[]).reduce((sum: number, row: any) => {
      const wc = Array.isArray(row.chapters) ? row.chapters[0]?.word_count : row.chapters?.word_count;
      return sum + (wc ?? 0);
    }, 0);

    const storyWords = story?.word_count ?? 0;
    const minWordsByPctReview = Math.min(25000, Math.max(5000, Math.round(0.50 * storyWords)));
    reviewEligible =
      chaptersRead >= 5 ||
      wordsRead >= 20000 ||
      (storyWords > 0 && wordsRead >= minWordsByPctReview);
  }

  // Eligibility for rating
  const storyWords = story?.word_count ?? 0;
  const minWordsByPct = Math.min(12000, Math.max(1500, Math.round(0.35 * storyWords)));
  const ratingEligible =
    chaptersRead >= 3 ||
    wordsRead >= 6000 ||
    (storyWords > 0 && wordsRead >= minWordsByPct);

  return (
    <StoryRatingSection
      storyId={storyId}
      authorId={authorId}
      initialStats={stats}
      initialUserRating={userRating}
      initialReviewText={reviewText}
      initialChaptersRead={chaptersRead}
      initialWordsRead={wordsRead}
      initialRatingEligible={ratingEligible}
      initialReviewEligible={reviewEligible}
      initialUserId={currentUserId}
    />
  );
}
