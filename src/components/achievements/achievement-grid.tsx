'use client'

import { useMemo } from 'react'
import { AchievementCard } from './achievement-card'
import { AchievementTrackCard } from './achievement-track-card'
import type { AchievementDefinition, UserAchievement, AchievementCategory, UserStatsMap } from './types'
import { groupAchievementsByTrack, filterTracksByCategory, getStatForTrack } from '@/lib/achievements'

interface AchievementGridProps {
  achievements: AchievementDefinition[]
  userAchievements: UserAchievement[]
  userStats?: UserStatsMap | null
  category?: AchievementCategory | 'all'
  showLocked?: boolean
  className?: string
}

export function AchievementGrid({
  achievements,
  userAchievements,
  userStats,
  category = 'all',
  showLocked = true,
  className,
}: AchievementGridProps) {
  const unlockedMap = useMemo(() => {
    const map = new Map<string, UserAchievement>()
    userAchievements.forEach(ua => map.set(ua.achievementId, ua))
    return map
  }, [userAchievements])

  const tracks = useMemo(
    () => groupAchievementsByTrack(achievements, userAchievements),
    [achievements, userAchievements],
  )

  const filtered = useMemo(
    () => filterTracksByCategory(tracks, category),
    [tracks, category],
  )

  // Separate progressive vs one-time
  const progressiveTracks = useMemo(
    () => filtered.filter(t => t.trackType === 'progressive'),
    [filtered],
  )
  const oneTimeTracks = useMemo(
    () => filtered.filter(t => t.trackType === 'one_time'),
    [filtered],
  )

  // For one-time: flatten milestones into individual achievements
  const oneTimeAchievements = useMemo(() => {
    const items = oneTimeTracks.flatMap(t => t.milestones)
    if (!showLocked) {
      return items.filter(a => unlockedMap.has(a.id))
    }
    // Sort: unlocked first
    return items.sort((a, b) => {
      const aUnlocked = unlockedMap.has(a.id) ? 0 : 1
      const bUnlocked = unlockedMap.has(b.id) ? 0 : 1
      return aUnlocked - bUnlocked
    })
  }, [oneTimeTracks, showLocked, unlockedMap])

  // Sort progressive: completed last, then by unlock progress
  const sortedProgressiveTracks = useMemo(() => {
    return [...progressiveTracks].sort((a, b) => {
      const aComplete = a.milestones.every(m => unlockedMap.has(m.id)) ? 1 : 0
      const bComplete = b.milestones.every(m => unlockedMap.has(m.id)) ? 1 : 0
      if (aComplete !== bComplete) return aComplete - bComplete
      // More progress first
      return b.userProgress.length - a.userProgress.length
    })
  }, [progressiveTracks, unlockedMap])

  if (filtered.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No achievements to display
      </div>
    )
  }

  return (
    <div className={className}>
      {/* Progressive tracks */}
      {sortedProgressiveTracks.length > 0 && (
        <div className="mb-6">
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-3">
            Progressive Tracks
          </h3>
          <div className="grid gap-3 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            {sortedProgressiveTracks.map(track => (
              <AchievementTrackCard
                key={track.trackId}
                track={track}
                userStats={userStats ?? null}
              />
            ))}
          </div>
        </div>
      )}

      {/* One-time achievements */}
      {oneTimeAchievements.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-3">
            One-Time Achievements
          </h3>
          <div className="grid gap-3 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            {oneTimeAchievements.map(achievement => (
              <AchievementCard
                key={achievement.id}
                achievement={achievement}
                userAchievement={unlockedMap.get(achievement.id)}
                currentProgress={getStatForTrack(achievement.trackId, userStats ?? null) ?? undefined}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
