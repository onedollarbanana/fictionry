'use client'

import { useState, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { BookOpen, Clock, Pause, CheckCircle, Archive, Library, ArrowUpDown, Bell, BellOff } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import { formatDistanceToNow } from 'date-fns'
import { StatusDropdown } from '@/components/story/StatusDropdown'
import { getStoryUrl, getChapterUrl } from "@/lib/url-utils";

interface LibraryItem {
  followId: string
  status: string
  notifyNewChapters: boolean
  createdAt: string
  updatedAt: string
  story: {
    id: string
  slug?: string | null
  short_id?: string | null
    title: string
    tagline: string | null
    coverUrl: string | null
    status: string
    genres: string[] | null
    tags: string[] | null
    wordCount: number | null
    chapterCount: number | null
    ratingCount: number | null
    ratingSentiment: string | null
    ratingConfidence: string | null
    updatedAt: string
    authorUsername: string
  }
  progress: {
    read: number
    total: number
  }
  latestChapter: { chapterNumber: number; title: string; publishedAt: string; shortId: string; slug: string } | null
  lastReadChapter: { chapterNumber: number; title: string; readAt: string } | null
  nextChapter: { chapterNumber: number; title: string; shortId: string; slug: string } | null
  newChaptersSinceLastRead: number
}

interface LibraryClientProps {
  items: LibraryItem[]
}

type FilterStatus = 'all' | 'reading' | 'plan_to_read' | 'on_hold' | 'finished' | 'dropped'
type SortOption = 'updated' | 'title' | 'added' | 'progress'

const statusTabs = [
  { key: 'reading' as const, label: 'Reading', icon: BookOpen },
  { key: 'plan_to_read' as const, label: 'Plan to Read', icon: Clock },
  { key: 'on_hold' as const, label: 'On Hold', icon: Pause },
  { key: 'finished' as const, label: 'Finished', icon: CheckCircle },
  { key: 'dropped' as const, label: 'Dropped', icon: Archive },
  { key: 'all' as const, label: 'All', icon: Library },
]

const sortOptions = [
  { key: 'updated' as const, label: 'Recently Updated' },
  { key: 'title' as const, label: 'Title A-Z' },
  { key: 'added' as const, label: 'Date Added' },
  { key: 'progress' as const, label: 'Progress' },
]

const statusBadgeColors: Record<string, string> = {
  reading: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  plan_to_read: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  on_hold: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
  finished: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  dropped: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
}

export function LibraryClient({ items: initialItems }: LibraryClientProps) {
  const [items, setItems] = useState(initialItems)
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('reading')
  const [sortBy, setSortBy] = useState<SortOption>('updated')
  const [sortDropdownOpen, setSortDropdownOpen] = useState(false)

  // Calculate counts for tabs
  const counts = useMemo(() => {
    const c: Record<string, number> = { total: items.length }
    items.forEach(item => {
      c[item.status] = (c[item.status] || 0) + 1
    })
    return c
  }, [items])

  // Filter and sort items - all done client-side for instant response
  const filteredAndSortedItems = useMemo(() => {
    let result = filterStatus === 'all' 
      ? items 
      : items.filter(item => item.status === filterStatus)

    // Sort
    result = [...result].sort((a, b) => {
      switch (sortBy) {
        case 'title':
          return a.story.title.localeCompare(b.story.title)
        case 'added':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        case 'progress':
          const progressA = a.progress.total > 0 ? a.progress.read / a.progress.total : 0
          const progressB = b.progress.total > 0 ? b.progress.read / b.progress.total : 0
          return progressB - progressA
        case 'updated':
        default:
          return new Date(b.story.updatedAt).getTime() - new Date(a.story.updatedAt).getTime()
      }
    })

    return result
  }, [items, filterStatus, sortBy])

  // Handle status change from StatusDropdown
  const handleStatusChange = (storyId: string, newStatus: string | null) => {
    if (newStatus === null) {
      // Removed from library
      setItems(prev => prev.filter(item => item.story.id !== storyId))
    } else {
      // Status updated
      setItems(prev => prev.map(item => 
        item.story.id === storyId 
          ? { ...item, status: newStatus, updatedAt: new Date().toISOString() }
          : item
      ))
    }
  }

  // Handle notification toggle
  const handleNotifyChange = (storyId: string, notify: boolean) => {
    setItems(prev => prev.map(item => 
      item.story.id === storyId 
        ? { ...item, notifyNewChapters: notify }
        : item
    ))
  }

  if (items.length === 0) {
    return (
      <div className="text-center py-12">
        <Library className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <p className="text-muted-foreground mb-4">Your library is empty</p>
        <Link href="/browse">
          <Button>Browse Stories</Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Filter tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 md:mx-0 md:px-0 md:flex-wrap scrollbar-hide">
        {statusTabs.map((tab) => {
          const Icon = tab.icon
          const count = tab.key === 'all' ? counts.total : (counts[tab.key] || 0)
          const isActive = filterStatus === tab.key

          return (
            <Button
              key={tab.key}
              variant={isActive ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterStatus(tab.key)}
              className="shrink-0 gap-2"
            >
              <Icon className="h-4 w-4" />
              <span className="hidden sm:inline">{tab.label}</span>
              <span className="sm:hidden">{tab.label.split(' ')[0]}</span>
              <span className="text-xs opacity-70">({count})</span>
            </Button>
          )
        })}
      </div>

      {/* Sort dropdown */}
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">
          {filteredAndSortedItems.length} {filteredAndSortedItems.length === 1 ? 'story' : 'stories'}
        </p>
        
        <div className="relative">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSortDropdownOpen(!sortDropdownOpen)}
            className="gap-2"
          >
            <ArrowUpDown className="h-4 w-4" />
            <span className="hidden sm:inline">Sort: </span>
            {sortOptions.find(s => s.key === sortBy)?.label}
          </Button>

          {sortDropdownOpen && (
            <>
              <div 
                className="fixed inset-0 z-40" 
                onClick={() => setSortDropdownOpen(false)} 
              />
              <div className="absolute top-full mt-1 right-0 z-50 min-w-[180px] bg-white dark:bg-zinc-900 border border-border rounded-md shadow-lg py-1">
                {sortOptions.map((option) => (
                  <button
                    key={option.key}
                    onClick={() => {
                      setSortBy(option.key)
                      setSortDropdownOpen(false)
                    }}
                    className={`w-full px-3 py-2 text-left hover:bg-muted transition-colors ${
                      sortBy === option.key ? 'bg-muted font-medium' : ''
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Story list */}
      {filteredAndSortedItems.length === 0 ? (
        <div className="text-center py-12">
          {filterStatus === 'reading' ? (
            <>
              <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-2">You&apos;re not reading anything right now!</p>
              <p className="text-sm text-muted-foreground mb-4">Find your next favorite story to dive into.</p>
              <Link href="/browse">
                <Button>Browse Stories</Button>
              </Link>
            </>
          ) : (
            <p className="text-muted-foreground">No stories in this category</p>
          )}
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredAndSortedItems.map((item) => (
            <div 
              key={item.followId}
              className="flex gap-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors"
            >
              {/* Cover image */}
              <Link href={getStoryUrl(item.story)} className="shrink-0">
                {item.story.coverUrl ? (
                  <div className="relative w-20 h-28 sm:w-24 sm:h-32 rounded overflow-hidden">
                    <Image
                      src={item.story.coverUrl}
                      alt={item.story.title}
                      fill
                      className="object-cover"
                      sizes="(max-width: 640px) 80px, 96px"
                    />
                  </div>
                ) : (
                  <div className="w-20 h-28 sm:w-24 sm:h-32 rounded bg-muted flex items-center justify-center">
                    <BookOpen className="h-8 w-8 text-muted-foreground" />
                  </div>
                )}
              </Link>

              {/* Story info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <Link href={getStoryUrl(item.story)}>
                    <h3 className="font-semibold line-clamp-2 hover:text-primary transition-colors">
                      {item.story.title}
                    </h3>
                  </Link>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {/* Notification indicator */}
                    {item.notifyNewChapters ? (
                      <Bell className="h-3.5 w-3.5 text-primary" />
                    ) : (
                      <BellOff className="h-3.5 w-3.5 text-muted-foreground" />
                    )}
                    <span className={`text-xs px-2 py-0.5 rounded-full ${statusBadgeColors[item.status] || statusBadgeColors.reading}`}>
                      {statusTabs.find(t => t.key === item.status)?.label || item.status}
                    </span>
                  </div>
                </div>

                <p className="text-sm text-muted-foreground mb-1">
                  by {item.story.authorUsername}
                </p>

                {item.story.tagline && (
                  <p className="text-sm text-muted-foreground mb-2 line-clamp-1">
                    {item.story.tagline}
                  </p>
                )}

                {/* Stats row */}
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground mb-2">
                  <span>{(item.story.chapterCount ?? 0)} chapters</span>
                  <span>{((item.story.wordCount ?? 0) / 1000).toFixed(0)}k words</span>
                  {item.story.ratingConfidence && item.story.ratingConfidence !== 'not_yet_rated' && item.story.ratingSentiment && (
                    <span className="text-amber-600 dark:text-amber-400 font-medium">
                      {item.story.ratingSentiment.replace('_', ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())}
                    </span>
                  )}
                  <span className="whitespace-nowrap">Updated {formatDistanceToNow(new Date(item.story.updatedAt))} ago</span>
                </div>

                {/* Progress bar */}
                {item.progress.total > 0 && (
                  <div className="mb-2">
                    <div className="flex justify-between text-xs text-muted-foreground mb-1">
                      <span>Progress</span>
                      <span>{item.progress.read} / {item.progress.total} chapters</span>
                    </div>
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-primary rounded-full transition-all"
                        style={{ width: `${Math.min(100, (item.progress.read / item.progress.total) * 100)}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Chapter info */}
                {(item.nextChapter || item.latestChapter || item.newChaptersSinceLastRead > 0) && (
                  <div className="text-xs space-y-0.5 mb-2">
                    {item.nextChapter && item.progress.read > 0 && (
                      <Link 
                        href={getChapterUrl(item.story, { short_id: item.nextChapter.shortId, slug: item.nextChapter.slug })}
                        className="block text-primary hover:underline"
                      >
                        📖 Continue: Ch. {item.nextChapter.chapterNumber} — {item.nextChapter.title}
                      </Link>
                    )}
                    {item.newChaptersSinceLastRead > 0 && (
                      <p className="text-amber-600 dark:text-amber-400">
                        ✨ {item.newChaptersSinceLastRead} new chapter{item.newChaptersSinceLastRead !== 1 ? 's' : ''} since you last read
                      </p>
                    )}
                    {item.latestChapter && (
                      <p className="text-muted-foreground">
                        📝 Latest: Ch. {item.latestChapter.chapterNumber} — {item.latestChapter.title} · {formatDistanceToNow(new Date(item.latestChapter.publishedAt))} ago
                      </p>
                    )}
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2 flex-wrap">
                  {item.nextChapter && item.progress.read > 0 ? (
                    <Link href={getChapterUrl(item.story, { short_id: item.nextChapter.shortId, slug: item.nextChapter.slug })}>
                      <Button size="sm" variant="outline">
                        Continue Ch. {item.nextChapter.chapterNumber}
                      </Button>
                    </Link>
                  ) : item.progress.read > 0 && item.progress.read >= item.progress.total && item.progress.total > 0 ? (
                    <Link href={getStoryUrl(item.story)}>
                      <Button size="sm" variant="outline">
                        Caught up ✓
                      </Button>
                    </Link>
                  ) : (
                    <Link href={getStoryUrl(item.story)}>
                      <Button size="sm" variant="outline">
                        {item.progress.read > 0 ? 'Continue' : 'Start Reading'}
                      </Button>
                    </Link>
                  )}
                  <StatusDropdown
                    storyId={item.story.id}
                    currentStatus={item.status}
                    notifyNewChapters={item.notifyNewChapters}
                    onStatusChange={(newStatus) => handleStatusChange(item.story.id, newStatus)}
                    onNotifyChange={(notify) => handleNotifyChange(item.story.id, notify)}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
