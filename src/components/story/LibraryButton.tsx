"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { checkRateLimit } from "@/lib/rate-limit";
import { Button } from "@/components/ui/button";
import { 
  BookPlus, ChevronDown, Check, BookOpen, CheckCircle, XCircle, 
  Clock, Pause, Bell, BellOff, Trash2 
} from "lucide-react";

type FollowStatus = "reading" | "plan_to_read" | "on_hold" | "finished" | "dropped";

interface LibraryButtonProps {
  storyId: string;
  storySlug?: string;
  storyShortId?: string;
  initialFollowerCount?: number;
}

const STATUS_OPTIONS: { value: FollowStatus; label: string; icon: React.ReactNode; color: string; defaultNotify: boolean }[] = [
  { value: "reading", label: "Reading", icon: <BookOpen className="h-4 w-4" />, color: "text-green-500", defaultNotify: true },
  { value: "plan_to_read", label: "Plan to Read", icon: <Clock className="h-4 w-4" />, color: "text-blue-500", defaultNotify: false },
  { value: "on_hold", label: "On Hold", icon: <Pause className="h-4 w-4" />, color: "text-amber-500", defaultNotify: true },
  { value: "finished", label: "Finished", icon: <CheckCircle className="h-4 w-4" />, color: "text-purple-500", defaultNotify: false },
  { value: "dropped", label: "Dropped", icon: <XCircle className="h-4 w-4" />, color: "text-gray-500", defaultNotify: false },
];

