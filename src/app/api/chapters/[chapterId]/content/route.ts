import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { countWordsFromTiptap } from '@/components/reader/reading-time-estimate'

const TIER_HIERARCHY: Record<string, number> = {
  supporter: 1,
  enthusiast: 2,
  patron: 3,
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type StoryJoin = any

export async function GET(
  request: NextRequest,
  { params }: { params: { chapterId: string } }
) {
  const supabase = await createClient()
  const { chapterId } = params

  // Optional storyId query param — when provided (e.g. from the continuous scroll reader)
  // the chapter is validated to belong to that story, preventing cross-story ID probing.
  const { searchParams } = new URL(request.url)
  const storyIdParam = searchParams.get('storyId')

  // Build query — conditionally filter by story_id when the caller supplies it
  let query = supabase
    .from('chapters')
    .select(`
      id,
      title,
      chapter_number,
      slug,
      short_id,
      content,
      author_note_before,
      author_note_after,
      min_tier_name,
      likes,
      is_published,
      stories (
        id,
        title,
        author_id,
        default_author_note_before,
        default_author_note_after,
        profiles!author_id (
          username
        )
      )
    `)
    .eq('id', chapterId)

  if (storyIdParam) {
    query = query.eq('story_id', storyIdParam)
  }

  const { data: chapter, error } = await query.single()

  if (error || !chapter) {
    return NextResponse.json({ error: 'Chapter not found' }, { status: 404 })
  }

  if (!chapter.is_published) {
    return NextResponse.json({ error: 'Chapter not published' }, { status: 404 })
  }

  // Cast stories to single object (Supabase types it as array but .single() ensures one chapter)
  const story = chapter.stories as StoryJoin

  // Get current user for access check
  const { data: { user } } = await supabase.auth.getUser()

  // Check gating
  let hasAccess = true
  const requiredTier = chapter.min_tier_name

  if (requiredTier && story?.author_id !== user?.id) {
    hasAccess = false

    if (user) {
      const { data: sub } = await supabase
        .from('author_subscriptions')
        .select('tier_name')
        .eq('subscriber_id', user.id)
        .eq('author_id', story?.author_id)
        .eq('status', 'active')
        .single()

      if (sub && TIER_HIERARCHY[sub.tier_name] >= TIER_HIERARCHY[requiredTier]) {
        hasAccess = true
      }
    }
  }

  // Get comment count for this chapter
  const { count: commentCount } = await supabase
    .from('comments')
    .select('*', { count: 'exact', head: true })
    .eq('chapter_id', chapterId)
    .is('parent_id', null)

  // Use the same recursive Tiptap text-extraction as the chapter page so that
  // word counts are consistent between the chapter header and the separator "Up Next" block.
  const wordCount = countWordsFromTiptap(chapter.content)

  return NextResponse.json({
    id: chapter.id,
    title: chapter.title,
    chapterNumber: chapter.chapter_number,
    slug: chapter.slug,
    shortId: chapter.short_id,
    content: hasAccess ? chapter.content : null,
    authorNoteBefore: chapter.author_note_before,
    authorNoteAfter: chapter.author_note_after,
    defaultAuthorNoteBefore: story?.default_author_note_before,
    defaultAuthorNoteAfter: story?.default_author_note_after,
    minTierName: chapter.min_tier_name,
    likes: chapter.likes ?? 0,
    hasAccess,
    wordCount,
    commentCount: commentCount ?? 0,
    storyId: story?.id,
    storyTitle: story?.title,
    authorId: story?.author_id,
    authorName: story?.profiles?.username || 'Unknown',
  })
}
