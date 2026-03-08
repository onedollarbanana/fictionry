'use client'

import { useEffect, useRef, useCallback, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface UseScrollPositionProps {
  storyId: string
  chapterId: string
  chapterNumber: number
  enabled?: boolean // Only track for authenticated users
  readingMode?: 'paged' | 'continuous'
}

export function useScrollPosition({ storyId, chapterId, chapterNumber, enabled = false, readingMode = 'paged' }: UseScrollPositionProps) {
  const [isRestored, setIsRestored] = useState(false)
  const [showResumeToast, setShowResumeToast] = useState(false)
  const lastSavedPosition = useRef(0)
  const markedAsRead = useRef(false)
  const isAlreadyRead = useRef(false)
  const saveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Restore scroll position on mount — only if saved chapter matches current chapter
  useEffect(() => {
    if (!enabled) {
      setIsRestored(true)
      return
    }

    const restorePosition = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setIsRestored(true)
        return
      }

      // Check if this chapter is already marked as read
      const { data: readData } = await supabase
        .from('chapter_reads')
        .select('chapter_id')
        .eq('user_id', user.id)
        .eq('chapter_id', chapterId)
        .single()

      const alreadyRead = !!readData
      isAlreadyRead.current = alreadyRead

      if (alreadyRead) {
        setIsRestored(true)
        return
      }

      const { data } = await supabase
        .from('reading_progress')
        .select('scroll_position, chapter_id')
        .eq('user_id', user.id)
        .eq('story_id', storyId)
        .single()

      // Only restore scroll if this is the same chapter the user was reading
      if (data?.scroll_position && data.scroll_position > 0.05 && data.chapter_id === chapterId) {
        // Poll until TiptapRenderer has finished rendering the chapter content —
        // the div exists immediately but scrollHeight is only the skeleton height
        // until Tiptap initialises. Retry up to 10 times (1 second max).
        const attemptScroll = (attempt = 0) => {
          const contentEl = document.getElementById('chapter-content')
          if (!contentEl) { setIsRestored(true); return }
          // Require content to be taller than the viewport before scrolling
          if (contentEl.scrollHeight <= window.innerHeight && attempt < 10) {
            setTimeout(() => attemptScroll(attempt + 1), 100)
            return
          }
          const rect = contentEl.getBoundingClientRect()
          const contentTop = rect.top + window.scrollY
          const contentHeight = contentEl.scrollHeight
          const targetScroll = contentTop + (data.scroll_position * contentHeight)
          window.scrollTo({ top: targetScroll, behavior: 'smooth' })
          setShowResumeToast(true)
          setTimeout(() => setShowResumeToast(false), 3000)
        }
        requestAnimationFrame(() => attemptScroll())
      }
      setIsRestored(true)
    }

    // Small delay to ensure content has rendered
    const timer = setTimeout(restorePosition, 300)
    return () => clearTimeout(timer)
  }, [enabled, storyId, chapterId])

  const dismissResumeToast = useCallback(() => setShowResumeToast(false), [])

  // Mark chapter as read when scroll reaches 90%.
  // In continuous mode, ContinuousScrollReader handles this via sentinels — skip here.
  const markChapterAsRead = useCallback(async () => {
    if (markedAsRead.current || readingMode === 'continuous') return
    markedAsRead.current = true

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { error } = await supabase.from('chapter_reads').upsert({
      chapter_id: chapterId,
      story_id: storyId,
      user_id: user.id,
    }, { onConflict: 'user_id,chapter_id' })

    if (error) {
      console.error('Error marking chapter as read:', error)
      markedAsRead.current = false // Allow retry
    }
  }, [chapterId, storyId])

  // Save scroll position with debounce
  const savePosition = useCallback(async (position: number) => {
    if (!enabled) return

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    await supabase
      .from('reading_progress')
      .upsert({
        user_id: user.id,
        story_id: storyId,
        chapter_id: chapterId,
        chapter_number: chapterNumber,
        scroll_position: position,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id,story_id',
      })
  }, [enabled, storyId, chapterId, chapterNumber])

  // Listen to scroll events
  useEffect(() => {
    if (!enabled || !isRestored) return

    const handleScroll = () => {
      if (isAlreadyRead.current) return
      const contentEl = document.getElementById('chapter-content')
      if (!contentEl) return
      const rect = contentEl.getBoundingClientRect()
      const contentTop = contentEl.offsetTop
      const contentHeight = contentEl.scrollHeight
      // Position = how far the top of the viewport is through the content
      const scrollIntoContent = window.scrollY - contentTop
      const position = contentHeight > 0 ? scrollIntoContent / contentHeight : 0
      const clamped = Math.min(1, Math.max(0, position))

      // Mark as read when user reaches 90% of the chapter
      if (clamped >= 0.9 && !markedAsRead.current) {
        markChapterAsRead()
      }

      // Only save if position changed meaningfully (>2%)
      if (Math.abs(clamped - lastSavedPosition.current) < 0.02) return

      if (saveTimeout.current) clearTimeout(saveTimeout.current)
      saveTimeout.current = setTimeout(() => {
        lastSavedPosition.current = clamped
        savePosition(clamped)
      }, 3000) // Save every 3 seconds of settled scrolling
    }

    window.addEventListener('scroll', handleScroll, { passive: true })

    // Save on page leave
    const handleBeforeUnload = () => {
      if (isAlreadyRead.current) return
      const contentEl = document.getElementById('chapter-content')
      if (!contentEl) return
      const contentTop = contentEl.offsetTop
      const contentHeight = contentEl.scrollHeight
      const scrollIntoContent = window.scrollY - contentTop
      const position = contentHeight > 0 ? Math.min(1, Math.max(0, scrollIntoContent / contentHeight)) : 0
      savePosition(position)
    }
    window.addEventListener('beforeunload', handleBeforeUnload)

    return () => {
      window.removeEventListener('scroll', handleScroll)
      window.removeEventListener('beforeunload', handleBeforeUnload)
      if (saveTimeout.current) clearTimeout(saveTimeout.current)
    }
  }, [enabled, isRestored, savePosition, markChapterAsRead])

  return { isRestored, showResumeToast, dismissResumeToast }
}