export function LibraryButton({ storyId, storySlug, storyShortId, initialFollowerCount = 0 }: LibraryButtonProps) {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [inLibrary, setInLibrary] = useState(false);
  const [status, setStatus] = useState<FollowStatus>("reading");
  const [notifyNewChapters, setNotifyNewChapters] = useState(true);
  const [followerCount, setFollowerCount] = useState(initialFollowerCount);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  // Load current library state on mount
  useEffect(() => {
    let isMounted = true;
    
    async function loadLibraryState() {
      try {
        const supabase = createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        
        if (authError) console.error("Auth error:", authError);
        if (!isMounted) return;
        
        setUserId(user?.id ?? null);
        
        if (!user) {
          setLoading(false);
          return;
        }

        const { data: follow, error: followError } = await supabase
          .from("follows")
          .select("id, status, notify_new_chapters")
          .eq("user_id", user.id)
          .eq("story_id", storyId)
          .maybeSingle();

        if (followError) console.error("Library query error:", followError);
        if (!isMounted) return;

        if (follow) {
          setInLibrary(true);
          setStatus(follow.status as FollowStatus);
          setNotifyNewChapters(follow.notify_new_chapters);
        }
      } catch (err) {
        console.error("LibraryButton loadState error:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadLibraryState();
    return () => { isMounted = false; };
  }, [storyId]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as HTMLElement;
      if (!target.closest("[data-library-dropdown]")) {
        setShowDropdown(false);
      }
    }
    
    if (showDropdown) {
      document.addEventListener("click", handleClickOutside);
      return () => document.removeEventListener("click", handleClickOutside);
    }
  }, [showDropdown]);

  async function handleAddToLibrary(initialStatus: FollowStatus = "plan_to_read") {
    if (!userId) {
      router.push(`/login?redirect=/story/${storySlug && storyShortId ? `${storySlug}-${storyShortId}` : storyId}`);
      return;
    }

    setActionLoading(true);
    const supabase = createClient();
    const defaultNotify = STATUS_OPTIONS.find(o => o.value === initialStatus)?.defaultNotify ?? false;

    try {
      const rateCheck = await checkRateLimit(supabase, userId, 'follow');
      if (!rateCheck.allowed) {
        setActionLoading(false);
        return;
      }

      const { error } = await supabase
        .from("follows")
        .insert({
          user_id: userId,
          story_id: storyId,
          status: initialStatus,
          notify_new_chapters: defaultNotify,
        });

      if (error) throw error;

      setInLibrary(true);
      setStatus(initialStatus);
      setNotifyNewChapters(defaultNotify);
      setFollowerCount((prev) => prev + 1);
      setShowDropdown(false);
    } catch (err) {
      console.error("Failed to add to library:", err);
    } finally {
      setActionLoading(false);
    }
  }

  async function handleRemoveFromLibrary() {
    if (!userId) return;

    setActionLoading(true);
    const supabase = createClient();

    try {
      const { error } = await supabase
        .from("follows")
        .delete()
        .eq("user_id", userId)
        .eq("story_id", storyId);

      if (error) throw error;

      setInLibrary(false);
      setFollowerCount((prev) => Math.max(0, prev - 1));
      setShowDropdown(false);
    } catch (err) {
      console.error("Failed to remove from library:", err);
    } finally {
      setActionLoading(false);
    }
  }

  async function handleStatusChange(newStatus: FollowStatus) {
    if (!userId) return;

    setActionLoading(true);
    const supabase = createClient();
    
    // Smart default: update notification preference based on status
    const newNotify = STATUS_OPTIONS.find(o => o.value === newStatus)?.defaultNotify ?? false;

    try {
      const { error } = await supabase
        .from("follows")
        .update({ 
          status: newStatus, 
          notify_new_chapters: newNotify,
          updated_at: new Date().toISOString() 
        })
        .eq("user_id", userId)
        .eq("story_id", storyId);

      if (error) throw error;

      setStatus(newStatus);
      setNotifyNewChapters(newNotify);
      setShowDropdown(false);
    } catch (err) {
      console.error("Failed to update status:", err);
    } finally {
      setActionLoading(false);
    }
  }

  async function handleToggleNotifications() {
    if (!userId) return;

    const newValue = !notifyNewChapters;
    setNotifyNewChapters(newValue); // Optimistic update
    
    const supabase = createClient();
    
    try {
      const { error } = await supabase
        .from("follows")
        .update({ notify_new_chapters: newValue })
        .eq("user_id", userId)
        .eq("story_id", storyId);

      if (error) {
        setNotifyNewChapters(!newValue); // Revert on error
        throw error;
      }
    } catch (err) {
      console.error("Failed to toggle notifications:", err);
    }
  }

  if (loading) {
    return (
      <Button variant="outline" disabled>
        <BookPlus className="h-4 w-4 mr-2" />
        Loading...
      </Button>
    );
  }

  // Not in library - show Add to Library button with dropdown
  if (!inLibrary) {
    return (
      <div className="relative" data-library-dropdown>
        <div className="flex">
          <Button
            variant="outline"
            onClick={() => handleAddToLibrary("plan_to_read")}
            disabled={actionLoading}
            className="rounded-r-none border-r-0"
          >
            <BookPlus className="h-4 w-4 mr-2" />
            {actionLoading ? "Adding..." : "Add to Library"}
          </Button>
          <Button
            variant="outline"
            onClick={() => setShowDropdown(!showDropdown)}
            disabled={actionLoading}
            className="rounded-l-none px-2"
          >
            <ChevronDown className="h-4 w-4" />
          </Button>
        </div>

        {showDropdown && (
          <div className="absolute top-full mt-1 right-0 z-50 min-w-[180px] bg-white dark:bg-zinc-900 border border-border rounded-md shadow-lg py-1">
            <div className="px-3 py-2 text-xs font-medium text-muted-foreground">
              Add as...
            </div>
            {STATUS_OPTIONS.map((option) => (
              <button
                key={option.value}
                onClick={() => handleAddToLibrary(option.value)}
                className="w-full px-3 py-2 text-left text-sm flex items-center gap-2 hover:bg-muted transition-colors"
              >
                <span className={option.color}>{option.icon}</span>
                <span>{option.label}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  // In library - show status dropdown with bell toggle
  const currentStatus = STATUS_OPTIONS.find((opt) => opt.value === status) || STATUS_OPTIONS[0];

  return (
    <div className="relative" data-library-dropdown>
      <Button
        variant="default"
        onClick={() => setShowDropdown(!showDropdown)}
        disabled={actionLoading}
        className="gap-2"
      >
        <span className={currentStatus.color}>{currentStatus.icon}</span>
        {currentStatus.label}
        <ChevronDown className="h-4 w-4" />
      </Button>

      {showDropdown && (
        <div className="absolute top-full mt-1 right-0 z-50 min-w-[200px] bg-white dark:bg-zinc-900 border border-border rounded-md shadow-lg py-1">
          {/* Status options */}
          {STATUS_OPTIONS.map((option) => (
            <button
              key={option.value}
              onClick={() => handleStatusChange(option.value)}
              className="w-full px-3 py-2 text-left text-sm flex items-center gap-2 hover:bg-muted transition-colors"
            >
              <span className={option.color}>{option.icon}</span>
              <span className="flex-1">{option.label}</span>
              {status === option.value && (
                <Check className="h-4 w-4 text-primary" />
              )}
            </button>
          ))}
          
          <div className="border-t my-1" />
          
          {/* Notification toggle */}
          <button
            onClick={handleToggleNotifications}
            className="w-full px-3 py-2 text-left text-sm flex items-center gap-2 hover:bg-muted transition-colors"
          >
            {notifyNewChapters ? (
              <Bell className="h-4 w-4 text-primary" />
            ) : (
              <BellOff className="h-4 w-4 text-muted-foreground" />
            )}
            <span className="flex-1">Chapter updates</span>
            {notifyNewChapters && <Check className="h-4 w-4 text-primary" />}
          </button>
          
          <div className="border-t my-1" />
          
          {/* Remove from library */}
          <button
            onClick={handleRemoveFromLibrary}
            className="w-full px-3 py-2 text-left text-sm text-destructive flex items-center gap-2 hover:bg-destructive/10 transition-colors"
          >
            <Trash2 className="h-4 w-4" />
            Remove from Library
          </button>
        </div>
      )}
    </div>
  );
}

// Keep backwards compatibility - FollowButton is now LibraryButton
export { LibraryButton as FollowButton };
