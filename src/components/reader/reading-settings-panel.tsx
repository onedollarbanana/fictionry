'use client'

import { Settings, RotateCcw, BookOpen, ScrollText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import type { ReadingSettings } from '@/lib/hooks/useReadingSettings'

interface ReadingSettingsPanelProps {
  settings: ReadingSettings
  onUpdateSettings: (updates: Partial<ReadingSettings>) => void
  onResetSettings: () => void
  embedded?: boolean // When true, renders without Sheet wrapper (for mobile bottom sheet)
}

const fontOptions: { value: ReadingSettings['fontFamily']; label: string }[] = [
  { value: 'default', label: 'Default' },
  { value: 'merriweather', label: 'Merriweather' },
  { value: 'lora', label: 'Lora' },
  { value: 'literata', label: 'Literata' },
  { value: 'source-sans', label: 'Source Sans' },
  { value: 'mono', label: 'Mono' },
]

const lineHeightOptions: { value: ReadingSettings['lineHeight']; label: string }[] = [
  { value: 'compact', label: 'Compact' },
  { value: 'normal', label: 'Normal' },
  { value: 'relaxed', label: 'Relaxed' },
  { value: 'spacious', label: 'Spacious' },
]

const themeOptions: { value: ReadingSettings['theme']; label: string; desc: string }[] = [
  { value: 'auto', label: 'Auto', desc: 'Follows site theme' },
  { value: 'light', label: 'Light', desc: 'Always light' },
  { value: 'dark', label: 'Dark', desc: 'Always dark' },
  { value: 'sepia', label: 'Sepia', desc: 'Warm tones' },
  { value: 'night', label: 'Night', desc: 'OLED black' },
]

const widthOptions: { value: ReadingSettings['width']; label: string }[] = [
  { value: 'narrow', label: 'Narrow' },
  { value: 'medium', label: 'Medium' },
  { value: 'wide', label: 'Wide' },
]

function SettingsContent({ 
  settings, 
  onUpdateSettings, 
  onResetSettings 
}: Omit<ReadingSettingsPanelProps, 'embedded'>) {
  return (
    <div className="space-y-6">
      {/* Reading Mode */}
      <div>
        <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2 block">
          Reading Mode
        </label>
        <div className="flex gap-2 flex-wrap">
          <Button
            variant={settings.readingMode === 'paged' ? 'default' : 'outline'}
            size="sm"
            onClick={() => onUpdateSettings({ readingMode: 'paged' })}
            className="flex-1 gap-2"
          >
            <BookOpen className="h-4 w-4" />
            Paged
          </Button>
          <Button
            variant={settings.readingMode === 'continuous' ? 'default' : 'outline'}
            size="sm"
            onClick={() => onUpdateSettings({ readingMode: 'continuous' })}
            className="flex-1 gap-2"
          >
            <ScrollText className="h-4 w-4" />
            Continuous
          </Button>
        </div>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
          {settings.readingMode === 'paged' 
            ? 'Read one chapter at a time' 
            : 'Scroll through chapters seamlessly'}
        </p>
      </div>

      {/* Font Family */}
      <div>
        <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2 block">
          Font
        </label>
        <div className="flex gap-2 flex-wrap">
          {fontOptions.map((option) => (
            <Button
              key={option.value}
              variant={settings.fontFamily === option.value ? 'default' : 'outline'}
              size="sm"
              onClick={() => onUpdateSettings({ fontFamily: option.value })}
              className="min-w-[60px]"
            >
              {option.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Font Size */}
      <div>
        <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2 block">
          Size: {settings.fontSize}px
        </label>
        <Slider
          value={[settings.fontSize]}
          onValueChange={([value]) => onUpdateSettings({ fontSize: value })}
          min={14}
          max={24}
          step={1}
          className="w-full"
        />
      </div>

      {/* Line Height */}
      <div>
        <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2 block">
          Line Spacing
        </label>
        <div className="flex gap-2 flex-wrap">
          {lineHeightOptions.map((option) => (
            <Button
              key={option.value}
              variant={settings.lineHeight === option.value ? 'default' : 'outline'}
              size="sm"
              onClick={() => onUpdateSettings({ lineHeight: option.value })}
              className="flex-1"
            >
              {option.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Theme */}
      <div>
        <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2 block">
          Theme
        </label>
        <div className="flex gap-2 flex-wrap">
          {themeOptions.map((option) => (
            <Button
              key={option.value}
              variant={settings.theme === option.value ? 'default' : 'outline'}
              size="sm"
              onClick={() => onUpdateSettings({ theme: option.value })}
              className="min-w-[60px]"
              title={option.desc}
            >
              {option.label}
            </Button>
          ))}
        </div>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
          {themeOptions.find(t => t.value === settings.theme)?.desc}
        </p>
      </div>

      {/* Content Width */}
      <div>
        <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2 block">
          Content Width
        </label>
        <div className="flex gap-2 flex-wrap">
          {widthOptions.map((option) => (
            <Button
              key={option.value}
              variant={settings.width === option.value ? 'default' : 'outline'}
              size="sm"
              onClick={() => onUpdateSettings({ width: option.value })}
              className="flex-1"
            >
              {option.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Brightness */}
      <div>
        <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2 block">
          Brightness: {settings.brightness}%
        </label>
        <Slider
          value={[settings.brightness]}
          onValueChange={([value]) => onUpdateSettings({ brightness: value })}
          min={50}
          max={150}
          step={5}
          className="w-full"
        />
      </div>

      {/* Reset Button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={onResetSettings}
        className="w-full text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
      >
        <RotateCcw className="h-4 w-4 mr-2" />
        Reset to Defaults
      </Button>
    </div>
  )
}

export function ReadingSettingsPanel({ 
  settings, 
  onUpdateSettings, 
  onResetSettings,
  embedded = false,
}: ReadingSettingsPanelProps) {
  // When embedded (in mobile bottom sheet), just render the content
  if (embedded) {
    return (
      <SettingsContent
        settings={settings}
        onUpdateSettings={onUpdateSettings}
        onResetSettings={onResetSettings}
      />
    )
  }

  // Desktop: render with Sheet wrapper
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2">
          <Settings className="h-4 w-4" />
          <span className="hidden sm:inline">Settings</span>
        </Button>
      </SheetTrigger>
      <SheetContent className="w-[320px] bg-white dark:bg-zinc-900">
        <SheetHeader>
          <SheetTitle className="text-zinc-900 dark:text-zinc-100">Reading Settings</SheetTitle>
        </SheetHeader>
        <div className="mt-6">
          <SettingsContent
            settings={settings}
            onUpdateSettings={onUpdateSettings}
            onResetSettings={onResetSettings}
          />
        </div>
      </SheetContent>
    </Sheet>
  )
}
