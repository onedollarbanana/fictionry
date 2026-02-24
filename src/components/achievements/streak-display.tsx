'use client'

import { cn } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/card'
import type { StreakInfo } from './types'

// ---------------------------------------------------------------------------
// Full streak card – used on the achievements page
// ---------------------------------------------------------------------------
interface StreakCardProps {
  streaks: StreakInfo
  className?: string
}

export function StreakCard({ streaks, className }: StreakCardProps) {
  const hasAny = streaks.readingCurrent > 0 || streaks.publishingCurrent > 0

  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardContent className="p-5">
        <h2 className="text-lg font-semibold mb-3">🔥 Streaks</h2>

        {!hasAny ? (
          <p className="text-sm text-muted-foreground">
            No active streaks — read or publish daily to start one!
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Reading streak */}
            {streaks.readingCurrent > 0 && (
              <div className="flex items-center gap-3 p-3 rounded-lg bg-orange-50 dark:bg-orange-900/15">
                <span className="text-3xl">🔥</span>
                <div>
                  <p className="font-bold text-xl leading-tight">
                    {streaks.readingCurrent} <span className="text-sm font-normal text-muted-foreground">day{streaks.readingCurrent !== 1 ? 's' : ''}</span>
                  </p>
                  <p className="text-xs text-muted-foreground">Reading streak</p>
                  {streaks.readingLongest > streaks.readingCurrent && (
                    <p className="text-xs text-muted-foreground">
                      Best: {streaks.readingLongest} days
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Publishing streak */}
            {streaks.publishingCurrent > 0 && (
              <div className="flex items-center gap-3 p-3 rounded-lg bg-blue-50 dark:bg-blue-900/15">
                <span className="text-3xl">✍️</span>
                <div>
                  <p className="font-bold text-xl leading-tight">
                    {streaks.publishingCurrent} <span className="text-sm font-normal text-muted-foreground">day{streaks.publishingCurrent !== 1 ? 's' : ''}</span>
                  </p>
                  <p className="text-xs text-muted-foreground">Publishing streak</p>
                  {streaks.publishingLongest > streaks.publishingCurrent && (
                    <p className="text-xs text-muted-foreground">
                      Best: {streaks.publishingLongest} days
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// Inline streak badges – used on the profile page
// ---------------------------------------------------------------------------
interface StreakInlineProps {
  streaks: StreakInfo
  className?: string
}

export function StreakInline({ streaks, className }: StreakInlineProps) {
  const parts: string[] = []
  if (streaks.readingCurrent > 0) {
    parts.push(`🔥 ${streaks.readingCurrent} day reading streak`)
  }
  if (streaks.publishingCurrent > 0) {
    parts.push(`✍️ ${streaks.publishingCurrent} day publishing streak`)
  }

  if (parts.length === 0) return null

  return (
    <div className={cn('flex flex-wrap items-center gap-3', className)}>
      {parts.map((text, i) => (
        <span
          key={i}
          className="inline-flex items-center gap-1 rounded-full bg-orange-50 dark:bg-orange-900/20 px-3 py-1 text-sm font-medium text-orange-700 dark:text-orange-300"
        >
          {text}
        </span>
      ))}
    </div>
  )
}
