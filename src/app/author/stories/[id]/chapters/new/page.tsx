"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { JSONContent } from "@tiptap/react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { TiptapEditor, countWordsFromJSON } from "@/components/editor/tiptap-editor";
import { Clock } from "lucide-react";
import { ScheduleWarning } from "@/components/ScheduleWarning";

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

// Get browser timezone abbreviation
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

export default function NewChapterPage() {
  const params = useParams();
  const storyId = params.id as string;
  const [storyTitle, setStoryTitle] = useState("");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState<JSONContent | null>(null);
  const [authorNoteBefore, setAuthorNoteBefore] = useState("");
  const [authorNoteAfter, setAuthorNoteAfter] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "unsaved">("saved");
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [draftRecovered, setDraftRecovered] = useState(false);
  const [scheduledFor, setScheduledFor] = useState<string>("");
  const [browserTimezone] = useState(getBrowserTimezone);
  const router = useRouter();

  const DRAFT_KEY = `fictionry-draft-${storyId}`;

  // Auto-save draft to localStorage (debounced)
  const autoSaveDraft = useMemo(
    () => debounce((data: { title: string; content: JSONContent | null; authorNoteBefore: string; authorNoteAfter: string; scheduledFor?: string }) => {
      try {
        localStorage.setItem(DRAFT_KEY, JSON.stringify({
          ...data,
          savedAt: new Date().toISOString(),
        }));
        setSaveStatus("saved");
        setLastSaved(new Date());
      } catch (e) {
        // localStorage full or unavailable - silently ignore
      }
    }, 2000),
    [DRAFT_KEY]
  );

  // Word count from Tiptap JSON
  const wordCount = content ? countWordsFromJSON(content) : 0;

  useEffect(() => {
    async function loadStory() {
      const supabase = createClient();
      const { data } = await supabase
        .from("stories")
        .select("title, default_author_note_before, default_author_note_after")
        .eq("id", storyId)
        .single();
      
      if (data) {
        setStoryTitle(data.title);

        // Check for saved draft in localStorage
        const savedDraft = localStorage.getItem(DRAFT_KEY);
        if (savedDraft) {
          try {
            const draft = JSON.parse(savedDraft);
            if (draft.title) setTitle(draft.title);
            if (draft.content) setContent(draft.content);
            if (draft.authorNoteBefore) setAuthorNoteBefore(draft.authorNoteBefore);
            if (draft.authorNoteAfter) setAuthorNoteAfter(draft.authorNoteAfter);
            if (draft.scheduledFor) setScheduledFor(draft.scheduledFor);
            if (draft.savedAt) setLastSaved(new Date(draft.savedAt));
            setSaveStatus("saved");
            setDraftRecovered(true);
          } catch (e) {
            // Corrupted draft - ignore
          }
        } else {
          // Only apply defaults if there's NO saved draft
          if (data.default_author_note_before) {
            setAuthorNoteBefore(data.default_author_note_before);
          }
          if (data.default_author_note_after) {
            setAuthorNoteAfter(data.default_author_note_after);
          }
        }
      }
    }
    
    if (storyId) {
      loadStory();
    }
  }, [storyId, DRAFT_KEY]);

  const handleContentChange = useCallback((newContent: JSONContent) => {
    setContent(newContent);
    setSaveStatus("unsaved");
    autoSaveDraft({ title, content: newContent, authorNoteBefore, authorNoteAfter, scheduledFor });
  }, [autoSaveDraft, title, authorNoteBefore, authorNoteAfter, scheduledFor]);

  const handleSubmit = async (e: React.FormEvent, publish: boolean, scheduleDate?: string) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setError("You must be logged in");
      setLoading(false);
      return;
    }

    // Validate content
    if (!content || countWordsFromJSON(content) === 0) {
      setError("Chapter content cannot be empty");
      setLoading(false);
      return;
    }

    // Validate schedule is at least 5 minutes in the future
    if (scheduleDate) {
      const scheduledTime = new Date(scheduleDate).getTime();
      const minTime = Date.now() + 5 * 60 * 1000;
      if (scheduledTime < minTime) {
        setError("Scheduled time must be at least 5 minutes in the future");
        setLoading(false);
        return;
      }
    }

    // Get next chapter number
    const { data: chapters } = await supabase
      .from("chapters")
      .select("chapter_number")
      .eq("story_id", storyId)
      .order("chapter_number", { ascending: false })
      .limit(1);

    const nextChapterNumber = chapters && chapters.length > 0 
      ? chapters[0].chapter_number + 1 
      : 1;

    const { data: newChapter, error: insertError } = await supabase
      .from("chapters")
      .insert({
        story_id: storyId,
        title,
        content: content, // Tiptap JSON
        word_count: wordCount,
        chapter_number: nextChapterNumber,
        is_published: publish,
        published_at: publish ? new Date().toISOString() : null,
        author_note_before: authorNoteBefore || null,
        author_note_after: authorNoteAfter || null,
        scheduled_for: scheduleDate ? new Date(scheduleDate).toISOString() : null,
      })
      .select("id")
      .single();

    if (insertError) {
      setError(insertError.message);
      setLoading(false);
      return;
    }

    // Update story chapter count and word count
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

    // Log writing activity
    if (wordCount > 0) {
      await supabase.rpc('log_writing_activity', {
        p_user_id: user.id,
        p_words: wordCount,
      });
    }

    // Trigger follower notifications on publish (non-blocking, keepalive survives navigation)
    if (publish && newChapter) {
      void fetch("/api/push/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        keepalive: true,
        body: JSON.stringify({
          storyId,
          storyTitle,
          chapterTitle: title,
          chapterNumber: nextChapterNumber,
          chapterId: newChapter.id,
        }),
      });
    }

    localStorage.removeItem(DRAFT_KEY);
    router.push(`/author/stories/${storyId}`);
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      {/* Breadcrumb */}
      <div className="mb-4 flex justify-between items-center">
        <Link href={`/author/stories/${storyId}`} className="text-muted-foreground hover:text-foreground">
          ← Back to {storyTitle || "Story"}
        </Link>
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span>{wordCount.toLocaleString()} words</span>
          {lastSaved && (
            <span>
              {saveStatus === "saving" ? "Saving..." : `Saved ${lastSaved.toLocaleTimeString()}`}
            </span>
          )}
        </div>
      </div>

      <h1 className="text-3xl font-bold mb-8">New Chapter</h1>

      {draftRecovered && (
        <div className="flex items-center justify-between p-3 text-sm bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded mb-4">
          <span>📝 Unsaved draft recovered</span>
          <button
            type="button"
            onClick={() => {
              localStorage.removeItem(DRAFT_KEY);
              setDraftRecovered(false);
              setTitle("");
              setContent(null);
              setAuthorNoteBefore("");
              setAuthorNoteAfter("");
            }}
            className="text-xs underline hover:no-underline"
          >
            Discard draft
          </button>
        </div>
      )}

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
            onChange={(e) => {
              setTitle(e.target.value);
              setSaveStatus("unsaved");
              autoSaveDraft({ title: e.target.value, content, authorNoteBefore, authorNoteAfter });
            }}
            placeholder="Chapter 1: The Beginning"
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
            onChange={(e) => {
              setAuthorNoteBefore(e.target.value);
              setSaveStatus("unsaved");
              autoSaveDraft({ title, content, authorNoteBefore: e.target.value, authorNoteAfter });
            }}
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
            onChange={(e) => {
              setAuthorNoteAfter(e.target.value);
              setSaveStatus("unsaved");
              autoSaveDraft({ title, content, authorNoteBefore, authorNoteAfter: e.target.value, scheduledFor });
            }}
            placeholder="Add a note that appears after the chapter..."
            rows={2}
            className="text-sm"
          />
        </div>

        {/* Schedule Publishing */}
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
        </div>

        <div className="flex gap-4 pt-4">
          <Button
            type="button"
            variant="outline"
            disabled={loading || !title.trim()}
            onClick={(e) => handleSubmit(e, false)}
          >
            {loading ? "Saving..." : "Save Draft"}
          </Button>
          <Button
            type="button"
            disabled={loading || !title.trim()}
            onClick={(e) => handleSubmit(e, true)}
          >
            {loading ? "Publishing..." : "Publish"}
          </Button>
          {scheduledFor && (
            <Button
              type="button"
              variant="outline"
              disabled={loading || !title.trim()}
              onClick={(e) => handleSubmit(e, false, scheduledFor)}
              className="gap-1"
            >
              <Clock className="w-4 h-4" />
              {loading ? "Scheduling..." : "Schedule"}
            </Button>
          )}
        </div>
      </form>
    </div>
  );
}
