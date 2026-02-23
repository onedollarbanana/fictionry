import { HelpLink } from '@/components/ui/help-link'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { LibraryClient } from '@/components/library/library-client'
import { LibraryTabs } from '@/components/library/library-tabs'

export const dynamic = 'force-dynamic'

// Define types for the query result
interface FollowWithStory {
  id: string
  status: string
  notify_new_chapters: boolean
  created_at: string
  updated_at: string
  story: {
    id: string
    slug: string | null
    short_id: string | null
    title: string
    tagline: string | null
    cover_url: string | null
    status: string
    genres: string[] | null
    tags: string[] | null
    word_count: number | null
    chapter_count: number | null
    rating_average: number | null
    rating_count: number | null
    updated_at: string
    profiles: {
      username: string
    } | null
  } | null
}

export default async function LibraryPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login?redirect=/library')
  }

  // Fetch ALL library entries with story details
  const { data: follows, error } = await supabase
    .from('follows')
    .select(`
      id,
      status,
      notify_new_chapters,
      created_at,
      updated_at,
      story:stories (
        id,
        slug,
        short_id,
        title,
        tagline,
        cover_url,
        status,
        genres,
        tags,
        word_count,
        chapter_count,
        rating_average,
        rating_count,
        updated_at,
        profiles!author_id(
          username
        )
      )
    `)
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false })

  if (error) {
    console.error('Error fetching library:', error)
    return (
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <h1 className="text-3xl font-bold mb-6 flex items-center gap-2">My Library <HelpLink href="/guides/readers/getting-started" label="Reader guide" /></h1>
        <LibraryTabs />
        <p className="text-muted-foreground">Failed to load library. Please try again.</p>
      </div>
    )
  }

  // Cast to our known type structure
  const typedFollows = follows as unknown as FollowWithStory[]

  // Get story IDs that have stories
  const validFollows = typedFollows?.filter(f => f.story) || []
  const storyIds = validFollows.map(f => f.story!.id)
  
  let progressMap: Record<string, { read: number; total: number }> = {}
  
  if (storyIds.length > 0) {
    // Get chapters read per story
    const { data: readChapters } = await supabase
      .from('chapter_reads')
      .select('chapter_id, chapters!inner(story_id)')
      .eq('user_id', user.id)
      .in('chapters.story_id', storyIds)

    // Count read chapters per story
    const readCounts: Record<string, number> = {}
    if (readChapters) {
      readChapters.forEach((rc: { chapters: { story_id: string } | { story_id: string }[] }) => {
        // Handle both array and single object cases
        const chapters = Array.isArray(rc.chapters) ? rc.chapters[0] : rc.chapters
        if (chapters) {
          const storyId = chapters.story_id
          readCounts[storyId] = (readCounts[storyId] || 0) + 1
        }
      })
    }

    // Build progress map
    validFollows.forEach(f => {
      if (f.story) {
        progressMap[f.story.id] = {
          read: readCounts[f.story.id] || 0,
          total: f.story.chapter_count || 0
        }
      }
    })
  }

  // Fetch latest chapter per story and user's last-read chapter per story
  let latestChapterMap: Record<string, { chapterNumber: number; title: string; publishedAt: string; shortId: string; slug: string }> = {}
  let lastReadMap: Record<string, { chapterNumber: number; title: string; readAt: string }> = {}
  let nextChapterMap: Record<string, { chapterNumber: number; title: string; shortId: string; slug: string }> = {}

  if (storyIds.length > 0) {
    // Get latest published chapter per story
    const { data: latestChapters } = await supabase
      .from('chapters')
      .select('story_id, chapter_number, title, published_at, short_id, slug')
      .in('story_id', storyIds)
      .eq('is_published', true)
      .order('chapter_number', { ascending: false })

    if (latestChapters) {
      // Group by story, take first (highest chapter_number) per story
      for (const ch of latestChapters) {
        if (!latestChapterMap[ch.story_id]) {
          latestChapterMap[ch.story_id] = {
            chapterNumber: ch.chapter_number,
            title: ch.title,
            publishedAt: ch.published_at,
            shortId: ch.short_id,
            slug: ch.slug,
          }
        }
      }
    }

    // Get user's read chapters with chapter info
    const { data: userReads } = await supabase
      .from('chapter_reads')
      .select('chapter_id, story_id, read_at, chapters!inner(chapter_number, title)')
      .eq('user_id', user.id)
      .in('story_id', storyIds)

    if (userReads) {
      for (const read of userReads as any[]) {
        const ch = Array.isArray(read.chapters) ? read.chapters[0] : read.chapters
        if (ch) {
          const storyId = read.story_id
          if (!lastReadMap[storyId] || ch.chapter_number > lastReadMap[storyId].chapterNumber) {
            lastReadMap[storyId] = {
              chapterNumber: ch.chapter_number,
              title: ch.title,
              readAt: read.read_at,
            }
          }
        }
      }
    }

    // Get reading_progress to find chapters the user is currently mid-read
    const { data: readingProgress } = await supabase
      .from('reading_progress')
      .select('story_id, chapter_id, chapter_number, scroll_position')
      .eq('user_id', user.id)
      .in('story_id', storyIds)

    // Build a set of chapter IDs that are marked as read
    const readChapterIds = new Set<string>()
    if (userReads) {
      for (const read of userReads as any[]) {
        readChapterIds.add(read.chapter_id)
      }
    }

    // Calculate next chapter to read per story
    // Priority: in-progress chapter from reading_progress > next unread chapter
    for (const storyId of storyIds) {
      // Check if user has an in-progress chapter (saved in reading_progress but not marked read)
      const inProgress = readingProgress?.find(rp => rp.story_id === storyId)
      if (inProgress && !readChapterIds.has(inProgress.chapter_id)) {
        // User is mid-read on this chapter — find its details
        if (latestChapters) {
          const progressCh = latestChapters.find(
            (ch: any) => ch.story_id === storyId && ch.chapter_number === inProgress.chapter_number
          )
          if (progressCh) {
            nextChapterMap[storyId] = {
              chapterNumber: progressCh.chapter_number,
              title: progressCh.title,
              shortId: progressCh.short_id,
              slug: progressCh.slug,
            }
            continue // Skip the fallback logic
          }
        }
      }

      // Fallback: next unread chapter after the last one marked as read
      const lastRead = lastReadMap[storyId]
      const nextNum = lastRead ? lastRead.chapterNumber + 1 : 1
      
      // Find next chapter
      if (latestChapters) {
        const nextCh = latestChapters.find(
          (ch: any) => ch.story_id === storyId && ch.chapter_number === nextNum
        )
        if (nextCh) {
          nextChapterMap[storyId] = {
            chapterNumber: nextCh.chapter_number,
            title: nextCh.title,
            shortId: nextCh.short_id,
            slug: nextCh.slug,
          }
        }
      }
    }
  }

  // Transform data for client component
  const libraryItems = validFollows.map(f => {
    // Handle profiles - could be array or single object from Supabase
    const profileData = f.story!.profiles
    const username = Array.isArray(profileData) 
      ? (profileData[0]?.username || 'Unknown')
      : (profileData?.username || 'Unknown')

    return {
      followId: f.id,
      status: f.status,
      notifyNewChapters: f.notify_new_chapters,
      createdAt: f.created_at,
      updatedAt: f.updated_at,
      story: {
        id: f.story!.id,
        slug: f.story!.slug,
        short_id: f.story!.short_id,
        title: f.story!.title,
        tagline: f.story!.tagline,
        coverUrl: f.story!.cover_url,
        status: f.story!.status,
        genres: f.story!.genres,
        tags: f.story!.tags,
        wordCount: f.story!.word_count,
        chapterCount: f.story!.chapter_count,
        ratingAverage: f.story!.rating_average,
        ratingCount: f.story!.rating_count,
        updatedAt: f.story!.updated_at,
        authorUsername: username
      },
      progress: progressMap[f.story!.id] || { read: 0, total: 0 },
      latestChapter: latestChapterMap[f.story!.id] || null,
      lastReadChapter: lastReadMap[f.story!.id] || null,
      nextChapter: nextChapterMap[f.story!.id] || null,
      newChaptersSinceLastRead: lastReadMap[f.story!.id] 
        ? Math.max(0, (latestChapterMap[f.story!.id]?.chapterNumber || 0) - lastReadMap[f.story!.id].chapterNumber)
        : 0
    }
  })

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <h1 className="text-3xl font-bold mb-6 flex items-center gap-2">My Library <HelpLink href="/guides/readers/getting-started" label="Reader guide" /></h1>
      <LibraryTabs />
      <LibraryClient items={libraryItems} />
    </div>
  )
}
