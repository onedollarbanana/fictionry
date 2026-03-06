"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { BookOpen, Eye, Heart, BookMarked, Clock, ChevronDown, ChevronUp, EyeOff } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { getStoryUrl } from "@/lib/url-utils";
import { useImpressionLogger } from "@/hooks/useImpressionLogger";

export interface StoryCardData {
  id: string;
  slug?: string | null;
  short_id?: string | null;
  title: string;
  tagline?: string | null;
  blurb?: string | null;
  cover_url?: string | null;
  // Taxonomy v3
  primary_genre?: string | null;
  subgenres?: string[];
  content_rating?: string | null;
  // Legacy (kept for compat during migration)
  genres?: string[];
  tags?: string[];
  status?: string;
  total_views?: number | null;
  follower_count?: number | null;
  chapter_count?: number | null;
  word_count?: number | null;
  // Rating — use sentiment system; rating_average kept for internal/legacy use only
  rating_average?: number | null;
  rating_count?: number | null;
  rating_sentiment?: string | null;
  rating_confidence?: string | null;
  communityPickMonth?: string | null;
  updated_at?: string;
  created_at?: string;
  author?: {
    username?: string;
    display_name?: string | null;
  } | null;
  profiles?: {
    username: string;
    display_name?: string | null;
  } | null;
}

interface StoryCardProps {
  story: StoryCardData;
  /** Card layout orientation */
  variant?: "vertical" | "horizontal";
  /** Size preset */
  size?: "sm" | "md" | "lg";
  /** Show reading progress bar */
  showProgress?: boolean;
  progress?: { chapter_number: number; total_chapters: number };
  /** Link destination (defaults to /story/[id]) */
  href?: string;
  /** Additional className */
  className?: string;
  /** Show expand/collapse toggle for full details (horizontal only) */
  expandable?: boolean;
  /** Render children at card bottom (e.g., action buttons) */
  children?: React.ReactNode;
  /** Hide author name in display */
  hideAuthor?: boolean;
  /** Rank number to display inside card */
  rank?: number;
  /** Discovery surface for impression tracking (omit to skip tracking) */
  surface?: string;
  /** Logged-in user id — enables the Hide Story button */
  userId?: string | null;
}

// Genre gradient fallbacks keyed by primary_genre slug
const genreGradients: Record<string, string> = {
  "fantasy": "from-purple-600/30 to-purple-900/50",
  "science-fiction": "from-cyan-600/30 to-cyan-900/50",
  "romance": "from-pink-600/30 to-pink-900/50",
  "thriller-mystery": "from-slate-600/30 to-slate-900/50",
  "horror": "from-red-800/30 to-red-950/50",
  "action-adventure": "from-orange-600/30 to-orange-900/50",
  "historical-fiction": "from-amber-600/30 to-amber-900/50",
  "contemporary-fiction": "from-blue-600/30 to-blue-900/50",
  "comedy-satire": "from-yellow-600/30 to-yellow-900/50",
  "literary-fiction": "from-indigo-600/30 to-indigo-900/50",
  "paranormal-supernatural": "from-violet-600/30 to-violet-900/50",
  "non-fiction-essay": "from-stone-600/30 to-stone-900/50",
  "fan-fiction": "from-emerald-600/30 to-emerald-900/50",
};

const statusColors: Record<string, string> = {
  ongoing: "bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200",
  completed: "bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200",
  hiatus: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-200",
};

function formatNumber(num: number): string {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
}

function getAuthorName(story: StoryCardData): string {
  if (story.author?.display_name) return story.author.display_name;
  if (story.author?.username) return story.author.username;
  if (story.profiles?.display_name) return story.profiles.display_name;
  if (story.profiles?.username) return story.profiles.username;
  return "Unknown";
}

function getAuthorUsername(story: StoryCardData): string | null {
  return story.author?.username || story.profiles?.username || null;
}

const SENTIMENT_SHORT: Record<string, string> = {
  excellent: 'Excellent',
  very_good: 'Very Good',
  positive: 'Positive',
  mixed: 'Mixed',
  divisive: 'Divisive',
  cool_reception: 'Cool Reception',
};

