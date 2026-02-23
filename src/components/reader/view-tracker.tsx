"use client";

import { useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";

interface ViewTrackerProps {
  chapterId: string;
  storyId: string;
  /** @deprecated No longer used - read marking moved to scroll-based tracking */
  hasAccess?: boolean;
}

export function ViewTracker({ chapterId, storyId }: ViewTrackerProps) {
  const tracked = useRef(false);

  useEffect(() => {
    // Only track once per component mount
    if (tracked.current) return;
    tracked.current = true;

    const trackView = async () => {
      const supabase = createClient();

      // Get current user (if logged in)
      const { data: { user } } = await supabase.auth.getUser();

      // Generate a session ID for anonymous users
      let sessionId = localStorage.getItem("fictionry_session");
      if (!sessionId) {
        sessionId = crypto.randomUUID();
        localStorage.setItem("fictionry_session", sessionId);
      }

      // Track the view (unique per session/user)
      const { error: viewError } = await supabase.from("chapter_views").upsert({
        chapter_id: chapterId,
        story_id: storyId,
        user_id: user?.id || null,
        session_id: user ? null : sessionId,
      }, { onConflict: user ? 'chapter_id,user_id' : 'chapter_id,session_id' });

      if (viewError) {
        console.error("Error tracking view:", viewError);
      }

      // NOTE: Chapter read marking is now handled by useScrollPosition
      // when the user scrolls past 90% of the chapter content.
      // This prevents chapters from being marked "read" on brief visits.
    };

    // Small delay to avoid counting quick bounces
    const timer = setTimeout(trackView, 3000);
    return () => clearTimeout(timer);
  }, [chapterId, storyId]);

  return null;
}
