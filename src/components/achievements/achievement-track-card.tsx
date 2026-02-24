'use client'

import { cn } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Check } from 'lucide-react'
import type { AchievementTrack, UserStatsMap } from './types'
import { formatTrackName, getStatForTrack, getNextMilestone, isInverseTrack } from '@/lib/achievements'

const categoryColors: Record<string, { bg: string; text: string; ring: string }> = {
  reading: { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-300', ring: 'ring-blue-300 dark:ring-blue-700' },
  writing: { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-300', ring: 'ring-green-300 dark:ring-green-700' },
  social: { bg: 'bg-purple-100 dark:bg-purple-900/30', text: 'text-purple-700 dark:text-purple-300', ring: 'ring-purple-300 dark:ring-purple-700' },
  popularity: { bg: 'bg-pink-100 dark:bg-pink-900/30', text: 'text-pink-700 dark:text-pink-300', ring: 'ring-pink-300 dark:ring-pink-700' },
  rankings: { bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-700 dark:text-amber-300', ring: 'ring-amber-300 dark:ring-amber-700' },
  special: { bg: 'bg-cyan-100 dark:bg-cyan-900/30', text: 'text-cyan-700 dark:text-cyan-300', ring: 'ring-cyan-300 dark:ring-cyan-700' },
}

interface AchievementTrackCardProps {
  track: AchievementTrack
  userStats: UserStatsMap | null
  className?: string
}

export function AchievementTrackCard({ track, userStats, className }: AchievementTrackCardProps) {
  const colors = categoryColors[track.category] || categoryColors.reading
  const unlockedIds = new Set(track.userProgress.map(ua => ua.achievementId))
  const allComplete = track.milestones.every(m => unlockedIds.has(m.id))
  const nextMilestone = getNextMilestone(track)

  const currentValue = getStatForTrack(track.trackId, userStats)
  const inverse = isInverseTrack(track.trackId)

  // Progress calculation for the bar
  let progressPercent = 0
  let progressLabel = ''

  if (allComplete) {
    progressPercent = 100
    progressLabel = '✅ Complete!'
  } else if (nextMilestone && currentValue !== undefined) {
    if (inverse) {
      // For rankings: threshold means "reach rank X or better" (lower is better)
      // If currentValue is 0 the user hasn't ranked yet
      if (currentValue === 0) {
        progressPercent = 0
        progressLabel = `Unranked / Top ${nextMilestone.thresholdValue}`
      } else {
        progressPercent = currentValue <= nextMilestone.thresholdValue
          ? 100
          : Math.max(0, Math.round((1 - (currentValue - nextMilestone.thresholdValue) / currentValue) * 100))
        progressLabel = `Rank ${currentValue} / Top ${nextMilestone.thresholdValue}`
      }
    } else {
      progressPercent = nextMilestone.thresholdValue > 0
        ? Math.min(100, Math.round((currentValue / nextMilestone.thresholdValue) * 100))
        : 0
      progressLabel = `${currentValue.toLocaleString()} / ${nextMilestone.thresholdValue.toLocaleString()}`
    }
  } else if (nextMilestone) {
    progressLabel = `? / ${nextMilestone.thresholdValue.toLocaleString()}`
  }

  const totalXp = track.milestones.reduce((s, m) => s + m.xpReward, 0)
  const earnedXp = track.milestones
    .filter(m => unlockedIds.has(m.id))
    .reduce((s, m) => s + m.xpReward, 0)

  return (
    <Card
      className={cn(
        'relative overflow-hidden transition-all',
        allComplete
          ? 'border-yellow-400 dark:border-yellow-600 bg-gradient-to-br from-yellow-50/50 to-amber-50/50 dark:from-yellow-900/10 dark:to-amber-900/10'
          : 'border-muted',
        className,
      )}
    >
      <CardContent className="p-4">
        {/* Header row */}
        <div className="flex items-start gap-3 mb-3">
          <div
            className={cn(
              'text-2xl h-10 w-10 flex items-center justify-center rounded-lg shrink-0',
              allComplete ? 'bg-yellow-100 dark:bg-yellow-900/30' : colors.bg,
            )}
          >
            {track.icon || '🏆'}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-semibold text-sm truncate">
                {formatTrackName(track.trackId)}
              </h3>
              <Badge
                variant="secondary"
                className={cn('text-xs shrink-0', colors.bg, colors.text)}
              >
                {track.category}
              </Badge>
            </div>

            {/* Progress info */}
            {!allComplete && progressLabel && (
              <p className="text-xs text-muted-foreground mt-0.5">{progressLabel}</p>
            )}
            {allComplete && (
              <p className="text-xs font-medium text-yellow-600 dark:text-yellow-400 mt-0.5">
                ✅ Complete! — {earnedXp.toLocaleString()} XP earned
              </p>
            )}
          </div>
        </div>

        {/* Progress bar */}
        {!allComplete && (
          <div className="mb-3">
            <Progress value={progressPercent} className="h-1.5" />
          </div>
        )}

        {/* Milestone badges row */}
        <TooltipProvider delayDuration={200}>
          <div className="flex flex-wrap gap-1.5">
            {track.milestones.map(m => {
              const unlocked = unlockedIds.has(m.id)
              return (
                <Tooltip key={m.id}>
                  <TooltipTrigger asChild>
                    <div
                      className={cn(
                        'h-7 w-7 rounded-full flex items-center justify-center text-sm border transition-all',
                        unlocked
                          ? cn('border-transparent', colors.bg)
                          : 'bg-muted/60 dark:bg-muted/30 border-muted-foreground/20 grayscale opacity-60',
                      )}
                    >
                      {unlocked ? (
                        m.icon || <Check className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          {m.milestoneLevel ?? '?'}
                        </span>
                      )}
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-[200px]">
                    <p className="text-xs font-medium">{m.description}</p>
                    <p className="text-xs text-muted-foreground">
                      {unlocked ? '✅ Unlocked' : `Requires ${m.thresholdValue.toLocaleString()}`} · +{m.xpReward} XP
                    </p>
                  </TooltipContent>
                </Tooltip>
              )
            })}
          </div>
        </TooltipProvider>

        {/* XP summary */}
        <p className="text-xs text-muted-foreground mt-2">
          {earnedXp.toLocaleString()} / {totalXp.toLocaleString()} XP
          {' · '}
          {track.userProgress.length}/{track.milestones.length} milestones
        </p>
      </CardContent>
    </Card>
  )
}
