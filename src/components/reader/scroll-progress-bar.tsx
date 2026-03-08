'use client'

import { useState, useEffect, useCallback, useRef } from 'react'

export function ScrollProgressBar() {
  const [progress, setProgress] = useState(0)
  const [isVisible, setIsVisible] = useState(false)
  const [chapterLabel, setChapterLabel] = useState('')
  const mutationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const calculateProgress = useCallback(() => {
    const scrollTop = window.scrollY
    const viewportHeight = window.innerHeight

    setIsVisible(scrollTop > 100)

    // Find all chapter containers in continuous scroll mode
    const chapterElements = document.querySelectorAll('[data-chapter-id]')
    
    if (chapterElements.length > 1) {
      // Continuous scroll mode: track progress through current chapter
      const viewportCenter = scrollTop + viewportHeight / 2
      
      let currentChapter: Element | null = null
      let currentIdx = 0

      for (let i = 0; i < chapterElements.length; i++) {
        const el = chapterElements[i] as HTMLElement
        const rect = el.getBoundingClientRect()
        const elTop = rect.top + scrollTop
        const elBottom = elTop + rect.height

        if (viewportCenter >= elTop && viewportCenter <= elBottom) {
          currentChapter = el
          currentIdx = i
          break
        }
        if (i === chapterElements.length - 1) {
          currentChapter = el
          currentIdx = i
        }
      }

      if (currentChapter) {
        const rect = currentChapter.getBoundingClientRect()
        const elTop = rect.top + scrollTop
        const elHeight = rect.height
        
        const chapterScrolled = Math.max(0, scrollTop - elTop + viewportHeight * 0.3)
        const chapterProgress = elHeight > 0 
          ? Math.min(100, Math.max(0, (chapterScrolled / elHeight) * 100))
          : 0

        const chapterNum = (currentChapter as HTMLElement).dataset.chapterNumber
        setProgress(chapterProgress)
        setChapterLabel(chapterNum ? `Ch. ${chapterNum}` : `Ch. ${currentIdx + 1}`)
      }
    } else {
      // Single chapter (paged mode): track total page progress
      const docHeight = document.documentElement.scrollHeight - viewportHeight
      const scrollPercent = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0
      setProgress(Math.min(100, Math.max(0, scrollPercent)))
      setChapterLabel('')
    }
  }, [])

  useEffect(() => {
    calculateProgress()
    window.addEventListener('scroll', calculateProgress, { passive: true })
    
    // Recalculate when DOM changes (new chapters loaded in continuous mode).
    // Debounced to avoid thrashing on large subtree mutations (e.g. Tiptap rendering).
    const observer = new MutationObserver(() => {
      if (mutationTimerRef.current) clearTimeout(mutationTimerRef.current)
      mutationTimerRef.current = setTimeout(calculateProgress, 150)
    })
    observer.observe(document.body, { childList: true, subtree: true })

    return () => {
      window.removeEventListener('scroll', calculateProgress)
      observer.disconnect()
      if (mutationTimerRef.current) clearTimeout(mutationTimerRef.current)
    }
  }, [calculateProgress])

  if (!isVisible) return null

  return (
    <div className="fixed top-0 left-0 right-0 z-50 h-1 bg-muted/30">
      <div
        className="h-full bg-primary transition-all duration-150 ease-out"
        style={{ width: `${progress}%` }}
      />
      <div 
        className="absolute top-1 bg-primary text-primary-foreground text-[10px] px-1.5 py-0.5 rounded opacity-0 hover:opacity-100 transition-opacity pointer-events-none"
        style={{ left: `${progress}%`, transform: 'translateX(-50%)' }}
      >
        {chapterLabel ? `${chapterLabel}: ` : ''}{Math.round(progress)}%
      </div>
    </div>
  )
}
