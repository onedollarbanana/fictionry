'use client';

import { useState } from 'react';
import { StarRating } from './star-rating';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { createClient } from '@/lib/supabase/client';
import { showToast } from '@/components/ui/toast';
import { checkRateLimit } from '@/lib/rate-limit';
import { Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';

interface RatingStats {
  sentiment: string | null;
  confidence: string;
  ratingCount: number;
}

interface StoryRatingSectionProps {
  storyId: string;
  authorId: string;
  initialStats?: RatingStats | null;
  initialUserRating?: number | null;
  initialReviewText?: string | null;
  initialChaptersRead?: number;
  initialWordsRead?: number;
  initialRatingEligible?: boolean;
  initialReviewEligible?: boolean;
  initialUserId?: string | null;
}

const SENTIMENT_LABELS: Record<string, string> = {
  excellent: 'Excellent',
  very_good: 'Very Good',
  positive: 'Positive',
  mixed: 'Mixed',
  divisive: 'Divisive',
  cool_reception: 'Cool Reception',
};

const CONFIDENCE_LABELS: Record<string, string> = {
  not_yet_rated: 'Not Yet Rated',
  early_feedback: 'Early Feedback',
  forming: 'Forming',
  established: 'Established',
};

function SentimentDisplay({ stats }: { stats: RatingStats }) {
  if (stats.confidence === 'not_yet_rated' || stats.ratingCount === 0) {
    return (
      <span className="text-sm text-zinc-500 dark:text-zinc-400">No ratings yet</span>
    );
  }

  const sentimentLabel = stats.sentiment ? SENTIMENT_LABELS[stats.sentiment] : null;
  const confidenceLabel = CONFIDENCE_LABELS[stats.confidence] ?? stats.confidence;
  const isEarlyFeedback = stats.confidence === 'early_feedback';

  return (
    <div className="flex items-center gap-2">
      {sentimentLabel ? (
        <span className="font-semibold text-sm">{sentimentLabel}</span>
      ) : (
        <span className="text-sm text-zinc-500 dark:text-zinc-400">Early Feedback</span>
      )}
      <span className="text-xs text-zinc-400 dark:text-zinc-500">
        {isEarlyFeedback
          ? `(${stats.ratingCount} rating${stats.ratingCount !== 1 ? 's' : ''})`
          : `· ${stats.ratingCount} rating${stats.ratingCount !== 1 ? 's' : ''} · ${confidenceLabel}`}
      </span>
    </div>
  );
}

export function StoryRatingSection({
  storyId,
  authorId,
  initialStats,
  initialUserRating = null,
  initialReviewText = null,
  initialChaptersRead = 0,
  initialWordsRead = 0,
  initialRatingEligible = false,
  initialReviewEligible = false,
  initialUserId = null,
}: StoryRatingSectionProps) {
  const [stats, setStats] = useState<RatingStats>(
    initialStats ?? { sentiment: null, confidence: 'not_yet_rated', ratingCount: 0 }
  );
  const [userRating, setUserRating] = useState<number | null>(initialUserRating);
  const [reviewText, setReviewText] = useState<string>(initialReviewText ?? '');
  const [editRating, setEditRating] = useState<number>(initialUserRating ?? 0);
  const [editReview, setEditReview] = useState<string>(initialReviewText ?? '');
  const [isSaving, setIsSaving] = useState(false);

  const userId = initialUserId;
  const isOwnStory = userId === authorId;
  const chaptersRead = initialChaptersRead;
  const ratingEligible = initialRatingEligible;
  const reviewEligible = initialReviewEligible;

  const supabase = createClient();

  async function handleSaveRating() {
    if (!userId || editRating === 0) return;
    setIsSaving(true);

    try {
      if (userRating !== null) {
        // Update existing — goes direct through RLS
        const { error } = await supabase
          .from('story_ratings')
          .update({
            overall_rating: editRating,
            review_text: reviewEligible && editReview.trim() ? editReview.trim() : null,
            updated_at: new Date().toISOString(),
          })
          .eq('story_id', storyId)
          .eq('user_id', userId);

        if (error) throw error;
        showToast('Rating updated!', 'success');
      } else {
        // New rating — goes through API (handles eligibility, credibility weight, notification)
        const rateCheck = await checkRateLimit(supabase, userId, 'review');
        if (!rateCheck.allowed) {
          showToast(rateCheck.message || 'Rate limited', 'error');
          setIsSaving(false);
          return;
        }

        const res = await fetch('/api/ratings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            story_id: storyId,
            overall_rating: editRating,
            review_text: reviewEligible && editReview.trim() ? editReview.trim() : null,
          }),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || 'Failed to save rating');
        }
        showToast('Rating saved!', 'success');
      }

      setUserRating(editRating);
      setReviewText(reviewEligible ? editReview : '');
    } catch (error: any) {
      console.error('Error saving rating:', error);
      showToast(error?.message || 'Failed to save rating', 'error');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDeleteRating() {
    if (!userId) return;
    setIsSaving(true);

    try {
      const { error } = await supabase
        .from('story_ratings')
        .delete()
        .eq('story_id', storyId)
        .eq('user_id', userId);

      if (error) throw error;

      setUserRating(null);
      setEditRating(0);
      setEditReview('');
      setReviewText('');
      showToast('Rating removed', 'success');
    } catch (error) {
      console.error('Error deleting rating:', error);
      showToast('Failed to remove rating', 'error');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="rounded-lg border border-zinc-200 dark:border-zinc-700 p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-lg">Ratings</h3>
        <SentimentDisplay stats={stats} />
      </div>

      {!userId ? (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">Sign in to rate this story</p>
      ) : isOwnStory ? (
        <p className="text-sm text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5">
          <AlertCircle className="h-4 w-4" />
          You cannot rate your own story
        </p>
      ) : !ratingEligible ? (
        <div className="text-sm text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5">
          <AlertCircle className="h-4 w-4" />
          <span>Read at least 3 chapters to rate this story ({chaptersRead} read so far)</span>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span>{chaptersRead} chapter{chaptersRead !== 1 ? 's' : ''} read — eligible to rate</span>
          </div>

          {/* Star rating */}
          <div className="space-y-1">
            <label className="text-sm font-medium">Your Rating</label>
            <StarRating
              value={editRating}
              onChange={setEditRating}
              size="lg"
              showValue
            />
          </div>

          {/* Review text (gated by higher threshold) */}
          {reviewEligible && (
            <div className="space-y-1">
              <label className="text-sm font-medium">
                Review <span className="text-xs text-zinc-400 font-normal">(optional)</span>
              </label>
              <Textarea
                value={editReview}
                onChange={(e) => setEditReview(e.target.value)}
                placeholder="Share your thoughts about this story..."
                rows={3}
                className="text-sm resize-none"
                maxLength={2000}
              />
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-2 pt-1">
            <Button
              onClick={handleSaveRating}
              disabled={isSaving || editRating === 0}
              size="sm"
            >
              {isSaving ? (
                <><Loader2 className="h-4 w-4 animate-spin mr-1" />Saving...</>
              ) : userRating !== null ? 'Update Rating' : 'Submit Rating'}
            </Button>

            {userRating !== null && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDeleteRating}
                disabled={isSaving}
                className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
              >
                Remove
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
