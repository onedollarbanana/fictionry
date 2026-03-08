'use client'

import Link from 'next/link'
import Image from 'next/image'
import { BookOpen, FileText, Users } from 'lucide-react'
import { getStoryUrl } from "@/lib/url-utils";
import { useImpressionLogger } from "@/hooks/useImpressionLogger";

const GENRE_COLOURS: Record<string, string> = {
  'fantasy': 'bg-purple-600',
  'science-fiction': 'bg-cyan-600',
  'romance': 'bg-pink-600',
  'thriller-mystery': 'bg-slate-600',
  'horror': 'bg-red-700',
  'litrpg': 'bg-emerald-600',
  'historical-fiction': 'bg-amber-700',
  'action-adventure': 'bg-orange-600',
  'contemporary-fiction': 'bg-blue-600',
  'comedy-satire': 'bg-yellow-600',
  'literary-fiction': 'bg-indigo-600',
  'paranormal-supernatural': 'bg-violet-700',
  'fan-fiction': 'bg-teal-600',
}
const DEFAULT_GENRE_COLOUR = 'bg-primary'

interface StoryCardCompactProps {
  story: {
    id: string
    slug?: string | null
    short_id?: string | null
    title: string
    blurb?: string | null
    tagline?: string | null
    cover_url?: string | null
    primary_genre?: string | null
    subgenres?: string[] | null
    tags?: string[] | null
    chapter_count?: number | null
    word_count?: number | null
    total_views?: number | null
    total_likes?: number | null
    follower_count?: number | null
    rating_count?: number | null
    rating_sentiment?: string | null
    rating_confidence?: string | null
    updated_at?: string | null
    author?: {
      username?: string
      display_name?: string | null
    } | null
    profiles?: {
      username?: string
      display_name?: string | null
    } | null
  }
  rank?: number
  showRank?: boolean
  surface?: string
}

