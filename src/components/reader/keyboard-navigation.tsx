'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface KeyboardNavigationProps {
  storyUrl: string
  prevChapterUrl?: string | null
  nextChapterUrl?: string | null
}

export function KeyboardNavigation({ storyUrl, prevChapterUrl, nextChapterUrl }: KeyboardNavigationProps) {
  const router = useRouter()

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input/textarea
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        (e.target as HTMLElement)?.isContentEditable
      ) {
        return
      }

      switch (e.key) {
        case 'ArrowLeft':
          if (prevChapterUrl) {
            e.preventDefault()
            router.push(prevChapterUrl)
          }
          break
        case 'ArrowRight':
          if (nextChapterUrl) {
            e.preventDefault()
            router.push(nextChapterUrl)
          }
          break
        case 'Escape':
          // Don't navigate if a Radix dialog/sheet/popover is open — let it close first
          if (document.querySelector('[role="dialog"][data-state="open"], [role="alertdialog"][data-state="open"]')) return
          e.preventDefault()
          router.push(storyUrl)
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [router, storyUrl, prevChapterUrl, nextChapterUrl])

  // This component doesn't render anything visible
  return null
}
