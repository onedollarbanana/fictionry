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
  blurb: string | null
  cover_url: string | null
  status: StoryStatus
  genres: string[]
  tags: string[]
  total_views: number
  total_likes: number
  follower_count: number
  chapter_count: number
  word_count: number
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

// Genre options for stories
export const GENRES = [
  'Fantasy',
  'Sci-Fi',
  'LitRPG',
  'Progression',
  'Romance',
  'Horror',
  'Mystery',
  'Thriller',
  'Comedy',
  'Drama',
  'Action',
  'Adventure',
  'Slice of Life',
  'Historical',
  'Isekai',
  'Xianxia',
  'Cultivation',
] as const

export type Genre = typeof GENRES[number]
