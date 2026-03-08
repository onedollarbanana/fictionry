'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ChevronLeft, ChevronRight, Settings, List } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { ReadingSettingsPanel } from './reading-settings-panel'
import { useReadingSettings, widthClasses } from '@/lib/hooks/useReadingSettings'

interface MobileChapterNavProps {
  storyUrl: string
  storyTitle: string
  prevChapter: { url: string; title: string } | null
  nextChapter: { url: string; title: string } | null
  currentChapterNumber: number
  totalChapters: number
}

// Theme-specific inline styles (for non-auto themes)
const themeInlineStyles: Record<'light' | 'dark' | 'sepia' | 'night', { bg: string; text: string; borderColor: string }> = {
  light: { bg: '#ffffff', text: '#18181b', borderColor: '#e4e4e7' },
  dark: { bg: '#18181b', text: '#f4f4f5', borderColor: '#3f3f46' },
  sepia: { bg: '#fffbeb', text: '#451a03', borderColor: '#fde68a' },
  night: { bg: '#000000', text: '#d4d4d8', borderColor: '#27272a' },
}

export function MobileChapterNav({
  storyUrl,
  storyTitle,
  prevChapter,
  nextChapter,
  currentChapterNumber,
  totalChapters,
}: MobileChapterNavProps) {
  const [settingsOpen, setSettingsOpen] = useState(false)
  const { settings, updateSettings, resetSettings } = useReadingSettings()

  // In continuous scroll mode, chapter navigation is handled by scrolling —
  // Prev/Next links would navigate away from the continuous reader and break the experience.
  const isContinuousMode = settings.readingMode === 'continuous'

  const isAutoTheme = settings.theme === 'auto'
  const explicitTheme = !isAutoTheme ? themeInlineStyles[settings.theme as keyof typeof themeInlineStyles] : null
  const widthClass = widthClasses[settings.width]

  return (
    <>
      {/* Fixed bottom navigation bar - mobile only */}
      <nav 
        className={`reader-bottom-nav md:hidden fixed bottom-0 left-0 right-0 z-50 border-t safe-area-bottom ${
          isAutoTheme 
            ? 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700' 
            : ''
        }`}
        style={explicitTheme ? { 
          backgroundColor: explicitTheme.bg,
          borderColor: explicitTheme.borderColor 
        } : undefined}
      >
        {/* Inner container matches content width */}
        <div className={`container mx-auto px-2 ${widthClass}`}>
          <div className="flex items-center justify-between py-1.5">
            {/* Previous Chapter */}
            {prevChapter && !isContinuousMode ? (
              <Link href={prevChapter.url}>
                <Button
                  variant="outline"
                  size="sm"
                  className={`flex items-center gap-1 min-h-[44px] px-3 text-xs font-medium ${
                    isAutoTheme
                      ? 'border-zinc-300 dark:border-zinc-600 text-zinc-700 dark:text-zinc-300'
                      : ''
                  }`}
                  style={explicitTheme ? { color: explicitTheme.text, borderColor: explicitTheme.borderColor } : undefined}
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                  Prev
                </Button>
              </Link>
            ) : (
              <Button variant="outline" size="sm" disabled className="opacity-30 min-h-[44px] px-3 text-xs">
                <ChevronLeft className="h-3.5 w-3.5" />
                Prev
              </Button>
            )}

            {/* Chapter indicator & TOC link */}
            <Link 
              href={storyUrl}
              className={`flex items-center gap-1.5 px-2 py-1.5 rounded-md transition-colors ${
                isAutoTheme 
                  ? 'hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400' 
                  : ''
              }`}
              style={explicitTheme ? { color: explicitTheme.text } : undefined}
            >
              <List className="h-3.5 w-3.5" />
              <span className="text-xs font-medium">
                {currentChapterNumber}/{totalChapters}
              </span>
            </Link>

            {/* Settings button - opens sheet */}
            <Sheet open={settingsOpen} onOpenChange={setSettingsOpen}>
              <SheetTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="sm"
                  className={`min-h-[44px] min-w-[44px] p-0 ${isAutoTheme
                    ? 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800' 
                    : ''
                  }`}
                  style={explicitTheme ? { color: explicitTheme.text } : undefined}
                >
                  <Settings className="h-4 w-4" />
                  <span className="sr-only">Settings</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="bottom" className="h-auto max-h-[80vh] overflow-y-auto bg-white dark:bg-zinc-900">
                <SheetHeader>
                  <SheetTitle className="text-zinc-900 dark:text-zinc-100">Reading Settings</SheetTitle>
                </SheetHeader>
                <div className="py-4">
                  <ReadingSettingsPanel
                    settings={settings}
                    onUpdateSettings={updateSettings}
                    onResetSettings={resetSettings}
                    embedded
                  />
                </div>
              </SheetContent>
            </Sheet>

            {/* Next Chapter */}
            {nextChapter && !isContinuousMode ? (
              <Link href={nextChapter.url}>
                <Button
                  variant="outline"
                  size="sm"
                  className={`flex items-center gap-1 min-h-[44px] px-3 text-xs font-medium ${
                    isAutoTheme
                      ? 'border-zinc-300 dark:border-zinc-600 text-zinc-700 dark:text-zinc-300'
                      : ''
                  }`}
                  style={explicitTheme ? { color: explicitTheme.text, borderColor: explicitTheme.borderColor } : undefined}
                >
                  Next
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </Link>
            ) : (
              <Button variant="outline" size="sm" disabled className="opacity-30 min-h-[44px] px-3 text-xs">
                Next
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </div>
      </nav>
    </>
  )
}
