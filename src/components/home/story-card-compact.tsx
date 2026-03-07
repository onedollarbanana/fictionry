'use client'

import Link from 'next/link'
import Image from 'next/image'
import { BookOpen, Eye, Heart, Users } from 'lucide-react'
import { getStoryUrl } from "@/lib/url-utils";
import { useImpressionLogger } from "@/hooks/useImpressionLogger";

interface StoryCardCompactProps {
  story: {
    id: string
    slug?: string | null;
    short_id?: string | null;
    title: string
    blurb?: string | null
    tagline?: string | null
    cover_url?: string | null
    primary_genre?: string | null
    subgenres?: string[] | null
    tags?: string[] | null
    chapter_count?: number | null
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

  // Use updated_at for cache busting, fallback to a stable value
  const imageTimestamp = story.updated_at 
    ? new Date(story.updated_at).getTime() 
    : 'v1'

  return (
    <div ref={cardRef as React.RefObject<HTMLDivElement>} className="flex-shrink-0 w-[180px] sm:w-[200px]">
    <Link href={getStoryUrl(story)} className="block group h-full">
      <div className="bg-card border rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow h-full flex flex-col">
        {/* Cover Image */}
        <div className="relative w-full aspect-[2/3] overflow-hidden bg-muted">
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
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5">
              <BookOpen className="w-10 h-10 text-primary/40" />
            </div>
          )}
        </div>
        
        {/* Content Section */}
        <div className="p-3 flex-1 flex flex-col gap-2">
          {/* Title & Author - Title gets 2 lines */}
          <div>
            <h3 className="font-semibold text-sm line-clamp-2 leading-tight group-hover:text-primary transition-colors min-h-[2.5rem]">
              {story.title}
            </h3>
            {(story.author || story.profiles) && (
              <p className="text-muted-foreground text-xs mt-0.5 truncate">
                by {story.author?.display_name || story.author?.username || story.profiles?.display_name || story.profiles?.username}
              </p>
            )}
          </div>
          
          {/* Tagline */}
          {story.tagline && (
            <p className="text-xs text-muted-foreground line-clamp-2 leading-snug">
              {story.tagline}
            </p>
          )}
          
          {/* Genres & Tags */}
          {(story.primary_genre || story.tags?.length) ? (
            <div className="flex flex-wrap gap-1">
              {story.primary_genre && (
                <span className="text-[10px] bg-primary/15 text-primary px-1.5 py-0.5 rounded font-medium capitalize">
                  {story.primary_genre.replace(/-/g, ' ')}
                </span>
              )}
              {/* First subgenre */}
              {story.subgenres?.[0] && (
                <span className="text-[10px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded capitalize">
                  {story.subgenres[0].replace(/-/g, ' ')}
                </span>
              )}
              {/* Tags — only if no subgenres to keep compact */}
              {!story.subgenres?.length && story.tags?.slice(0, 1).map(tag => (
                <span key={tag} className="text-[10px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded">
                  {tag}
                </span>
              ))}
            </div>
          ) : null}
          
          {/* Stats Row */}
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-auto pt-2 border-t">
            <span className="flex items-center gap-0.5" title="Chapters">
              <BookOpen className="w-3 h-3" />
              {story.chapter_count ?? 0}
            </span>
            <span className="flex items-center gap-0.5" title="Views">
              <Eye className="w-3 h-3" />
              {formatNumber(story.total_views)}
            </span>
            <span className="flex items-center gap-0.5" title="Likes">
              <Heart className="w-3 h-3" />
              {formatNumber(story.total_likes)}
            </span>
            <span className="flex items-center gap-0.5" title="Followers">
              <Users className="w-3 h-3" />
              {formatNumber(story.follower_count)}
            </span>
            {/* Rating - shown if established sentiment exists */}
            {story.rating_confidence && story.rating_confidence !== 'not_yet_rated' && story.rating_sentiment && (
              <span className="ml-auto text-amber-600 dark:text-amber-400 font-medium text-xs" title={`${story.rating_count || 0} ratings`}>
                {story.rating_sentiment.replace('_', ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())}
              </span>
            )}
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
    <div className="w-[180px] sm:w-[200px] bg-card border rounded-lg overflow-hidden">
      <div className="w-full aspect-[2/3] bg-muted animate-pulse" />
      <div className="p-3 space-y-2">
        <div className="h-4 bg-muted rounded animate-pulse w-3/4" />
        <div className="h-4 bg-muted rounded animate-pulse w-1/2" />
        <div className="h-3 bg-muted rounded animate-pulse w-full" />
        <div className="flex gap-1 pt-1">
          <div className="h-4 w-12 bg-muted rounded animate-pulse" />
          <div className="h-4 w-10 bg-muted rounded animate-pulse" />
        </div>
        <div className="flex gap-2 pt-2 border-t">
          <div className="h-3 w-6 bg-muted rounded animate-pulse" />
          <div className="h-3 w-6 bg-muted rounded animate-pulse" />
          <div className="h-3 w-6 bg-muted rounded animate-pulse" />
        </div>
      </div>
    </div>
  )
}
