'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { TiptapRenderer } from './tiptap-renderer'
import { ChapterSeparator } from './chapter-separator'
import { ChapterLockedOverlay } from './chapter-locked-overlay'
import { ViewTracker } from './view-tracker'
import { createClient } from '@/lib/supabase/client'
import { type TierName } from '@/lib/platform-config'
import { Loader2 } from 'lucide-react'

const PRELOAD_AHEAD = 2 // Always keep 2 chapters loaded ahead of current position

interface ChapterData {
  id: string
  title: string
  chapterNumber: number
  slug: string
  shortId: string
  content: string | object | null
  authorNoteBefore: string | null
  authorNoteAfter: string | null
  defaultAuthorNoteBefore: string | null
  defaultAuthorNoteAfter: string | null
  minTierName: string | null
  likes: number
  hasAccess: boolean
  wordCount: number
  commentCount: number
  storyId: string
  storyTitle: string
  authorId: string
  authorName: string
}

interface ContinuousScrollReaderProps {
  initialChapter: ChapterData
  allChapterIds: { id: string; title: string; chapterNumber: number; slug: string; shortId: string }[]
  storyId: string
  storySlug: string
  storyShortId: string
  currentUserId: string | null
  storyAuthorId: string
  authorTiers?: { tier_name: string; enabled: boolean; description: string | null }[]
}

