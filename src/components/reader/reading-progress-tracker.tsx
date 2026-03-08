"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useReadingSettings } from "@/lib/hooks/useReadingSettings";

interface ReadingProgressTrackerProps {
  storyId: string;
  chapterId: string;
  chapterNumber: number;
  userId: string | null;
}

export function ReadingProgressTracker({
  storyId,
  chapterId,
  chapterNumber,
  userId,
}: ReadingProgressTrackerProps) {
  const { settings, isLoaded } = useReadingSettings();

  useEffect(() => {
    if (!userId) return;
    if (!isLoaded) return; // Wait for reading mode to be known from localStorage

    // In continuous scroll mode, ContinuousScrollReader is responsible for updating
    // reading_progress (chapter pointer + scroll_position reset). Running here too
    // would race with that update and potentially regress the chapter number or
    // overwrite a valid scroll_position with 0.
    if (settings.readingMode === "continuous") return;

    const updateProgress = async () => {
      const supabase = createClient();

      // Always update reading_progress to reflect current chapter being read.
      // This ensures "Continue Reading" points to where the user actually is,
      // even if they go back to re-read an earlier chapter.
      // Scroll position starts at 0 for the new chapter — useScrollPosition
      // will update it as the user scrolls.
      await supabase
        .from("reading_progress")
        .upsert({
          user_id: userId,
          story_id: storyId,
          chapter_id: chapterId,
          chapter_number: chapterNumber,
          scroll_position: 0, // Reset scroll for new chapter navigation
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id,story_id',
        });
    };

    // Small delay to avoid updating on quick page bounces
    const timer = setTimeout(updateProgress, 2000);
    return () => clearTimeout(timer);
  }, [storyId, chapterId, chapterNumber, userId, settings.readingMode, isLoaded]);

  // This component renders nothing - it's just for tracking
  return null;
}
