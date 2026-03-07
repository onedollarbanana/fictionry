export type StoryStatus = 'ongoing' | 'completed' | 'hiatus' | 'dropped'

export interface Profile {
  id: string
  username: string
  display_name: string | null
  bio: string | null
  avatar_url: string | null
  created_at: string
  updated_at: string
}

export interface Story {
  id: string
  author_id: string
  title: string
  slug: string
  short_id: string
  tagline: string | null
  blurb: string | null
  cover_url: string | null
  status: StoryStatus
  visibility: string
  // Taxonomy v3
  primary_genre: string | null
  subgenres: string[]
  tags: string[]
  content_rating: 'everyone' | 'teen' | 'mature' | 'adult_18' | null
  content_warnings: string[]
  format: string | null
  origin_type: 'original' | 'fan_fiction'
  fandoms: string[]
  secondary_genre: string | null
  relationship_tags: string[]
  primary_genre_change_count: number
  primary_genre_changed_at: string | null
  // Stats
  total_views: number
  total_likes: number
  follower_count: number
  chapter_count: number
  word_count: number
  rating_average: number
  rating_count: number
  created_at: string
  updated_at: string
  last_chapter_at: string | null
  // Joined data
  author?: Profile
}

export interface Chapter {
  id: string
  story_id: string
  chapter_number: number
  title: string
  content: Record<string, unknown> // Tiptap JSON
  content_html: string | null
  word_count: number
  is_premium: boolean
  is_published: boolean
  author_note_before: string | null
  author_note_after: string | null
  views: number
  likes: number
  published_at: string | null
  scheduled_for: string | null
  created_at: string
  updated_at: string
}

export interface Follow {
  id: string
  user_id: string
  story_id: string
  status: 'reading' | 'finished' | 'dropped'
  last_read_chapter: number | null
  created_at: string
  updated_at: string
}

export interface ChapterLike {
  id: string
  user_id: string
  chapter_id: string
  created_at: string
}

export interface ReadingProgress {
  id: string
  user_id: string
  story_id: string
  chapter_id: string
  progress: number
  updated_at: string
}

export type AnnouncementScope = 'story' | 'all_author_stories'

export interface Announcement {
  id: string
  story_id: string | null
  author_id: string
  title: string
  content: string
  scope: AnnouncementScope
  created_at: string
  // Joined data
  author?: Profile
  story?: Story
}

export interface AnnouncementRead {
  user_id: string
  announcement_id: string
  read_at: string
}

export interface ChapterView {
  id: string
  chapter_id: string
  story_id: string
  user_id: string | null
  session_id: string | null
  viewed_at: string
}

export interface ChapterRead {
  id: string
  user_id: string
  chapter_id: string
  story_id: string
  read_at: string
}

export interface StoryGenreChangeLog {
  id: string
  story_id: string
  changed_by: string
  old_genre: string | null
  new_genre: string
  changed_at: string
}
