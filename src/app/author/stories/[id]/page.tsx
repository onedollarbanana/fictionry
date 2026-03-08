"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { CreateAnnouncementForm } from "@/components/announcements";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { GripVertical, Check, Trash2, Eye, EyeOff, X, Lock } from "lucide-react";
import { showToast } from "@/components/ui/toast";
import { ExportEpubButton } from "@/components/author/export-epub-button"
import { ChapterGatingConfig } from "@/components/author/chapter-gating-config"

interface Story {
  id: string;
  title: string;
  blurb: string | null;
  status: string;
  primary_genre: string | null;
  tags: string[];
  chapter_count: number | null;
  word_count: number | null;
  total_views: number | null;
  follower_count: number | null;
  created_at: string;
  updated_at: string;
}

interface Chapter {
  id: string;
  title: string;
  chapter_number: number;
  word_count: number | null;
  is_published: boolean;
  published_at: string | null;
  scheduled_for: string | null;
  created_at: string;
  min_tier_name: string | null;
}

export default function StoryOverviewPage() {
  const params = useParams();
  const storyId = params.id as string;
  const [story, setStory] = useState<Story | null>(null);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedChapters, setSelectedChapters] = useState<Set<string>>(new Set());
  const [bulkActionLoading, setBulkActionLoading] = useState(false);
  const [reorderMode, setReorderMode] = useState(false);

  const loadData = useCallback(async () => {
    const supabase = createClient();
    
    // Load story
    const { data: storyData, error: storyError } = await supabase
      .from("stories")
      .select("*")
      .eq("id", storyId)
      .single();

    if (storyError) {
      console.error("Error loading story:", storyError);
      setError(storyError.message);
      setLoading(false);
      return;
    }

    setStory(storyData);

    // Load chapters
    const { data: chaptersData, error: chaptersError } = await supabase
      .from("chapters")
      .select("id, title, chapter_number, word_count, is_published, published_at, scheduled_for, created_at, min_tier_name")
      .eq("story_id", storyId)
      .order("chapter_number", { ascending: true });

    if (chaptersError) {
      console.error("Error loading chapters:", chaptersError);
    } else {
      setChapters(chaptersData || []);
    }

    setLoading(false);
  }, [storyId]);

  useEffect(() => {
    if (storyId) {
      loadData();
    }
  }, [storyId, loadData]);

  // Selection handlers
  const toggleChapterSelection = (chapterId: string) => {
    const newSelected = new Set(selectedChapters);
    if (newSelected.has(chapterId)) {
      newSelected.delete(chapterId);
    } else {
      newSelected.add(chapterId);
    }
    setSelectedChapters(newSelected);
  };

  const selectAllChapters = () => {
    if (selectedChapters.size === chapters.length) {
      setSelectedChapters(new Set());
    } else {
      setSelectedChapters(new Set(chapters.map(c => c.id)));
    }
  };

  const clearSelection = () => {
    setSelectedChapters(new Set());
  };

  // Bulk actions
  const bulkPublish = async () => {
    if (selectedChapters.size === 0) return;
    if (selectedChapters.size > 5 && !confirm(`Publish ${selectedChapters.size} chapters? They will all go live immediately.`)) return;
    setBulkActionLoading(true);
    const supabase = createClient();

    const { error } = await supabase
      .from("chapters")
      .update({ is_published: true, published_at: new Date().toISOString() })
      .in("id", Array.from(selectedChapters));

    if (error) {
      showToast("Failed to publish chapters", "error");
    } else {
      showToast(`Published ${selectedChapters.size} chapter(s)`, "success");
      await loadData();
      clearSelection();
    }
    setBulkActionLoading(false);
  };

  const bulkUnpublish = async () => {
    if (selectedChapters.size === 0) return;
    setBulkActionLoading(true);
    const supabase = createClient();
    
    const { error } = await supabase
      .from("chapters")
      .update({ is_published: false, published_at: null })
      .in("id", Array.from(selectedChapters));

    if (error) {
      showToast("Failed to unpublish chapters", "error");
    } else {
      showToast(`Unpublished ${selectedChapters.size} chapter(s)`, "success");
      await loadData();
      clearSelection();
    }
    setBulkActionLoading(false);
  };

  const bulkDelete = async () => {
    if (selectedChapters.size === 0) return;
    if (!confirm(`Are you sure you want to delete ${selectedChapters.size} chapter(s)? This cannot be undone.`)) {
      return;
    }
    setBulkActionLoading(true);
    const supabase = createClient();

    const { data: { user } } = await supabase.auth.getUser();

    // Snapshot the chapters being deleted for the audit log
    const toDelete = chapters.filter(c => selectedChapters.has(c.id));

    const { error } = await supabase
      .from("chapters")
      .delete()
      .in("id", Array.from(selectedChapters));

    if (error) {
      showToast("Failed to delete chapters", "error");
    } else {
      // Write audit log entries (non-blocking)
      if (user) {
        void supabase.from("chapter_deletion_log").insert(
          toDelete.map(c => ({
            story_id: storyId,
            chapter_id: c.id,
            chapter_title: c.title,
            chapter_number: c.chapter_number,
            word_count: c.word_count,
            was_published: c.is_published,
            deleted_by: user.id,
          }))
        );
      }
      showToast(`Deleted ${selectedChapters.size} chapter(s)`, "success");
      await loadData();
      clearSelection();
    }
    setBulkActionLoading(false);
  };

  // Drag and drop reordering
  const handleDragEnd = async (result: DropResult) => {
    if (!result.destination) return;
    
    const sourceIndex = result.source.index;
    const destIndex = result.destination.index;
    
    if (sourceIndex === destIndex) return;

    // Reorder locally first for instant feedback
    const reorderedChapters = Array.from(chapters);
    const [movedChapter] = reorderedChapters.splice(sourceIndex, 1);
    reorderedChapters.splice(destIndex, 0, movedChapter);
    
    // Update chapter numbers
    const updatedChapters = reorderedChapters.map((chapter, index) => ({
      ...chapter,
      chapter_number: index + 1
    }));
    
    setChapters(updatedChapters);

    // Update all chapter numbers in parallel
    const supabase = createClient();
    await Promise.all(
      updatedChapters.map(chapter =>
        supabase
          .from("chapters")
          .update({ chapter_number: chapter.chapter_number })
          .eq("id", chapter.id)
      )
    );

    showToast("Chapter order updated", "success");
  };

  const getTierLabel = (tierName: string) => {
    const labels: Record<string, string> = {
      supporter: 'Supporter',
      enthusiast: 'Enthusiast',
      patron: 'Patron',
    };
    return labels[tierName] || tierName;
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-bold mb-4">Error</h1>
        <p className="text-muted-foreground mb-4">{error}</p>
        <Link href="/author/dashboard">
          <Button>Back to Dashboard</Button>
        </Link>
      </div>
    );
  }

  if (!story) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-bold mb-4">Story not found</h1>
        <Link href="/author/dashboard">
          <Button>Back to Dashboard</Button>
        </Link>
      </div>
    );
  }

  const hasSelection = selectedChapters.size > 0;
  const publishedChapterCount = chapters.filter(c => c.is_published).length;

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Breadcrumb */}
      <div className="mb-4">
        <Link href="/author/dashboard" className="text-muted-foreground hover:text-foreground">
          ← Back to Dashboard
        </Link>
      </div>

      {/* Story Header */}
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">{story.title}</h1>
          <div className="flex gap-2 items-center flex-wrap">
            <span className="text-sm px-2 py-1 rounded bg-muted capitalize">
              {story.status}
            </span>
            {story.primary_genre && (
              <span className="text-sm text-muted-foreground capitalize">
                {story.primary_genre.replace(/-/g, ' ')}
              </span>
            )}
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Link href={`/author/stories/${storyId}/edit`}>
            <Button variant="outline">Edit Story</Button>
          </Link>
          <Link href={`/author/stories/${storyId}/chapters/new`}>
            <Button>+ New Chapter</Button>
          </Link>
          <Link href={`/author/stories/${storyId}/chapters/import`}>
            <Button variant="outline">Import Chapters</Button>
          </Link>
          <ExportEpubButton storyId={storyId} storyTitle={story.title} />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="p-4 rounded-lg border bg-card">
          <p className="text-sm text-muted-foreground">Chapters</p>
          <p className="text-2xl font-bold">{story.chapter_count ?? 0}</p>
        </div>
        <div className="p-4 rounded-lg border bg-card">
          <p className="text-sm text-muted-foreground">Words</p>
          <p className="text-2xl font-bold">{(story.word_count ?? 0).toLocaleString()}</p>
        </div>
        <div className="p-4 rounded-lg border bg-card">
          <p className="text-sm text-muted-foreground">Views</p>
          <p className="text-2xl font-bold">{(story.total_views ?? 0).toLocaleString()}</p>
        </div>
        <div className="p-4 rounded-lg border bg-card">
          <p className="text-sm text-muted-foreground">Followers</p>
          <p className="text-2xl font-bold">{story.follower_count ?? 0}</p>
        </div>
      </div>

      {/* Announcements */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold mb-3">Announcements</h2>
        <CreateAnnouncementForm storyId={storyId} storyTitle={story.title} />
        <p className="text-sm text-muted-foreground mt-2">
          Post updates without cluttering your chapter list. Followers see these on your story page.
        </p>
      </div>

      {/* Chapter Gating */}
      <div className="mb-8">
        <ChapterGatingConfig storyId={storyId} publishedChapterCount={publishedChapterCount} />
      </div>

      {/* Blurb */}
      {story.blurb && (
        <div className="mb-8 p-4 rounded-lg border bg-card overflow-hidden">
          <h2 className="font-semibold mb-2">Description</h2>
          <p className="text-muted-foreground whitespace-pre-wrap break-words">{story.blurb}</p>
        </div>
      )}

      {/* Chapters List */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Chapters</h2>
          {chapters.length > 0 && (
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setReorderMode(!reorderMode)}
              >
                {reorderMode ? "Done Reordering" : "Reorder"}
              </Button>
              {!reorderMode && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={selectAllChapters}
                >
                  {selectedChapters.size === chapters.length ? "Deselect All" : "Select All"}
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Bulk Action Toolbar */}
        {hasSelection && !reorderMode && (
          <div className="mb-4 p-3 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">
                {selectedChapters.size} chapter{selectedChapters.size !== 1 ? 's' : ''} selected
              </span>
              <button
                onClick={clearSelection}
                className="p-1 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={bulkPublish}
                disabled={bulkActionLoading}
                className="gap-1"
              >
                <Eye className="w-4 h-4" />
                Publish
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={bulkUnpublish}
                disabled={bulkActionLoading}
                className="gap-1"
              >
                <EyeOff className="w-4 h-4" />
                Unpublish
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={bulkDelete}
                disabled={bulkActionLoading}
                className="gap-1"
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </Button>
            </div>
          </div>
        )}

        {chapters.length === 0 ? (
          <div className="text-center py-8 border rounded-lg bg-card">
            <p className="text-muted-foreground mb-4">No chapters yet</p>
            <div className="flex gap-2 justify-center">
              <Link href={`/author/stories/${storyId}/chapters/new`}>
                <Button>Write Your First Chapter</Button>
              </Link>
              <Link href={`/author/stories/${storyId}/chapters/import`}>
                <Button variant="outline">Import Chapters</Button>
              </Link>
            </div>
          </div>
        ) : reorderMode ? (
          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId="chapters">
              {(provided) => (
                <div
                  {...provided.droppableProps}
                  ref={provided.innerRef}
                  className="space-y-2"
                >
                  {chapters.map((chapter, index) => (
                    <Draggable key={chapter.id} draggableId={chapter.id} index={index}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          className={`p-4 rounded-lg border bg-card flex items-center gap-3 ${
                            snapshot.isDragging ? 'shadow-lg ring-2 ring-amber-500' : ''
                          }`}
                        >
                          <div {...provided.dragHandleProps} className="cursor-grab active:cursor-grabbing">
                            <GripVertical className="w-5 h-5 text-muted-foreground" />
                          </div>
                          <div className="flex-1">
                            <span className="text-muted-foreground mr-2">
                              Ch. {chapter.chapter_number}
                            </span>
                            <span className="font-medium">{chapter.title}</span>
                          </div>
                          {chapter.min_tier_name && (
                            <span className="px-2 py-0.5 rounded text-xs bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200 flex items-center gap-1">
                              <Lock className="w-3 h-3" />
                              {getTierLabel(chapter.min_tier_name)}
                            </span>
                          )}
                          {chapter.is_published ? (
                            <span className="px-2 py-0.5 rounded text-xs bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                              Published
                            </span>
                          ) : chapter.scheduled_for ? (
                            <span className="px-2 py-0.5 rounded text-xs bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                              📅 {new Date(chapter.scheduled_for).toLocaleDateString()}
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-xs bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
                              Draft
                            </span>
                          )}
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>
        ) : (
          <div className="space-y-2">
            {chapters.map((chapter) => (
              <div
                key={chapter.id}
                className="flex items-center gap-3 p-4 rounded-lg border bg-card hover:border-primary transition-colors"
              >
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    toggleChapterSelection(chapter.id);
                  }}
                  className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                    selectedChapters.has(chapter.id)
                      ? 'bg-amber-500 border-amber-500 text-white'
                      : 'border-zinc-300 dark:border-zinc-600 hover:border-amber-500'
                  }`}
                >
                  {selectedChapters.has(chapter.id) && <Check className="w-3 h-3" />}
                </button>
                <Link
                  href={`/author/stories/${storyId}/chapters/${chapter.id}/edit`}
                  className="flex-1 flex justify-between items-center"
                >
                  <div>
                    <span className="text-muted-foreground mr-2">
                      Ch. {chapter.chapter_number}
                    </span>
                    <span className="font-medium">{chapter.title}</span>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span>{(chapter.word_count ?? 0).toLocaleString()} words</span>
                    {chapter.min_tier_name && (
                      <span className="px-2 py-0.5 rounded text-xs bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200 flex items-center gap-1">
                        <Lock className="w-3 h-3" />
                        {getTierLabel(chapter.min_tier_name)}
                      </span>
                    )}
                    {chapter.is_published ? (
                      <span className="px-2 py-0.5 rounded text-xs bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                        Published
                      </span>
                    ) : chapter.scheduled_for ? (
                      <span className="px-2 py-0.5 rounded text-xs bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                        📅 {new Date(chapter.scheduled_for).toLocaleDateString()}
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded text-xs bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
                        Draft
                      </span>
                    )}
                  </div>
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