export function ContinuousScrollReader({
  initialChapter,
  allChapterIds,
  storyId,
  storySlug,
  storyShortId,
  currentUserId,
  storyAuthorId,
  authorTiers,
}: ContinuousScrollReaderProps) {
  const [chapters, setChapters] = useState<ChapterData[]>([initialChapter])
  // Ref mirror of chapters state — allows async functions to read current value
  // without the Promise/setState anti-pattern (which breaks under React concurrent rendering)
  const chaptersRef = useRef<ChapterData[]>([initialChapter])

  const [isLoading, setIsLoading] = useState(false)
  const [reachedEnd, setReachedEnd] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const loadTriggerRef = useRef<HTMLDivElement>(null)
  const chapterRefs = useRef<Map<string, HTMLDivElement>>(new Map())
  const [activeChapterId, setActiveChapterId] = useState(initialChapter.id)
  const viewedChapters = useRef<Set<string>>(new Set([initialChapter.id]))
  const loadingRef = useRef(false) // Prevent concurrent fetches

  // Tracks which chapters have been recorded in chapter_reads (avoids double-inserts)
  const readChapters = useRef<Set<string>>(new Set())

  // Helper that keeps chapters state and chaptersRef in sync
  const updateChapters = useCallback((updater: (prev: ChapterData[]) => ChapterData[]) => {
    setChapters(prev => {
      const next = updater(prev)
      chaptersRef.current = next
      return next
    })
  }, [])

  // Find next chapter ID to load based on what's already loaded
  const getNextChapterIdAfter = useCallback((loadedChapters: ChapterData[]) => {
    const lastLoaded = loadedChapters[loadedChapters.length - 1]
    const currentIdx = allChapterIds.findIndex(ch => ch.id === lastLoaded.id)
    if (currentIdx === -1 || currentIdx >= allChapterIds.length - 1) return null
    return allChapterIds[currentIdx + 1].id
  }, [allChapterIds])

  // Fetch a single chapter by ID
  const fetchChapter = useCallback(async (chapterId: string): Promise<ChapterData | null> => {
    try {
      const response = await fetch(`/api/chapters/${chapterId}/content`)
      if (!response.ok) throw new Error('Failed to load chapter')
      return await response.json()
    } catch (err) {
      console.error('Error loading chapter:', err)
      return null
    }
  }, [])

  // Load next chapter and keep preloading if needed
  const loadNextChapter = useCallback(async () => {
    if (loadingRef.current || reachedEnd) return
    loadingRef.current = true
    setIsLoading(true)
    setError(null)

    try {
      // Read current chapters directly from the ref — avoids the Promise/setState anti-pattern
      // that breaks under React 18 concurrent rendering
      const nextId = getNextChapterIdAfter(chaptersRef.current)
      if (!nextId) {
        setReachedEnd(true)
        return
      }

      const data = await fetchChapter(nextId)
      if (!data) {
        setError('Failed to load next chapter. Scroll up and try again.')
        return
      }

      updateChapters(prev => [...prev, data])

      // Stop if chapter is gated/locked
      if (!data.hasAccess) {
        setReachedEnd(true)
      }
    } finally {
      loadingRef.current = false
      setIsLoading(false)
    }
  }, [reachedEnd, getNextChapterIdAfter, fetchChapter, updateChapters])

  // Preload chapters on mount and whenever chapters change
  useEffect(() => {
    const preload = async () => {
      // Find current active chapter index in loaded chapters
      const activeIdx = chapters.findIndex(ch => ch.id === activeChapterId)
      const chaptersAhead = chapters.length - 1 - activeIdx

      // If we don't have enough chapters loaded ahead, load more
      if (chaptersAhead < PRELOAD_AHEAD && !reachedEnd && !loadingRef.current) {
        loadNextChapter()
      }
    }

    preload()
  }, [chapters, activeChapterId, reachedEnd, loadNextChapter])

  // Check if we've reached the end of published chapters
  useEffect(() => {
    const lastLoaded = chapters[chapters.length - 1]
    const currentIdx = allChapterIds.findIndex(ch => ch.id === lastLoaded.id)
    if (currentIdx >= allChapterIds.length - 1) {
      setReachedEnd(true)
    }
  }, [chapters, allChapterIds])

  // IntersectionObserver for lazy loading (backup trigger)
  useEffect(() => {
    const trigger = loadTriggerRef.current
    if (!trigger) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !loadingRef.current && !reachedEnd) {
          loadNextChapter()
        }
      },
      { rootMargin: '1500px' } // Start loading 1500px before reaching bottom
    )

    observer.observe(trigger)
    return () => observer.disconnect()
  }, [reachedEnd, loadNextChapter])

  // Track which chapter is in the viewport for URL update + progress tracking
  useEffect(() => {
    const observers: IntersectionObserver[] = []

    chapterRefs.current.forEach((el, chapterId) => {
      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            setActiveChapterId(chapterId)

            // Update URL without navigation
            const chapter = chapters.find(ch => ch.id === chapterId)
            if (chapter) {
              const storyBase = `/story/${storySlug}-${storyShortId}`
              const newUrl = chapter.slug
                ? `${storyBase}/chapter/${chapter.slug}-${chapter.shortId}`
                : `${storyBase}/chapter/${chapter.shortId}`
              window.history.replaceState(null, '', newUrl)
            }

            // Track view for newly visible chapters
            if (!viewedChapters.current.has(chapterId)) {
              viewedChapters.current.add(chapterId)
            }
          }
        },
        { threshold: 0.3 }
      )

      observer.observe(el)
      observers.push(observer)
    })

    return () => observers.forEach(obs => obs.disconnect())
  }, [chapters, storySlug, storyShortId])

  // Update reading progress when active chapter changes.
  // Only advances the pointer — never regresses to an earlier chapter.
  // Sets scroll_position: 0 so that returning in paged mode starts at the top of the chapter.
  useEffect(() => {
    if (!currentUserId || !activeChapterId) return

    const chapter = chapters.find(ch => ch.id === activeChapterId)
    if (!chapter) return

    const updateProgress = async () => {
      const supabase = createClient()

      const { data: existing } = await supabase
        .from('reading_progress')
        .select('id, chapter_number')
        .eq('user_id', currentUserId)
        .eq('story_id', storyId)
        .single()

      if (existing && chapter.chapterNumber <= (existing as any).chapter_number) return

      if (existing) {
        await supabase
          .from('reading_progress')
          .update({
            chapter_id: activeChapterId,
            chapter_number: chapter.chapterNumber,
            // Reset to 0 so that returning readers in paged mode start at the top
            // of the chapter rather than an irrelevant scroll position from a prior chapter
            scroll_position: 0,
            updated_at: new Date().toISOString(),
          })
          .eq('id', (existing as any).id)
      } else {
        await supabase.from('reading_progress').insert({
          user_id: currentUserId,
          story_id: storyId,
          chapter_id: activeChapterId,
          chapter_number: chapter.chapterNumber,
          scroll_position: 0,
        })
      }
    }

    const timer = setTimeout(updateProgress, 2000)
    return () => clearTimeout(timer)
  }, [activeChapterId, currentUserId, storyId, chapters])

  // Mark chapters as read via chapter_reads when the reader reaches the end of each chapter.
  // Uses IntersectionObserver on sentinel divs placed at the bottom of each chapter's content.
  // This covers dynamically-loaded chapters (index > 0) that useScrollPosition cannot reach
  // because it is anchored to #chapter-content (the initial server-rendered chapter only).
  // The initial chapter (index 0) sentinel fires when the reader scrolls to the separator,
  // which immediately follows the server-rendered content.
  const markChapterRead = useCallback(async (chapId: string) => {
    if (!currentUserId || readChapters.current.has(chapId)) return
    readChapters.current.add(chapId)

    const supabase = createClient()
    const { error: readError } = await supabase
      .from('chapter_reads')
      .upsert(
        { chapter_id: chapId, story_id: storyId, user_id: currentUserId },
        { onConflict: 'user_id,chapter_id' }
      )

    if (readError) {
      console.error('Error marking chapter as read:', readError)
      readChapters.current.delete(chapId) // allow retry on next scroll
    }
  }, [currentUserId, storyId])

  useEffect(() => {
    if (!currentUserId) return

    const sentinels = document.querySelectorAll<HTMLElement>('[data-read-sentinel]')
    const observers: IntersectionObserver[] = []

    sentinels.forEach(sentinel => {
      const chapId = sentinel.dataset.readSentinel!
      if (readChapters.current.has(chapId)) return // already recorded

      const observer = new IntersectionObserver(
        ([entry]) => { if (entry.isIntersecting) markChapterRead(chapId) },
        { threshold: 0 }
      )
      observer.observe(sentinel)
      observers.push(observer)
    })

    return () => observers.forEach(obs => obs.disconnect())
  }, [chapters, currentUserId, markChapterRead])

  return (
    <div className="continuous-scroll-reader">
      {chapters.map((chapter, index) => {
        // First chapter: content already rendered by server, just show separator
        if (index === 0) {
          return (
            <div key={chapter.id}>
              <div
                ref={(el) => {
                  if (el) chapterRefs.current.set(chapter.id, el)
                }}
                data-chapter-id={chapter.id}
                className="h-0"
              />
              {/* Read sentinel for the initial server-rendered chapter.
                  Positioned at the start of the separator (= end of chapter 1 content).
                  Fires markChapterRead when the reader scrolls down to the chapter boundary. */}
              <div data-read-sentinel={chapter.id} />
              {chapters.length > 1 && (
                <ChapterSeparator
                  completedChapter={{
                    id: chapter.id,
                    title: chapter.title,
                    chapterNumber: chapter.chapterNumber,
                  }}
                  nextChapter={chapters[1] ? {
                    id: chapters[1].id,
                    title: chapters[1].title,
                    chapterNumber: chapters[1].chapterNumber,
                    wordCount: chapters[1].wordCount,
                  } : null}
                  storyId={storyId}
                  currentUserId={currentUserId}
                  storyAuthorId={storyAuthorId}
                  commentCount={chapter.commentCount}
                />
              )}
              {chapters.length === 1 && !isLoading && reachedEnd && (
                <ChapterSeparator
                  completedChapter={{
                    id: chapter.id,
                    title: chapter.title,
                    chapterNumber: chapter.chapterNumber,
                  }}
                  nextChapter={null}
                  storyId={storyId}
                  currentUserId={currentUserId}
                  storyAuthorId={storyAuthorId}
                  commentCount={chapter.commentCount}
                />
              )}
            </div>
          )
        }

        // Subsequent chapters: render full content
        return (
          <div key={chapter.id}>
            <div
              ref={(el) => {
                if (el) chapterRefs.current.set(chapter.id, el)
              }}
              data-chapter-id={chapter.id}
            >
              <header className="mb-8">
                <h1 className="text-2xl md:text-3xl font-bold">{chapter.title}</h1>
                <div className="flex items-center gap-3 mt-2">
                  <p className="opacity-70">
                    Chapter {chapter.chapterNumber}
                  </p>
                </div>
              </header>

              {!chapter.hasAccess ? (
                <ChapterLockedOverlay
                  storyId={storyId}
                  chapterId={chapter.id}
                  authorId={storyAuthorId}
                  authorName={chapter.authorName}
                  requiredTier={chapter.minTierName as TierName}
                  availableTiers={(authorTiers || []).map(t => ({
                    tier_name: t.tier_name as TierName,
                    enabled: t.enabled,
                    description: t.description,
                  }))}
                  isLoggedIn={!!currentUserId}
                />
              ) : (
                <>
                  {chapter.defaultAuthorNoteBefore && (
                    <div className="mb-6 p-4 rounded-lg bg-black/5 dark:bg-white/5 border-l-4 border-primary">
                      <p className="text-sm font-medium opacity-70 mb-1">Author&apos;s Note</p>
                      <p className="text-sm whitespace-pre-wrap break-words">{chapter.defaultAuthorNoteBefore}</p>
                    </div>
                  )}
                  {chapter.authorNoteBefore && (
                    <div className="mb-8 p-4 rounded-lg bg-black/5 dark:bg-white/5 border-l-4 border-secondary">
                      <p className="text-sm font-medium opacity-70 mb-1">Chapter Note</p>
                      <p className="text-sm whitespace-pre-wrap break-words">{chapter.authorNoteBefore}</p>
                    </div>
                  )}

                  {chapter.content && (
                    <div className="prose dark:prose-invert max-w-none">
                      <TiptapRenderer content={chapter.content} />
                    </div>
                  )}

                  {chapter.authorNoteAfter && (
                    <div className="mt-8 p-4 rounded-lg bg-black/5 dark:bg-white/5 border-l-4 border-secondary">
                      <p className="text-sm font-medium opacity-70 mb-1">Chapter Note</p>
                      <p className="text-sm whitespace-pre-wrap break-words">{chapter.authorNoteAfter}</p>
                    </div>
                  )}
                  {chapter.defaultAuthorNoteAfter && (
                    <div className="mt-6 p-4 rounded-lg bg-black/5 dark:bg-white/5 border-l-4 border-primary">
                      <p className="text-sm font-medium opacity-70 mb-1">Author&apos;s Note</p>
                      <p className="text-sm whitespace-pre-wrap break-words">{chapter.defaultAuthorNoteAfter}</p>
                    </div>
                  )}

                  {/* Read sentinel — placed at the end of accessible chapter content.
                      When this enters the viewport, the reader has finished the chapter. */}
                  <div data-read-sentinel={chapter.id} />
                </>
              )}

              <ViewTracker chapterId={chapter.id} storyId={storyId} hasAccess={chapter.hasAccess} />
            </div>

            {/* Separator between chapters */}
            {index < chapters.length - 1 && (
              <ChapterSeparator
                completedChapter={{
                  id: chapter.id,
                  title: chapter.title,
                  chapterNumber: chapter.chapterNumber,
                }}
                nextChapter={chapters[index + 1] ? {
                  id: chapters[index + 1].id,
                  title: chapters[index + 1].title,
                  chapterNumber: chapters[index + 1].chapterNumber,
                  wordCount: chapters[index + 1].wordCount,
                } : null}
                storyId={storyId}
                currentUserId={currentUserId}
                storyAuthorId={storyAuthorId}
                commentCount={chapter.commentCount}
              />
            )}

            {/* Separator after last chapter */}
            {index === chapters.length - 1 && !isLoading && (
              <ChapterSeparator
                completedChapter={{
                  id: chapter.id,
                  title: chapter.title,
                  chapterNumber: chapter.chapterNumber,
                }}
                nextChapter={null}
                storyId={storyId}
                currentUserId={currentUserId}
                storyAuthorId={storyAuthorId}
                commentCount={chapter.commentCount}
              />
            )}
          </div>
        )
      })}

      {/* Loading indicator */}
      {isLoading && (
        <div className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="text-center py-6 text-red-500 dark:text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Invisible trigger for loading next chapter */}
      {!reachedEnd && !isLoading && (
        <div ref={loadTriggerRef} className="h-px" />
      )}
    </div>
  )
}
