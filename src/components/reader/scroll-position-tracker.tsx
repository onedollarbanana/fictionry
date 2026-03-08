'use client'

import { useScrollPosition } from '@/lib/hooks/useScrollPosition'
import { useReadingSettings } from '@/lib/hooks/useReadingSettings'
import { ResumeToast } from './resume-toast'

interface ScrollPositionTrackerProps {
  storyId: string
  chapterId: string
  chapterNumber: number
  userId: string | null
}

export function ScrollPositionTracker({ storyId, chapterId, chapterNumber, userId }: ScrollPositionTrackerProps) {
  const { settings, isLoaded } = useReadingSettings()
  const { showResumeToast, dismissResumeToast } = useScrollPosition({
    storyId,
    chapterId,
    chapterNumber,
    enabled: !!userId,
    readingMode: isLoaded ? settings.readingMode : 'paged',
  })

  return <ResumeToast show={showResumeToast} onDismiss={dismissResumeToast} />
}