// Sentiment-based rating display for story cards
function RatingDisplay({ sentiment, confidence, count }: {
  sentiment?: string | null;
  confidence?: string | null;
  count?: number | null;
}) {
  if (!confidence || confidence === 'not_yet_rated' || !count || count === 0) return null;

  const label = sentiment ? SENTIMENT_SHORT[sentiment] : null;
  const isEarly = confidence === 'early_feedback';

  // Early feedback: just show count, no sentiment label yet
  if (isEarly) {
    return (
      <span className="text-xs text-zinc-400 dark:text-zinc-500" title={`${count} rating${count !== 1 ? 's' : ''} — early feedback`}>
        {count} rating{count !== 1 ? 's' : ''}
      </span>
    );
  }

  if (!label) return null;

  return (
    <span
      className="text-xs font-medium text-amber-600 dark:text-amber-400"
      title={`${count} rating${count !== 1 ? 's' : ''}`}
    >
      {label} · {count}
    </span>
  );
}

export function StoryCard({
  story,
  variant = "vertical",
  size = "md",
  showProgress = false,
  progress,
  href,
  className,
  children,
  hideAuthor = false,
  expandable = false,
  rank,
  surface,
  userId,
}: StoryCardProps) {
  const primaryGenreSlug = story.primary_genre || story.genres?.[0] || "fantasy";
  const gradientClass = genreGradients[primaryGenreSlug] || "from-purple-600/30 to-purple-900/50";
  const linkHref = href || getStoryUrl(story);
  const authorUsername = getAuthorUsername(story);
  const [expanded, setExpanded] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [hiding, setHiding] = useState(false);

  // Impression tracking — only active when a surface is provided
  const cardRef = useImpressionLogger(story.id, surface ?? '');

  async function handleHide() {
    if (hiding) return;
    setHiding(true);
    try {
      await fetch('/api/story-hides', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ story_id: story.id }),
      });
      setHidden(true);
    } catch {
      // silent fail
    } finally {
      setHiding(false);
    }
  }

  if (hidden) return null;

  // Use updated_at for cache busting, fallback to stable value
  const imageTimestamp = story.updated_at 
    ? new Date(story.updated_at).getTime() 
    : 'v1';

  // Size-based dimensions
  const sizeConfig = {
    sm: { width: "w-[140px]", coverHeight: "aspect-[2/3]", titleSize: "text-sm", spacing: "gap-1" },
    md: { width: "w-[180px]", coverHeight: "aspect-[2/3]", titleSize: "text-base", spacing: "gap-2" },
    lg: { width: "w-[220px]", coverHeight: "aspect-[2/3]", titleSize: "text-lg", spacing: "gap-3" },
  };

  const config = sizeConfig[size];

  if (variant === "horizontal") {
    return (
      <div
        ref={cardRef as React.RefObject<HTMLDivElement>}
        className={cn(
          "flex gap-4 p-4 border rounded-lg bg-card hover:bg-muted/50 transition-colors",
          className
        )}
      >
        {/* Cover */}
        <Link href={linkHref} className="shrink-0">
          {story.cover_url ? (
            <div className="relative w-24 md:w-28 aspect-[2/3]">
              <Image
                src={`${story.cover_url}?t=${imageTimestamp}`}
                alt={`Cover for ${story.title}`}
                fill
                sizes="112px"
                className="object-cover rounded"
                loading="lazy"
              />
            </div>
          ) : (
            <div className={cn(
              "w-24 md:w-28 aspect-[2/3] rounded flex items-center justify-center bg-gradient-to-br",
              gradientClass
            )}>
              <BookOpen className="h-6 w-6 text-white/40" />
            </div>
          )}
        </Link>

        {/* Content */}
        <div className="flex-1 min-w-0 break-words">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <Link href={linkHref}>
                <h3 className="font-semibold text-lg md:text-xl hover:text-primary transition-colors line-clamp-2">
                  {story.title}
                </h3>
              </Link>
              
              {!hideAuthor && (authorUsername ? (
                <Link 
                  href={`/profile/${authorUsername}`}
                  className="text-sm md:text-base text-muted-foreground hover:text-primary transition-colors"
                >
                  by {getAuthorName(story)}
                </Link>
              ) : (
                <p className="text-sm md:text-base text-muted-foreground">by {getAuthorName(story)}</p>
              ))}
            </div>

            {/* Status + Rank + Hide column */}
            <div className="flex flex-col items-end gap-1 shrink-0">
              {story.status && (
                <span className={cn(
                  "px-2 py-0.5 rounded text-xs font-medium",
                  statusColors[story.status] || statusColors.ongoing
                )}>
                  {story.status.charAt(0).toUpperCase() + story.status.slice(1)}
                </span>
              )}
              {rank != null && (
                <span className="text-2xl md:text-3xl font-bold text-primary/70">
                  #{rank}
                </span>
              )}
              {userId && (
                <button
                  onClick={handleHide}
                  disabled={hiding}
                  title="Hide this story"
                  className="mt-1 p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                >
                  <EyeOff className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          {/* Tagline */}
          {story.tagline && (
            <p className={`text-sm md:text-base font-medium text-primary/80 mt-1 break-words ${expandable && expanded ? "" : "line-clamp-1"}`}>
              {story.tagline}
            </p>
          )}

          {/* Blurb */}
          {story.blurb && (
            <p className={`text-sm md:text-base text-muted-foreground mt-1 whitespace-pre-line break-words ${expandable && expanded ? "" : "line-clamp-2"}`}>
              {story.blurb}
            </p>
          )}

          {/* Genre + Subgenres */}
          {(story.primary_genre || (story.subgenres && story.subgenres.length > 0)) && (
            <div className="flex flex-wrap gap-1 mt-2">
              {story.primary_genre && (
                <Badge variant="secondary" className="text-xs capitalize">
                  {story.primary_genre.replace(/-/g, ' ')}
                </Badge>
              )}
              {(expandable && expanded
                ? story.subgenres
                : story.subgenres?.slice(0, 2)
              )?.map((sub) => (
                <Badge key={sub} variant="outline" className="text-xs capitalize">
                  {sub.replace(/-/g, ' ')}
                </Badge>
              ))}
            </div>
          )}

          {/* Tags (shown when expanded) */}
          {expandable && expanded && story.tags && story.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1">
              {story.tags.map((tag) => (
                <Badge key={tag} variant="outline" className="text-xs">
                  #{tag}
                </Badge>
              ))}
            </div>
          )}

          {/* Stats row */}
          <div className="flex flex-wrap items-center gap-3 mt-2 text-xs md:text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <BookMarked className="h-3 w-3" />
              {story.chapter_count || 0} ch
            </span>
            <span className="flex items-center gap-1">
              <Eye className="h-3 w-3" />
              {formatNumber(story.total_views ?? 0)}
            </span>
            <span className="flex items-center gap-1">
              <Heart className="h-3 w-3" />
              {formatNumber(story.follower_count ?? 0)}
            </span>
            <RatingDisplay sentiment={story.rating_sentiment} confidence={story.rating_confidence} count={story.rating_count} />
            {story.updated_at && (
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {formatDistanceToNow(new Date(story.updated_at), { addSuffix: true })}
              </span>
            )}
          </div>

          {/* Expand/Collapse toggle */}
          {expandable && (
            <button
              type="button"
              onClick={() => setExpanded(!expanded)}
              className="inline-flex items-center gap-1 mt-2 px-3 py-1.5 text-xs md:text-sm font-medium text-primary bg-primary/10 hover:bg-primary/20 rounded-full transition-colors"
            >
              {expanded ? (
                <>Show less <ChevronUp className="h-3.5 w-3.5" /></>
              ) : (
                <>Show more <ChevronDown className="h-3.5 w-3.5" /></>
              )}
            </button>
          )}

          {/* Optional action buttons slot */}
          {children && <div className="mt-3">{children}</div>}
        </div>
      </div>
    );
  }

  // Vertical variant (default)
  return (
    <div
      ref={cardRef as React.RefObject<HTMLDivElement>}
      className={cn("relative flex-shrink-0 group", config.width, className)}
    >
    {/* Hide button — visible on card hover, shown only to logged-in users */}
    {userId && (
      <button
        onClick={handleHide}
        disabled={hiding}
        title="Hide this story"
        className="absolute top-2 left-2 z-10 p-1 rounded bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity text-white hover:bg-black/90 focus:opacity-100"
      >
        <EyeOff className="h-3.5 w-3.5" />
      </button>
    )}
    <Link
      href={linkHref}
      className="block"
    >
      <div className="relative overflow-hidden rounded-lg transition-all duration-200 group-hover:scale-[1.02] group-hover:shadow-lg">
        {/* Cover Image */}
        <div className={cn("relative overflow-hidden rounded-lg bg-muted", config.coverHeight)}>
          {story.cover_url ? (
            <Image
              src={`${story.cover_url}?t=${imageTimestamp}`}
              alt={`Cover for ${story.title}`}
              fill
              sizes="(max-width: 640px) 140px, 180px"
              className="object-cover"
              loading="lazy"
            />
          ) : (
            <div className={cn(
              "w-full h-full flex items-center justify-center bg-gradient-to-br",
              gradientClass
            )}>
              <BookOpen className="h-10 w-10 text-white/40" />
            </div>
          )}

          {/* Hover overlay */}
          <div className="absolute inset-0 bg-black/75 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col justify-end p-3">
            {/* Primary genre + first subgenre on hover */}
            {(story.primary_genre || (story.subgenres && story.subgenres.length > 0)) && (
              <div className="flex flex-wrap gap-1 mb-2">
                {story.primary_genre && (
                  <span className="px-2 py-0.5 bg-white/20 rounded text-xs text-white capitalize">
                    {story.primary_genre.replace(/-/g, ' ')}
                  </span>
                )}
                {story.subgenres?.[0] && (
                  <span className="px-2 py-0.5 bg-white/10 rounded text-xs text-white/80 capitalize">
                    {story.subgenres[0].replace(/-/g, ' ')}
                  </span>
                )}
              </div>
            )}
            
            {/* Tags on hover */}
            {story.tags && story.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-2">
                {story.tags.slice(0, 3).map((tag) => (
                  <span
                    key={tag}
                    className="px-1.5 py-0.5 bg-primary/30 rounded text-xs text-white/90"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}

            {/* Stats on hover */}
            <div className="flex items-center gap-2 text-xs text-white/80">
              <span className="flex items-center gap-1">
                <Heart className="h-3 w-3" />
                {formatNumber(story.follower_count ?? 0)}
              </span>
              <span className="flex items-center gap-1">
                <Eye className="h-3 w-3" />
                {formatNumber(story.total_views ?? 0)}
              </span>
              <span className="flex items-center gap-1">
                <BookMarked className="h-3 w-3" />
                {story.chapter_count || 0}
              </span>
              {story.rating_sentiment && story.rating_confidence && story.rating_confidence !== 'not_yet_rated' && story.rating_confidence !== 'early_feedback' && (
                <span className="text-amber-400 text-xs font-medium">
                  {SENTIMENT_SHORT[story.rating_sentiment] ?? story.rating_sentiment}
                </span>
              )}
            </div>
          </div>

          {/* Progress bar */}
          {showProgress && progress && progress.total_chapters > 0 && (
            <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-black/50">
              <div
                className="h-full bg-primary transition-all"
                style={{
                  width: `${Math.min(100, (progress.chapter_number / progress.total_chapters) * 100)}%`,
                }}
              />
            </div>
          )}

          {/* Status badge */}
          {story.status && story.status !== "ongoing" && (
            <div className="absolute top-2 right-2">
              <span className={cn(
                "px-1.5 py-0.5 rounded text-xs font-medium",
                statusColors[story.status] || statusColors.ongoing
              )}>
                {story.status.charAt(0).toUpperCase() + story.status.slice(1)}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Text content below cover */}
      <div className={cn("mt-2 px-1", config.spacing)}>
        <h3 className={cn(
          "font-medium line-clamp-2 group-hover:text-primary transition-colors min-h-[2.5em]",
          config.titleSize
        )}>
          {story.title}
        </h3>
        
        {/* Tagline (if present, shown prominently) */}
        {story.tagline && (
          <p className="text-xs text-primary/70 font-medium line-clamp-2 mt-0.5">
            {story.tagline}
          </p>
        )}

        {!hideAuthor && (
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
            by {getAuthorName(story)}
          </p>
        )}

        {/* Visible stats (non-hover) for medium and large */}
        {size !== "sm" && (
          <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
            <span className="flex items-center gap-0.5">
              <Heart className="h-3 w-3" />
              {formatNumber(story.follower_count ?? 0)}
            </span>
            <span className="flex items-center gap-0.5">
              <BookMarked className="h-3 w-3" />
              {story.chapter_count || 0}
            </span>
            <RatingDisplay sentiment={story.rating_sentiment} confidence={story.rating_confidence} count={story.rating_count} />
          </div>
        )}
      </div>
    </Link>
    </div>
  );
}
