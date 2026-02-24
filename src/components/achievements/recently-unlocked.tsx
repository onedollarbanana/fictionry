'use client'

import { cn } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/card'
import { formatDistanceToNow } from 'date-fns'
import type { UserAchievement } from './types'

interface RecentlyUnlockedProps {
  achievements: UserAchievement[]
  className?: string
}

export function RecentlyUnlocked({ achievements, className }: RecentlyUnlockedProps) {
  if (achievements.length === 0) return null

  return (
    <div className={className}>
      <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
        🎉 Recently Unlocked
      </h2>
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin">
        {achievements.map(ua => (
          <Card
            key={ua.id}
            className={cn(
              'shrink-0 w-52 border-green-200 dark:border-green-800',
              'bg-gradient-to-br from-green-50/60 to-emerald-50/40',
              'dark:from-green-900/15 dark:to-emerald-900/10',
            )}
          >
            <CardContent className="p-3">
              <div className="flex items-start gap-2">
                <span className="text-2xl shrink-0">{ua.achievement.icon || '🏆'}</span>
                <div className="min-w-0">
                  <p className="text-sm font-medium line-clamp-2 leading-tight">
                    {ua.achievement.description}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Unlocked {formatDistanceToNow(new Date(ua.unlockedAt), { addSuffix: true })}
                  </p>
                  <p className="text-xs text-green-600 dark:text-green-400 font-medium mt-0.5">
                    +{ua.achievement.xpReward} XP
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