export function StoryCardCompact({ story, rank, showRank = false, surface }: StoryCardCompactProps) {
  const cardRef = useImpressionLogger(story.id, surface ?? '');

  const formatNumber = (num: number | null | undefined) => {
    if (!num) return '0'
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
    return num.toString()
  }

  const formatWords = (n?: number | null) => {
    if (!n) return '—'
    return n >= 1000 ? `${Math.round(n / 1000)}K` : n.toString()
  }

  const imageTimestamp = story.updated_at
    ? new Date(story.updated_at).getTime()
    : 'v1'

  const genreColour = story.primary_genre
    ? (GENRE_COLOURS[story.primary_genre] ?? DEFAULT_GENRE_COLOUR)
    : DEFAULT_GENRE_COLOUR

  // Sentiment badge: not shown if no ratings; grey for early feedback, amber for established
  const showBadge = story.rating_confidence && story.rating_confidence !== 'not_yet_rated'
  const isEarly = story.rating_confidence === 'early_feedback'
  const badgeText = isEarly
    ? `Early Feedback (${story.rating_count ?? 0})`
    : story.rating_sentiment?.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())
  const badgeColour = isEarly ? 'text-gray-400' : 'text-amber-400'

  const authorName = story.author?.display_name || story.author?.username
    || story.profiles?.display_name || story.profiles?.username

  return (
    <div ref={cardRef as React.RefObject<HTMLDivElement>} className="flex-shrink-0 w-[180px] sm:w-[200px]">
      <Link href={getStoryUrl(story)} className="block group h-full">
        <div className="bg-card border rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow h-full flex flex-col">

          {/* Cover Image — 3:4 portrait ratio */}
          <div className="relative w-full aspect-[3/4] overflow-hidden bg-muted">
            {showRank && rank && (
              <div className="absolute top-2 left-2 z-10 bg-primary text-primary-foreground rounded-full w-7 h-7 flex items-center justify-center font-bold text-sm shadow">
                {rank}
              </div>
            )}
            {story.cover_url ? (
              <Image
                src={`${story.cover_url}?t=${imageTimestamp}`}
                alt={story.title}
                fill
                sizes="(max-width: 640px) 180px, 200px"
                className="object-cover group-hover:scale-105 transition-transform duration-300"
                loading="lazy"
                unoptimized
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/30 to-primary/10">
                <BookOpen className="w-10 h-10 text-primary/40" />
              </div>
            )}

            {/* Sentiment badge — overlaid bottom-right on cover */}
            {showBadge && badgeText && (
              <span className={`absolute bottom-2 right-2 z-10 bg-black/70 rounded-full px-2 py-0.5 text-xs font-semibold ${badgeColour}`}>
                {badgeText}
              </span>
            )}
          </div>

          {/* Content */}
          <div className="p-3 flex flex-col gap-1.5">

            {/* Title — 2 lines, fixed height */}
            <h3 className="font-semibold text-base line-clamp-2 leading-tight group-hover:text-primary transition-colors min-h-[3rem]">
              {story.title}
            </h3>

            {/* Author — 1 line, fixed height */}
            <p className="text-sm text-muted-foreground truncate min-h-[1.25rem]">
              {authorName ? `by ${authorName}` : ''}
            </p>

            {/* Tagline — 2 lines reserved, no truncation for ≤60 chars */}
            <p className="text-sm text-muted-foreground line-clamp-2 leading-snug min-h-[2.5rem]">
              {story.tagline ?? ''}
            </p>

            {/* Genre tags — 2 rows reserved */}
            <div className="flex flex-wrap gap-1.5 content-start min-h-[3.5rem]">
              {story.primary_genre && (
                <span className={`${genreColour} text-white text-xs font-medium px-2 py-0.5 rounded-full capitalize`}>
                  {story.primary_genre.replace(/-/g, ' ')}
                </span>
              )}
              {story.subgenres?.map(sg => (
                <span key={sg} className="border border-border text-muted-foreground text-xs px-2 py-0.5 rounded-full capitalize">
                  {sg.replace(/-/g, ' ')}
                </span>
              ))}
            </div>

            {/* Stats row — chapters, words, followers */}
            <div className="flex items-center gap-2 text-xs text-muted-foreground pt-2 border-t min-h-[1.25rem]">
              <span className="flex items-center gap-0.5" title="Chapters">
                <BookOpen className="w-3.5 h-3.5" />
                {story.chapter_count ?? 0}
              </span>
              <span className="flex items-center gap-0.5" title="Words">
                <FileText className="w-3.5 h-3.5" />
                {formatWords(story.word_count)}
              </span>
              <span className="flex items-center gap-0.5" title="Followers">
                <Users className="w-3.5 h-3.5" />
                {formatNumber(story.follower_count)}
              </span>
            </div>

          </div>
        </div>
      </Link>
    </div>
  )
}

// Skeleton for loading state
export function StoryCardCompactSkeleton() {
  return (
    <div className="w-[180px] sm:w-[200px] bg-card border rounded-lg overflow-hidden shadow-sm">
      <div className="w-full aspect-[3/4] bg-muted animate-pulse" />
      <div className="p-3 flex flex-col gap-1.5">
        <div className="min-h-[3rem] space-y-1">
          <div className="h-4 bg-muted rounded animate-pulse w-full" />
          <div className="h-4 bg-muted rounded animate-pulse w-3/4" />
        </div>
        <div className="h-4 bg-muted rounded animate-pulse w-1/2 min-h-[1.25rem]" />
        <div className="min-h-[2.5rem] space-y-1">
          <div className="h-3 bg-muted rounded animate-pulse w-full" />
          <div className="h-3 bg-muted rounded animate-pulse w-2/3" />
        </div>
        <div className="flex gap-1.5 min-h-[3.5rem] content-start flex-wrap">
          <div className="h-5 w-16 bg-muted rounded-full animate-pulse" />
          <div className="h-5 w-12 bg-muted rounded-full animate-pulse" />
        </div>
        <div className="flex gap-2 pt-2 border-t min-h-[1.25rem]">
          <div className="h-3 w-6 bg-muted rounded animate-pulse" />
          <div className="h-3 w-8 bg-muted rounded animate-pulse" />
          <div className="h-3 w-6 bg-muted rounded animate-pulse" />
        </div>
      </div>
    </div>
  )
}
