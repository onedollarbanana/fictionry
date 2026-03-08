'use client'

import { ReactNode, useEffect, useCallback, useState } from 'react'
import { ReadingSettingsPanel } from './reading-settings-panel'
import { ScrollProgressBar } from './scroll-progress-bar'
import { ScrollToTopButton } from './scroll-to-top-button'
import { ShareableQuote } from './shareable-quote'
import {
  useReadingSettings,
  fontFamilyClasses,
  lineHeightClasses,
  widthClasses,
} from '@/lib/hooks/useReadingSettings'

interface ChapterContentWrapperProps {
  children: ReactNode
  headerContent: ReactNode
  storyTitle?: string
  storyUrl?: string
}

// Theme-specific inline styles (for non-auto themes)
const themeInlineStyles: Record<'light' | 'dark' | 'sepia' | 'night', { bg: string; text: string; borderColor: string }> = {
  light: { bg: '#ffffff', text: '#18181b', borderColor: '#e4e4e7' },
  dark: { bg: 'hsl(222.2, 84%, 4.9%)', text: '#f4f4f5', borderColor: '#3f3f46' },
  sepia: { bg: '#fffbeb', text: '#451a03', borderColor: '#fde68a' },
  night: { bg: '#000000', text: '#d4d4d8', borderColor: '#27272a' },
}

export function ChapterContentWrapper({ children, headerContent, storyTitle, storyUrl }: ChapterContentWrapperProps) {
  const { settings, updateSettings, resetSettings, isLoaded } = useReadingSettings()
  const [immersive, setImmersive] = useState(false)

  // Add reading-mode class to body on mount, remove on unmount
  useEffect(() => {
    document.body.classList.add('reading-mode')
    return () => {
      document.body.classList.remove('reading-mode')
      document.body.classList.remove('immersive-mode')
    }
  }, [])

  // Toggle immersive mode on body
  useEffect(() => {
    if (immersive) {
      document.body.classList.add('immersive-mode')
    } else {
      document.body.classList.remove('immersive-mode')
    }
  }, [immersive])

  // Tap middle of content to toggle immersive mode
  const handleContentTap = useCallback((e: React.MouseEvent<HTMLElement>) => {
    // Only on mobile-ish widths
    if (window.innerWidth > 768) return
    // Don't trigger on links, buttons, or interactive elements
    const target = e.target as HTMLElement
    if (target.closest('a, button, [role="button"], input, textarea, select, [data-interactive]')) return
    // Exclude elements with a pointer cursor (e.g. spoiler reveals, custom interactive spans)
    if (window.getComputedStyle(target).cursor === 'pointer') return

    const rect = e.currentTarget.getBoundingClientRect()
    const tapY = e.clientY - rect.top
    const zoneHeight = rect.height
    // Middle 60% of the content area toggles immersive mode
    const topThreshold = zoneHeight * 0.2
    const bottomThreshold = zoneHeight * 0.8
    
    if (tapY > topThreshold && tapY < bottomThreshold) {
      setImmersive(prev => !prev)
    }
  }, [])

  // Don't render until settings are loaded from localStorage
  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-white dark:bg-background">
        <div className="animate-pulse p-8 max-w-3xl mx-auto">
          <div className="h-8 bg-zinc-200 dark:bg-zinc-700 rounded w-3/4 mb-4" />
          <div className="h-4 bg-zinc-200 dark:bg-zinc-700 rounded w-1/2 mb-8" />
          <div className="space-y-3">
            <div className="h-4 bg-zinc-200 dark:bg-zinc-700 rounded" />
            <div className="h-4 bg-zinc-200 dark:bg-zinc-700 rounded" />
            <div className="h-4 bg-zinc-200 dark:bg-zinc-700 rounded w-5/6" />
          </div>
        </div>
      </div>
    )
  }

  const fontClass = fontFamilyClasses[settings.fontFamily]
  const lineHeightClass = lineHeightClasses[settings.lineHeight]
  const widthClass = widthClasses[settings.width]
  
  // For 'auto', use Tailwind dark mode classes (follows site theme)
  // For explicit themes, use inline styles to override
  const isAutoTheme = settings.theme === 'auto'
  const explicitTheme = !isAutoTheme ? themeInlineStyles[settings.theme as keyof typeof themeInlineStyles] : null

  return (
    <div
      className={`min-h-screen transition-colors duration-300 ${
        isAutoTheme
          ? 'bg-white dark:bg-background text-zinc-900 dark:text-zinc-100'
          : ''
      }`}
      style={{
        ...(explicitTheme ? { backgroundColor: explicitTheme.bg, color: explicitTheme.text } : {}),
        // Apply brightness to the whole reading surface (content + header chrome),
        // not just the article, so the experience is uniform.
        ...(settings.brightness !== 100 ? { filter: `brightness(${settings.brightness / 100})` } : {}),
      }}
      data-reading-theme={settings.theme}
    >
      {/* Scroll Progress Bar */}
      <ScrollProgressBar />
      
      {/* Shareable Quote Popup */}
      {storyTitle && storyUrl && (
        <ShareableQuote storyTitle={storyTitle} storyUrl={storyUrl} />
      )}
      
      {/* Compact Header with Settings Button */}
      <div 
        className={`reader-sticky-header border-b sticky top-0 z-10 backdrop-blur-sm ${
          isAutoTheme 
            ? 'bg-white/95 dark:bg-background/95 border-zinc-200 dark:border-zinc-700' 
            : ''
        }`}
        style={explicitTheme ? { 
          backgroundColor: `${explicitTheme.bg}f2`, // 95% opacity
          borderColor: explicitTheme.borderColor 
        } : undefined}
      >
        <div className={`container mx-auto px-4 py-3 ${widthClass}`}>
          <div className="flex items-center justify-between">
            {headerContent}
            <ReadingSettingsPanel
              settings={settings}
              onUpdateSettings={updateSettings}
              onResetSettings={resetSettings}
            />
          </div>
        </div>
      </div>

      {/* Chapter Content with Applied Settings */}
      <article 
        className={`container mx-auto px-5 md:px-4 py-8 pb-24 md:pb-8 ${widthClass} ${fontClass} ${lineHeightClass}`}
        style={{ fontSize: `${settings.fontSize}px` }}
        onClick={handleContentTap}
        data-reading-settings
      >
        {children}
      </article>
      
      {/* Scroll to Top Button */}
      <ScrollToTopButton />
    </div>
  )
}
