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
      progress: progressMap[f.story!.id] || { read: 0, total: 0 }
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
