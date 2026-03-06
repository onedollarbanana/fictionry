'use client';

import { useState, useEffect } from 'react';
import { StarRating } from './star-rating';
import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/client';
import { showToast } from '@/components/ui/toast';
import { checkRateLimit } from '@/lib/rate-limit';
import { Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';

interface RatingStats {
  averageRating: number;
  ratingCount: number;
}

interface UserRating {
  overall_rating: number;
  style_rating: number | null;
  story_rating: number | null;
  grammar_rating: number | null;
  character_rating: number | null;
}

interface StoryRatingSectionProps {
  storyId: string;
  authorId: string;
  // New server-provided initial data
  initialStats?: { averageRating: number; ratingCount: number } | null;
  initialUserRating?: UserRating | null;
  initialChaptersRead?: number;
  initialUserId?: string | null;
}

export function StoryRatingSection({ storyId, authorId, initialStats, initialUserRating, initialChaptersRead, initialUserId }: StoryRatingSectionProps) {
  const [stats, setStats] = useState<RatingStats | null>(initialStats ?? null);
  const [userRating, setUserRating] = useState<UserRating | null>(initialUserRating ?? null);
  const [chaptersRead, setChaptersRead] = useState<number>(initialChaptersRead ?? 0);
  const [userId, setUserId] = useState<string | null>(initialUserId ?? null);
  const [isLoading, setIsLoading] = useState(!initialStats); // Only show loading if no initial data
  const [isSaving, setIsSaving] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  
  // Local state for editing
  const [editRating, setEditRating] = useState<UserRating>(() => {
    if (initialUserRating) {
      return initialUserRating;
    }
    return {
      overall_rating: 0,
      style_rating: null,
      story_rating: null,
      grammar_rating: null,
      character_rating: null,
    };
  });
  
  const supabase = createClient();
  const MIN_CHAPTERS = 3;
  const canRate = chaptersRead >= MIN_CHAPTERS && userId && userId !== authorId;
  const isOwnStory = userId === authorId;
  
  useEffect(() => {
    if (initialStats !== undefined) return; // Server already provided data
    loadData();
  }, [storyId]);
  
  async function loadData() {
    setIsLoading(true);
    
    try {
      // Get current user
      const { data: { session } } = await supabase.auth.getSession();
      const currentUserId = session?.user?.id || null;
      setUserId(currentUserId);
      
      // Get rating stats
      const { data: ratings } = await supabase
        .from('story_ratings')
        .select('overall_rating')
        .eq('story_id', storyId);
      
      if (ratings && ratings.length > 0) {
        const avg = ratings.reduce((sum, r) => sum + Number(r.overall_rating), 0) / ratings.length;
        setStats({
          averageRating: Math.round(avg * 10) / 10,
          ratingCount: ratings.length,
        });
      } else {
        setStats({ averageRating: 0, ratingCount: 0 });
      }
      
      if (currentUserId) {
        // Get user's rating if exists
        const { data: existingRating } = await supabase
          .from('story_ratings')
          .select('overall_rating, style_rating, story_rating, grammar_rating, character_rating')
          .eq('story_id', storyId)
          .eq('user_id', currentUserId)
          .maybeSingle();
        
        if (existingRating) {
          setUserRating(existingRating);
          setEditRating({
            overall_rating: Number(existingRating.overall_rating),
            style_rating: existingRating.style_rating ? Number(existingRating.style_rating) : null,
            story_rating: existingRating.story_rating ? Number(existingRating.story_rating) : null,
            grammar_rating: existingRating.grammar_rating ? Number(existingRating.grammar_rating) : null,
            character_rating: existingRating.character_rating ? Number(existingRating.character_rating) : null,
          });
        }
        
        // Get chapters read count
        const { count } = await supabase
          .from('chapter_reads')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', currentUserId)
          .eq('story_id', storyId);
        
        setChaptersRead(count || 0);
      }
    } catch (error) {
      console.error('Error loading rating data:', error);
    } finally {
      setIsLoading(false);
    }
  }
  
  async function handleSaveRating() {
    if (!userId || editRating.overall_rating === 0) return;
    
    setIsSaving(true);
    
    try {
      const ratingData = {
        story_id: storyId,
        user_id: userId,
        overall_rating: editRating.overall_rating,
        style_rating: editRating.style_rating,
        story_rating: editRating.story_rating,
        grammar_rating: editRating.grammar_rating,
        character_rating: editRating.character_rating,
        chapters_read: chaptersRead,
        updated_at: new Date().toISOString(),
      };
      
      if (userRating) {
        // Update existing (no notification for updates)
        const { error } = await supabase
          .from('story_ratings')
          .update(ratingData)
          .eq('story_id', storyId)
          .eq('user_id', userId);

        if (error) throw error;
        showToast('Rating updated!', 'success');
      } else {
        // Insert new via API (triggers author notification + email)
        const rateCheck = await checkRateLimit(supabase, userId, 'review');
        if (!rateCheck.allowed) {
          showToast(rateCheck.message || 'Rate limited', 'error');
          setIsSaving(false);
          return;
        }

        const res = await fetch('/api/ratings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(ratingData),
        });
        if (!res.ok) throw new Error('Failed to save rating');
        showToast('Rating saved!', 'success');
      }
      
      setUserRating(editRating);
      loadData(); // Refresh stats
    } catch (error) {
      console.error('Error saving rating:', error);
      showToast('Failed to save rating', 'error');
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
      setEditRating({
        overall_rating: 0,
        style_rating: null,
        story_rating: null,
        grammar_rating: null,
        character_rating: null,
      });
      showToast('Rating removed', 'success');
      loadData(); // Refresh stats
    } catch (error) {
      console.error('Error deleting rating:', error);
      showToast('Failed to remove rating', 'error');
    } finally {
      setIsSaving(false);
    }
  }
  
  if (isLoading) {
    return (
      <div className="rounded-lg border border-zinc-200 dark:border-zinc-700 p-4">
        <div className="flex items-center gap-2 text-zinc-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Loading ratings...</span>
        </div>
      </div>
    );
  }
  
  return (
    <div className="rounded-lg border border-zinc-200 dark:border-zinc-700 p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-lg">Ratings</h3>
        
        {/* Average rating display */}
        {stats && stats.ratingCount > 0 ? (
          <div className="flex items-center gap-2">
            <StarRating value={stats.averageRating} readonly size="md" />
            <span className="text-sm text-zinc-500 dark:text-zinc-400">
              {stats.averageRating.toFixed(1)} ({stats.ratingCount} rating{stats.ratingCount !== 1 ? 's' : ''})
            </span>
          </div>
        ) : (
          <span className="text-sm text-zinc-500 dark:text-zinc-400">
            No ratings yet
          </span>
        )}
      </div>
      
      {/* User rating section */}
      {!userId ? (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Sign in to rate this story
        </p>
      ) : isOwnStory ? (
        <p className="text-sm text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5">
          <AlertCircle className="h-4 w-4" />
          You cannot rate your own story
        </p>
      ) : chaptersRead < MIN_CHAPTERS ? (
        <div className="text-sm text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5">
          <AlertCircle className="h-4 w-4" />
          <span>
            Read at least {MIN_CHAPTERS} chapters to rate ({chaptersRead}/{MIN_CHAPTERS} read)
          </span>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Confirmed can rate */}
          <div className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span>{chaptersRead} chapters read</span>
          </div>
          
          {/* Overall rating */}
          <div className="space-y-1">
            <label className="text-sm font-medium">Overall Score</label>
            <div className="flex items-center gap-3">
              <StarRating
                value={editRating.overall_rating}
                onChange={(v) => setEditRating({ ...editRating, overall_rating: v })}
                size="lg"
                showValue
              />
            </div>
          </div>
          
          {/* Advanced ratings toggle */}
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="text-sm text-violet-600 dark:text-violet-400 hover:underline"
          >
            {showAdvanced ? 'Hide' : 'Show'} detailed ratings
          </button>
          
          {showAdvanced && (
            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-zinc-200 dark:border-zinc-700">
              <div className="space-y-1">
                <label className="text-xs text-zinc-600 dark:text-zinc-400">Style</label>
                <StarRating
                  value={editRating.style_rating || 0}
                  onChange={(v) => setEditRating({ ...editRating, style_rating: v })}
                  size="sm"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-zinc-600 dark:text-zinc-400">Story</label>
                <StarRating
                  value={editRating.story_rating || 0}
                  onChange={(v) => setEditRating({ ...editRating, story_rating: v })}
                  size="sm"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-zinc-600 dark:text-zinc-400">Grammar</label>
                <StarRating
                  value={editRating.grammar_rating || 0}
                  onChange={(v) => setEditRating({ ...editRating, grammar_rating: v })}
                  size="sm"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-zinc-600 dark:text-zinc-400">Character</label>
                <StarRating
                  value={editRating.character_rating || 0}
                  onChange={(v) => setEditRating({ ...editRating, character_rating: v })}
                  size="sm"
                />
              </div>
            </div>
          )}
          
          {/* Action buttons */}
          <div className="flex items-center gap-2 pt-2">
            <Button
              onClick={handleSaveRating}
              disabled={isSaving || editRating.overall_rating === 0}
              size="sm"
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-1" />
                  Saving...
                </>
              ) : userRating ? (
                'Update Rating'
              ) : (
                'Submit Rating'
              )}
            </Button>
            
            {userRating && (
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
