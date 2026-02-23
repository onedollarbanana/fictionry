'use client'

import { useEffect, useRef } from 'react'
import Link from 'next/link'
import { ChevronLeft, ChevronRight, BookOpen, List } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ChapterLikeButton } from './chapter-like-button'
import { ShareButtons } from '@/components/ui/share-buttons'
import { createClient } from '@/lib/supabase/client'

interface ChapterCompleteCardProps {
  storyUrl: string
  storyTitle: string
  chapterId: string
  storyId: string
  chapterNumber: number
  chapterTitle: string
  totalChapters: number
  initialLikes: number
  currentUserId: string | null
  storyAuthorId: string
  prevChapter: { url: string; title: string } | null
  nextChapter: { url: string; title: string } | null
  shareUrl?: string
  shareTitle?: string
  reportButton?: React.ReactNode
}

export function ChapterCompleteCard({
  storyUrl,
  storyTitle,
  chapterId,
  storyId,
  chapterNumber,
  totalChapters,
  initialLikes,
  currentUserId,
  storyAuthorId,
  prevChapter,
  nextChapter,
  shareUrl,
  shareTitle,
  reportButton,
}: ChapterCompleteCardProps) {
  // Safety net: mark chapter as read when user reaches the end-of-chapter card
  const markedRead = useRef(false)
  useEffect(() => {
    if (markedRead.current || !currentUserId) return
    markedRead.current = true

    const markRead = async () => {
      const supabase = createClient()
      const { error } = await supabase.from('chapter_reads').upsert({
        chapter_id: chapterId,
        story_id: storyId,
        user_id: currentUserId,
      }, { onConflict: 'user_id,chapter_id' })
      if (error) console.error('Error marking chapter as read:', error)
    }
    markRead()
  }, [chapterId, storyId, currentUserId])

  return (
    <div className="mt-10 mb-4">
      {/* Divider */}
      <div className="flex items-center gap-3 mb-6">
        <div className="flex-1 h-px bg-current opacity-10" />
        <span className="text-xs font-medium uppercase tracking-wider opacity-40">
          End of Chapter {chapterNumber}
        </span>
        <div className="flex-1 h-px bg-current opacity-10" />
      </div>

      {/* Like + Report row */}
      <div className="flex items-center justify-center gap-4 mb-4">
        <ChapterLikeButton
          chapterId={chapterId}
          initialLikes={initialLikes}
          currentUserId={currentUserId}
        />
        {currentUserId && currentUserId !== storyAuthorId && reportButton}
      </div>

      {/* Share row */}
      {shareUrl && (
        <div className="flex items-center justify-center gap-2 mb-6">
          <span className="text-xs font-medium opacity-50 uppercase tracking-wider">Share</span>
          <ShareButtons
            url={shareUrl}
            title={shareTitle || ''}
            description="Read on Fictionry"
          />
        </div>
      )}

      {/* Next Chapter CTA - the star of the show */}
      {nextChapter ? (
        <Link href={nextChapter.url} className="block">
          <div className="w-full p-4 rounded-xl bg-primary text-primary-foreground hover:opacity-90 transition-opacity">
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium uppercase tracking-wider opacity-70 mb-1">
                  Next Chapter
                </p>
                <p className="font-semibold truncate">
                  {nextChapter.title}
                </p>
              </div>
              <ChevronRight className="h-6 w-6 ml-3 flex-shrink-0" />
            </div>
          </div>
        </Link>
      ) : (
        <div className="w-full p-4 rounded-xl bg-black/5 dark:bg-white/5 text-center">
          <div className="flex items-center justify-center gap-2 mb-1">
            <BookOpen className="h-4 w-4 opacity-60" />
            <p className="text-sm font-medium opacity-70">You&apos;re all caught up!</p>
          </div>
          <p className="text-xs opacity-50">
            Chapter {chapterNumber} of {totalChapters} published
          </p>
        </div>
      )}

      {/* Secondary navigation row */}
      <div className="flex items-center justify-between mt-3 gap-2">
        {prevChapter ? (
          <Link href={prevChapter.url}>
            <Button variant="ghost" size="sm" className="flex items-center gap-1 text-xs opacity-70 hover:opacity-100">
              <ChevronLeft className="h-3.5 w-3.5" />
              Previous
            </Button>
          </Link>
        ) : (
          <div />
        )}

        <Link href={storyUrl}>
          <Button variant="ghost" size="sm" className="flex items-center gap-1 text-xs opacity-70 hover:opacity-100">
            <List className="h-3.5 w-3.5" />
            Table of Contents
          </Button>
        </Link>
      </div>
    </div>
  )
}
