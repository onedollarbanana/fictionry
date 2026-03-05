"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { JSONContent } from "@tiptap/react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { TiptapEditor, countWordsFromJSON } from "@/components/editor/tiptap-editor";
import { Clock, Lock } from "lucide-react";
import { ScheduleWarning } from "@/components/ScheduleWarning";
import { showToast } from "@/components/ui/toast";
import { PLATFORM_CONFIG, type TierName } from "@/lib/platform-config";

// Debounce utility
function debounce<T extends (...args: Parameters<T>) => void>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
}

// Get browser timezone
function getBrowserTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return "";
  }
}

// Get minimum schedule time (5 minutes from now) as datetime-local value
function getMinScheduleTime(): string {
  const min = new Date(Date.now() + 5 * 60 * 1000);
  return min.toISOString().slice(0, 16);
}

interface Chapter {
  id: string;
  title: string;
  content: JSONContent;
  word_count: number;
  chapter_number: number;
  is_published: boolean;
  author_note_before: string | null;
  author_note_after: string | null;
  scheduled_for: string | null;
  story_id: string;
  min_tier_name: string | null;
}

export default function EditChapterPage() {
  const params = useParams();
  const storyId = params.id as string;
  const chapterId = params.chapterId as string;
  
  const [storyTitle, setStoryTitle] = useState("");
  const [chapter, setChapter] = useState<Chapter | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState<JSONContent | null>(null);
  const [authorNoteBefore, setAuthorNoteBefore] = useState("");
  const [authorNoteAfter, setAuthorNoteAfter] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [scheduledFor, setScheduledFor] = useState<string>("");
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "unsaved">("saved");
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [browserTimezone] = useState(getBrowserTimezone);
  const [minTierName, setMinTierName] = useState<string | null>(null);
  const router = useRouter();

  // Word count from Tiptap JSON
  const wordCount = content ? countWordsFromJSON(content) : 0;

  // Load chapter data
  useEffect(() => {
    async function loadData() {
      const supabase = createClient();
      
      // Load story title and author_id
      const { data: storyData } = await supabase
        .from("stories")
        .select("title, author_id")
        .eq("id", storyId)
        .single();
      
      if (storyData) {
        setStoryTitle(storyData.title);

      }

      // Load chapter
      const { data: chapterData, error: chapterError } = await supabase
        .from("chapters")
        .select("*")
        .eq("id", chapterId)
        .single();

      if (chapterError) {
        setError(chapterError.message);
        setLoading(false);
        return;
      }

      if (chapterData) {
        setChapter(chapterData);
        setTitle(chapterData.title);
        setContent(chapterData.content as JSONContent);
        setAuthorNoteBefore(chapterData.author_note_before || "");
        setAuthorNoteAfter(chapterData.author_note_after || "");
        setMinTierName(chapterData.min_tier_name || null);
        if (chapterData.scheduled_for) {
          // Convert UTC to local time for the datetime-local input
          const d = new Date(chapterData.scheduled_for);
          const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
          setScheduledFor(local.toISOString().slice(0, 16));
        }
      }
      
      setLoading(false);
    }
    
    if (storyId && chapterId) {
      loadData();
    }
  }, [storyId, chapterId]);

  // Auto-save with debounce
  const autoSave = useMemo(
    () =>
      debounce(async (saveContent: JSONContent, saveTitle: string) => {
        if (!chapterId) return;
        
        setSaveStatus("saving");
        const supabase = createClient();
        
        const { error: saveError } = await supabase
          .from("chapters")
          .update({
            title: saveTitle,
            content: saveContent,
            word_count: countWordsFromJSON(saveContent),
            updated_at: new Date().toISOString(),
          })
          .eq("id", chapterId);

        if (!saveError) {
          setSaveStatus("saved");
          setLastSaved(new Date());
        }
      }, 3000),
    [chapterId]
  );

  const handleContentChange = useCallback((newContent: JSONContent) => {
    setContent(newContent);
    setSaveStatus("unsaved");
    autoSave(newContent, title);
  }, [autoSave, title]);

  const handleTitleChange = useCallback((newTitle: string) => {
    setTitle(newTitle);
    setSaveStatus("unsaved");
    if (content) {
      autoSave(content, newTitle);
    }
  }, [autoSave, content]);

  const handleSubmit = async (e: React.FormEvent, publish: boolean, scheduleDate?: string) => {
    e.preventDefault();
    setError(null);
    setSaving(true);

    const supabase = createClient();

    // Validate content
    if (!content || countWordsFromJSON(content) === 0) {
      setError("Chapter content cannot be empty");
      setSaving(false);
      return;
    }

    // Validate schedule is at least 5 minutes in the future
    if (scheduleDate) {
      const scheduledTime = new Date(scheduleDate).getTime();
      const minTime = Date.now() + 5 * 60 * 1000;
      if (scheduledTime < minTime) {
        setError("Scheduled time must be at least 5 minutes in the future");
        setSaving(false);
        return;
      }
    }

    const wasPublished = chapter?.is_published;
    const isNowPublished = publish || wasPublished;

    const { error: updateError } = await supabase
      .from("chapters")
      .update({
        title,
        content,
        word_count: wordCount,
        is_published: isNowPublished,
        published_at: isNowPublished && !wasPublished ? new Date().toISOString() : undefined,
        author_note_before: authorNoteBefore || null,
        author_note_after: authorNoteAfter || null,
        scheduled_for: publish ? null : (scheduleDate ? new Date(scheduleDate).toISOString() : null),
        updated_at: new Date().toISOString(),
      })
      .eq("id", chapterId);

    if (updateError) {
      setError(updateError.message);
      setSaving(false);
      return;
    }

    // Update story stats
    const { data: allChapters } = await supabase
      .from("chapters")
      .select("word_count")
      .eq("story_id", storyId)
      .eq("is_published", true);

    const totalWords = (allChapters || []).reduce((sum, ch) => sum + (ch.word_count || 0), 0);
    const publishedCount = (allChapters || []).length;

    await supabase
      .from("stories")
      .update({
        chapter_count: publishedCount,
        total_word_count: totalWords,
        updated_at: new Date().toISOString(),
      })
      .eq("id", storyId);

    // Trigger follower notifications on first publish (non-blocking)
    if (!wasPublished && publish && chapter) {
      void fetch("/api/push/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        keepalive: true,
        body: JSON.stringify({
          storyId,
          storyTitle,
          chapterTitle: title,
          chapterNumber: chapter.chapter_number,
          chapterId,
        }),
      });
    }

    router.push(`/author/stories/${storyId}`);
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <p className="text-muted-foreground">Loading chapter...</p>
      </div>
    );
  }

  if (error && !chapter) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-bold mb-4">Error</h1>
        <p className="text-muted-foreground mb-4">{error}</p>
        <Link href={`/author/stories/${storyId}`}>
          <Button>Back to Story</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      {/* Breadcrumb */}
      <div className="mb-4 flex justify-between items-center">
        <Link href={`/author/stories/${storyId}`} className="text-muted-foreground hover:text-foreground">
          ← Back to {storyTitle || "Story"}
        </Link>
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span>{wordCount.toLocaleString()} words</span>
          <span>
            {saveStatus === "saving" 
              ? "Saving..." 
              : saveStatus === "unsaved" 
                ? "Unsaved changes"
                : lastSaved 
                  ? `Saved ${lastSaved.toLocaleTimeString()}`
                  : "Saved"
            }
          </span>
        </div>
      </div>

      <div className="flex items-center gap-4 mb-8">
        <h1 className="text-3xl font-bold">Edit Chapter {chapter?.chapter_number}</h1>
        {chapter?.is_published && (
          <span className="px-2 py-1 text-xs rounded bg-green-500/20 text-green-400">
            Published
          </span>
        )}
        {!chapter?.is_published && !chapter?.scheduled_for && (
          <span className="px-2 py-1 text-xs rounded bg-yellow-500/20 text-yellow-400">
            Draft
          </span>
        )}
        {chapter?.scheduled_for && !chapter?.is_published && (
          <span className="px-2 py-1 text-xs rounded bg-blue-500/20 text-blue-400 flex items-center gap-1">
            <Clock className="w-3 h-3" />
            Scheduled: {new Date(chapter.scheduled_for).toLocaleDateString()}
          </span>
        )}
      </div>

      <form className="space-y-6">
        {error && (
          <div className="p-3 text-sm text-red-500 bg-red-50 dark:bg-red-950 rounded">
            {error}
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="title">Chapter Title *</Label>
          <Input
            id="title"
            value={title}
            onChange={(e) => handleTitleChange(e.target.value)}
            placeholder="Chapter title"
            required
            maxLength={200}
          />
        </div>

        {/* Author's Note (Before) */}
        <div className="space-y-2">
          <Label htmlFor="authorNoteBefore">Author&apos;s Note (Before Chapter)</Label>
          <Textarea
            id="authorNoteBefore"
            value={authorNoteBefore}
            onChange={(e) => setAuthorNoteBefore(e.target.value)}
            placeholder="Add a note that appears before the chapter..."
            rows={2}
            className="text-sm"
          />
        </div>

        {/* Tiptap Editor */}
        <div className="space-y-2">
          <Label>Content *</Label>
          <TiptapEditor
            content={content}
            onChange={handleContentChange}
            placeholder="Start writing your chapter..."
          />
        </div>

        {/* Author's Note (After) */}
        <div className="space-y-2">
          <Label htmlFor="authorNoteAfter">Author&apos;s Note (After Chapter)</Label>
          <Textarea
            id="authorNoteAfter"
            value={authorNoteAfter}
            onChange={(e) => setAuthorNoteAfter(e.target.value)}
            placeholder="Add a note that appears after the chapter..."
            rows={2}
            className="text-sm"
          />
        </div>

        {/* Tier Gating Info */}
        {minTierName && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-orange-50 dark:bg-orange-950 border border-orange-200 dark:border-orange-800">
            <Lock className="w-4 h-4 text-orange-600 dark:text-orange-400 flex-shrink-0" />
            <p className="text-sm text-orange-800 dark:text-orange-200">
              This chapter requires <span className="font-medium">{PLATFORM_CONFIG.TIER_NAMES[minTierName as TierName] || minTierName}</span> tier or higher.
              Gating is managed automatically from your{' '}
              <a href={`/author/stories/${storyId}`} className="underline hover:no-underline">story overview</a>.
            </p>
          </div>
        )}

        {/* Schedule Publishing */}
        {!chapter?.is_published && (
          <div className="space-y-2">
            <Label>Schedule Publishing (Optional)</Label>
            <div className="flex items-center gap-3">
              <input
                type="datetime-local"
                value={scheduledFor}
                onChange={(e) => setScheduledFor(e.target.value)}
                min={getMinScheduleTime()}
                className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
              {browserTimezone && (
                <span className="text-xs text-muted-foreground">
                  {browserTimezone}
                </span>
              )}
              {scheduledFor && (
                <button
                  type="button"
                  onClick={() => setScheduledFor("")}
                  className="text-sm text-muted-foreground hover:text-foreground"
                >
                  Clear
                </button>
              )}
            </div>
            {scheduledFor && (
              <p className="text-sm text-muted-foreground">
                This chapter will be automatically published on {new Date(scheduledFor).toLocaleString()}
              </p>
            )}
            <ScheduleWarning scheduledFor={scheduledFor} />
            {chapter?.scheduled_for && !chapter?.is_published && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={async () => {
                  const supabase = createClient();
                  await supabase
                    .from("chapters")
                    .update({ scheduled_for: null })
                    .eq("id", chapterId);
                  setScheduledFor("");
                  setChapter(prev => prev ? { ...prev, scheduled_for: null } : null);
                  showToast("Schedule cancelled", "success");
                }}
              >
                Cancel Schedule
              </Button>
            )}
          </div>
        )}

        <div className="flex flex-wrap gap-3 pt-4">
          <Button
            type="button"
            variant="outline"
            disabled={saving || !title.trim()}
            onClick={(e) => handleSubmit(e, false)}
          >
            {saving ? "Saving..." : "Save"}
          </Button>
          {!chapter?.is_published && (
            <Button
              type="button"
              disabled={saving || !title.trim()}
              onClick={(e) => handleSubmit(e, true)}
            >
              {saving ? "Publishing..." : "Publish"}
            </Button>
          )}
          {scheduledFor && !chapter?.is_published && (
            <Button
              type="button"
              variant="outline"
              disabled={saving || !title.trim()}
              onClick={(e) => handleSubmit(e, false, scheduledFor)}
              className="gap-1"
            >
              <Clock className="w-4 h-4" />
              {saving ? "Scheduling..." : "Schedule"}
            </Button>
          )}
        </div>
      </form>
    </div>
  );
}
