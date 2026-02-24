// Achievement data helpers — pure functions, no "use client"
import type { AchievementDefinition, UserAchievement, AchievementTrack, AchievementCategory, UserStatsMap } from '@/components/achievements/types'

// ---------------------------------------------------------------------------
// Track ID → human-readable label
// ---------------------------------------------------------------------------
const TRACK_LABELS: Record<string, string> = {
  chapters_read: 'Chapters Read',
  genres_explored: 'Genres Explored',
  comments_posted: 'Comments Posted',
  likes_given: 'Likes Given',
  likes_received: 'Likes Received',
  library_size: 'Library Size',
  authors_followed: 'Authors Followed',
  followers_gained: 'Followers Gained',
  story_subscribers: 'Story Subscribers',
  chapters_published: 'Chapters Published',
  words_written: 'Words Written',
  stories_published: 'Stories Published',
  stories_completed: 'Stories Completed (Reader)',
  stories_completed_author: 'Stories Completed (Author)',
  story_views: 'Story Views',
  reviews_written: 'Reviews Written',
  ratings_received: 'Ratings Received',
  reading_streak: 'Reading Streak',
  publishing_streak: 'Publishing Streak',
  peak_rank: 'Peak Rank',
  rising_stars: 'Rising Stars',
  weeks_top_50: 'Weeks in Top 50',
  veteran_reader: 'Veteran Reader',
  loyal_reader: 'Loyal Reader',
  profile_completed: 'Profile Completed',
  premium_member: 'Premium Member',
  community_pick: 'Community Pick',
  first_chapter_read: 'First Chapter Read',
  first_5_chapters: 'First 5 Chapters',
  first_library_add: 'First Library Add',
  first_review: 'First Review',
  first_story_published: 'First Story Published',
  first_subscriber: 'First Subscriber',
  binge_reader: 'Binge Reader',
  genre_specialist: 'Genre Specialist',
  mega_reader: 'Mega Reader',
  average_rating: 'Average Rating',
}

export function formatTrackName(trackId: string): string {
  if (TRACK_LABELS[trackId]) return TRACK_LABELS[trackId]
  // Fallback: convert snake_case to Title Case
  return trackId
    .split('_')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

// ---------------------------------------------------------------------------
// TrackId → stat key mapping (for get_user_stats_full)
// ---------------------------------------------------------------------------
const TRACK_TO_STAT: Record<string, string> = {
  chapters_read: 'chapters_read',
  genres_explored: 'genres_explored',
  comments_posted: 'comments_posted',
  likes_given: 'likes_given',
  likes_received: 'likes_received',
  library_size: 'library_size',
  authors_followed: 'authors_followed',
  followers_gained: 'followers',
  story_subscribers: 'subscribers',
  chapters_published: 'chapters_published',
  words_written: 'words_written',
  stories_published: 'stories_published',
  stories_completed: 'stories_completed',
  stories_completed_author: 'stories_completed_author',
  story_views: 'story_views',
  reviews_written: 'reviews_written',
  ratings_received: 'ratings_received',
  reading_streak: 'reading_longest_streak',
  publishing_streak: 'publishing_longest_streak',
  peak_rank: 'peak_rank',
  rising_stars: 'rising_stars',
  weeks_top_50: 'weeks_top_50',
  veteran_reader: 'account_age_days',
  loyal_reader: 'account_age_days',
}

// Tracks where lower value is "better" (rankings)
const INVERSE_TRACKS = new Set(['peak_rank', 'rising_stars'])

export function getStatForTrack(trackId: string, stats: UserStatsMap | null): number | undefined {
  if (!stats) return undefined
  const key = TRACK_TO_STAT[trackId]
  if (!key) return undefined
  const val = stats[key]
  return typeof val === 'number' ? val : undefined
}

export function isInverseTrack(trackId: string): boolean {
  return INVERSE_TRACKS.has(trackId)
}

// ---------------------------------------------------------------------------
// Group achievements into tracks
// ---------------------------------------------------------------------------
export function groupAchievementsByTrack(
  allAchievements: AchievementDefinition[],
  userAchievements: UserAchievement[],
): AchievementTrack[] {
  const unlockedMap = new Map<string, UserAchievement>()
  userAchievements.forEach(ua => unlockedMap.set(ua.achievementId, ua))

  const trackMap = new Map<string, AchievementTrack>()

  for (const a of allAchievements) {
    const existing = trackMap.get(a.trackId)
    if (existing) {
      existing.milestones.push(a)
      const ua = unlockedMap.get(a.id)
      if (ua) existing.userProgress.push(ua)
    } else {
      const ua = unlockedMap.get(a.id)
      trackMap.set(a.trackId, {
        trackId: a.trackId,
        trackType: a.trackType,
        category: a.category,
        icon: a.icon,
        milestones: [a],
        userProgress: ua ? [ua] : [],
      })
    }
  }

  // Sort milestones within each track by milestoneLevel (or thresholdValue)
  const tracks = Array.from(trackMap.values())
  tracks.forEach(track => {
    track.milestones.sort((a: AchievementDefinition, b: AchievementDefinition) => (a.milestoneLevel ?? 0) - (b.milestoneLevel ?? 0))
  })

  return tracks
}

// ---------------------------------------------------------------------------
// Filter tracks by category
// ---------------------------------------------------------------------------
export function filterTracksByCategory(
  tracks: AchievementTrack[],
  category: AchievementCategory | 'all',
): AchievementTrack[] {
  if (category === 'all') return tracks
  return tracks.filter(t => t.category === category)
}

// ---------------------------------------------------------------------------
// Get next milestone for a progressive track
// ---------------------------------------------------------------------------
export function getNextMilestone(
  track: AchievementTrack,
): AchievementDefinition | null {
  const unlockedIds = new Set(track.userProgress.map(ua => ua.achievementId))
  for (const m of track.milestones) {
    if (!unlockedIds.has(m.id)) return m
  }
  return null // All unlocked
}

// ---------------------------------------------------------------------------
// Recently unlocked achievements sorted by date
// ---------------------------------------------------------------------------
export function getRecentlyUnlocked(
  userAchievements: UserAchievement[],
  limit = 5,
): UserAchievement[] {
  return [...userAchievements]
    .sort((a, b) => new Date(b.unlockedAt).getTime() - new Date(a.unlockedAt).getTime())
    .slice(0, limit)
}
