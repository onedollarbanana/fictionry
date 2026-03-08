'use client'

import { useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'

interface SwipeNavigationProps {
  prevChapterUrl?: string
  nextChapterUrl?: string
}

/**
 * Returns true if the element (or any of its ancestors) is horizontally
 * scrollable. Used to avoid triggering chapter navigation when the user
 * is scrolling a wide table, code block, or stats box.
 */
function isInsideHorizontalScroller(el: Element | null): boolean {
  while (el && el !== document.body) {
    if (el.scrollWidth > el.clientWidth + 5) {
      const { overflowX } = window.getComputedStyle(el)
      if (overflowX === 'auto' || overflowX === 'scroll') return true
    }
    el = el.parentElement
  }
  return false
}

export function SwipeNavigation({
  prevChapterUrl,
  nextChapterUrl
}: SwipeNavigationProps) {
  const router = useRouter()
  const touchStartX = useRef<number | null>(null)
  const touchStartY = useRef<number | null>(null)
  const touchStartTime = useRef<number | null>(null)
  const insideScroller = useRef(false)

  const handleNavigation = useCallback((direction: 'prev' | 'next') => {
    if (direction === 'prev' && prevChapterUrl) {
      router.push(prevChapterUrl)
    } else if (direction === 'next' && nextChapterUrl) {
      router.push(nextChapterUrl)
    }
  }, [router, prevChapterUrl, nextChapterUrl])

  useEffect(() => {
    const handleTouchStart = (e: TouchEvent) => {
      // If the touch originates inside a horizontally-scrollable element
      // (table, code block, stat box, etc.) don't track this swipe gesture —
      // the user is scrolling that element, not navigating chapters.
      insideScroller.current = isInsideHorizontalScroller(e.target as Element)
      if (insideScroller.current) return

      touchStartX.current = e.touches[0].clientX
      touchStartY.current = e.touches[0].clientY
      touchStartTime.current = Date.now()
    }

    const handleTouchEnd = (e: TouchEvent) => {
      if (
        insideScroller.current ||
        touchStartX.current === null ||
        touchStartY.current === null ||
        touchStartTime.current === null
      ) {
        return
      }

      const touchEndX = e.changedTouches[0].clientX
      const touchEndY = e.changedTouches[0].clientY
      const deltaTime = Date.now() - touchStartTime.current

      const deltaX = touchEndX - touchStartX.current
      const deltaY = touchEndY - touchStartY.current

      // Reset touch state
      touchStartX.current = null
      touchStartY.current = null
      touchStartTime.current = null

      // Minimum swipe distance (px)
      const minSwipeDistance = 100
      // Maximum swipe time (ms)
      const maxSwipeTime = 500

      // Require a clearly horizontal gesture: deltaX must exceed the minimum
      // distance AND be at least 2× larger than the vertical movement.
      // This prevents accidental navigation when the user scrolls diagonally
      // through a wide element.
      if (
        Math.abs(deltaX) > minSwipeDistance &&
        Math.abs(deltaX) > Math.abs(deltaY) * 2 &&
        deltaTime < maxSwipeTime
      ) {
        if (deltaX > 0) {
          handleNavigation('prev')
        } else {
          handleNavigation('next')
        }
      }
    }

    // Only add listeners on touch devices
    if ('ontouchstart' in window) {
      document.addEventListener('touchstart', handleTouchStart, { passive: true })
      document.addEventListener('touchend', handleTouchEnd, { passive: true })

      return () => {
        document.removeEventListener('touchstart', handleTouchStart)
        document.removeEventListener('touchend', handleTouchEnd)
      }
    }
  }, [handleNavigation])

  return null
}
