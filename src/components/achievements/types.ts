// Achievement types for new track-based system

export type AchievementCategory = 'reading' | 'writing' | 'social' | 'popularity' | 'rankings' | 'special'
export type AchievementTrackType = 'progressive' | 'one_time'

export interface AchievementDefinition {
  id: string
  trackId: string
  trackType: AchievementTrackType
  category: AchievementCategory
  description: string
  milestoneLevel: number | null
  thresholdValue: number
  xpReward: number
  icon: string | null
}

export interface UserAchievement {
  id: string
  achievementId: string
  unlockedAt: string
  achievement: AchievementDefinition
}

// For grouping progressive achievements into tracks
export interface AchievementTrack {
  trackId: string
  trackType: AchievementTrackType
  category: AchievementCategory
  icon: string | null
  milestones: AchievementDefinition[]
  userProgress: UserAchievement[] // which milestones user has unlocked
}

// For profile preview
export interface AchievementPreview {
  id: string
  description: string
  icon: string | null
  category: AchievementCategory
}

// Featured badge from profile
export interface FeaturedBadge {
  achievementId: string
  displayOrder: number
  achievement: AchievementDefinition
}

// ---------------------------------------------------------------------------
// NEW Phase 5 types
// ---------------------------------------------------------------------------

/** Stats returned by `get_user_stats_full()` as a flat JSONB object */
export type UserStatsMap = Record<string, number>

/** Streak information derived from UserStatsMap */
export interface StreakInfo {
  readingCurrent: number
  readingLongest: number
  publishingCurrent: number
  publishingLongest: number
}
