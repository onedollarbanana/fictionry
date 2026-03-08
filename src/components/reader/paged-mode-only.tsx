'use client'

import { ReactNode } from 'react'
import { useReadingSettings } from '@/lib/hooks/useReadingSettings'

interface PagedModeOnlyProps {
  children: ReactNode
}

export function PagedModeOnly({ children }: PagedModeOnlyProps) {
  const { settings, isLoaded } = useReadingSettings()
  
  // Suppress until settings are loaded from localStorage — avoids a one-frame flash
  // of paged-only UI (keyboard nav, swipe nav) for users in continuous scroll mode.
  // ChapterContentWrapper already shows a skeleton during !isLoaded, so hiding here is safe.
  if (!isLoaded || settings.readingMode !== 'paged') return null

  return <>{children}</>
}
