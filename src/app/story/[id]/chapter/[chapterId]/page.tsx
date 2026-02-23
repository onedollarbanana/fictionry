import { createClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { TiptapRenderer } from "@/components/reader/tiptap-renderer";
import { ChapterNav } from "@/components/reader/chapter-nav";
import { ReadingProgressTracker } from "@/components/reader/reading-progress-tracker";
import { ViewTracker } from "@/components/reader/view-tracker";
import { CommentList } from "@/components/reader/comment-list";
import { ChapterContentWrapper } from "@/components/reader/chapter-content-wrapper";
import { KeyboardNavigation } from "@/components/reader/keyboard-navigation";
import { SwipeNavigation } from "@/components/reader/swipe-navigation";
import { MobileChapterNav } from "@/components/reader/mobile-chapter-nav";
import { ScrollToTop } from "@/components/reader/scroll-to-top";
import { AutoLibraryAdd } from "@/components/reader/auto-library-add";
import { ChapterCompleteCard } from "@/components/reader/chapter-complete-card";
import { CollapsibleComments } from "@/components/reader/collapsible-comments";
import { ReadingTimeEstimate, countWordsFromTiptap } from "@/components/reader/reading-time-estimate";
import { ScrollPositionTracker } from "@/components/reader/scroll-position-tracker";
import { ChevronLeft } from "lucide-react";
import { headers } from "next/headers";
import { ReportButton } from "@/components/moderation/report-button";
import { ChapterLockedOverlay } from "@/components/reader/chapter-locked-overlay";
import { type TierName } from "@/lib/platform-config";
import { ChapterOfflineCacher } from "@/components/reader/chapter-offline-cacher";
import { ReadingModeSwitch } from "@/components/reader/reading-mode-switch";
import { PagedModeOnly } from "@/components/reader/paged-mode-only";
import type { Metadata } from "next";
import { isLegacyUuid, parseStoryParam, parseChapterParam, getStoryUrl, getChapterUrl, getAbsoluteStoryUrl, getAbsoluteChapterUrl } from "@/lib/url-utils";

export const revalidate = 120

const TIER_HIERARCHY: Record<string, number> = {
  supporter: 1,
  enthusiast: 2,
  patron: 3,
};

interface PageProps {
  params: { id: string; chapterId: string };
}

/**
 * Resolve the URL param to a story UUID.
 * Handles both legacy UUID params and new slug-shortId params.
 */
async function resolveStoryParam(param: string, supabase: any): Promise<{ id: string; slug: string; short_id: string } | null> {
  if (isLegacyUuid(param)) {
    const { data } = await supabase.from("stories").select("id, slug, short_id").eq("id", param).single();
    return data;
  }
  const parsed = parseStoryParam(param);
  if (parsed) {
    const { data } = await supabase.from("stories").select("id, slug, short_id").eq("short_id", parsed.shortId).single();
    return data;
  }
  return null;
}

/**
 * Resolve the chapter URL param to a chapter UUID.
 * Handles both legacy UUID params and new slug-shortId params.
 */
async function resolveChapterParam(
  param: string,
  storyId: string,
  supabase: any
): Promise<{ id: string; chapter_number: number; slug: string | null; short_id: string } | null> {
  if (isLegacyUuid(param)) {
    const { data } = await supabase
      .from("chapters")
      .select("id, chapter_number, slug, short_id")
      .eq("id", param)
      .eq("story_id", storyId)
      .single();
    return data;
  }
  const parsed = parseChapterParam(param);
  if (parsed) {
    const { data } = await supabase
      .from("chapters")
      .select("id, chapter_number, slug, short_id")
      .eq("short_id", parsed.shortId)
      .eq("story_id", storyId)
      .single();
    return data;
  }
  return null;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id: storyIdParam, chapterId: chapterIdParam } = params;
  if (!storyIdParam || !chapterIdParam) return { title: "Chapter Not Found | Fictionry" };
  const { createClient } = await import("@/lib/supabase/server");
  const supabase = await createClient();

  // Resolve story and chapter params
  const resolvedStory = await resolveStoryParam(storyIdParam, supabase);
  const resolvedStoryId = resolvedStory?.id || storyIdParam;
  const resolvedChapter = await resolveChapterParam(chapterIdParam, resolvedStoryId, supabase);
  const resolvedChapterId = resolvedChapter?.id || chapterIdParam;

  const { data: chapter } = await supabase
    .from("chapters")
    .select(`
      title,
      chapter_number,
      slug,
      stories (
        title,
        cover_url,
        genres,
        slug,
        short_id,
        profiles!author_id(
          username,
          display_name
        )
      )
    `)
    .eq("id", resolvedChapterId)
    .eq("story_id", resolvedStoryId)
    .single();

  if (!chapter || !chapter.stories) {
    return { title: "Chapter Not Found | Fictionry" };
  }

  const story = chapter.stories as any;
  const authorName = story.profiles?.display_name || story.profiles?.username || "Unknown";
  const title = `${chapter.title} — ${story.title} by ${authorName} | Fictionry`;
  const genreLabel = story.genres && story.genres.length > 0 ? ` — ${story.genres[0]} Fiction` : "";
  const description = `Read Chapter ${chapter.chapter_number}: ${chapter.title} from ${story.title} by ${authorName}${genreLabel} on Fictionry`;

  const ogParams = new URLSearchParams();
  ogParams.set("title", `Ch. ${chapter.chapter_number}: ${chapter.title}`);
  ogParams.set("author", authorName);
  if (story.cover_url) ogParams.set("cover", story.cover_url);
  ogParams.set("description", `From ${story.title}`);
  if (story.genres && story.genres.length > 0) ogParams.set("genre", story.genres[0]);

  const ogImageUrl = `https://www.fictionry.com/api/og?${ogParams.toString()}`;

  const canonicalUrl = resolvedStory && resolvedChapter
    ? getAbsoluteChapterUrl(
        { id: resolvedStory.id, slug: story.slug, short_id: story.short_id },
        { slug: chapter.slug, short_id: resolvedChapter.short_id }
      )
    : undefined;

  return {
    title,
    description,
    ...(canonicalUrl ? { alternates: { canonical: canonicalUrl } } : {}),
    openGraph: {
      title,
      description,
      type: "article",
      images: [{ url: ogImageUrl, width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImageUrl],
    },
  };
}

export default async function ChapterReadingPage({ params }: PageProps) {
  const { id: storyIdParam, chapterId: chapterIdParam } = params;
  const supabase = await createClient();

  // Resolve story param
  const resolvedStory = await resolveStoryParam(storyIdParam, supabase);
  if (!resolvedStory) {
    notFound();
  }

  const storyId = resolvedStory.id;

  // Resolve chapter param
  const resolvedChapter = await resolveChapterParam(chapterIdParam, storyId, supabase);
  if (!resolvedChapter) {
    notFound();
  }

  const chapterId = resolvedChapter.id;

  // Redirect legacy UUID URLs to SEO-friendly slug URLs
  const canonicalChapterPath = getChapterUrl(resolvedStory, resolvedChapter);
  if (isLegacyUuid(storyIdParam) || isLegacyUuid(chapterIdParam)) {
    redirect(canonicalChapterPath);
  }

  // Redirect if story slug doesn't match (e.g., story was renamed)
  const parsedStory = parseStoryParam(storyIdParam);
  if (parsedStory && parsedStory.slug !== resolvedStory.slug) {
    redirect(canonicalChapterPath);
  }

  // Redirect if chapter slug doesn't match (e.g., chapter was renamed)
  const parsedChapter = parseChapterParam(chapterIdParam);
  if (parsedChapter && resolvedChapter.slug && parsedChapter.slug !== resolvedChapter.slug) {
    redirect(canonicalChapterPath);
  }

  // Get current user (may be null if not logged in)
  const { data: { user } } = await supabase.auth.getUser();

  // Fetch chapter with story info (including default author notes)
  const { data: chapter, error } = await supabase
    .from("chapters")
    .select(`
      *,
      stories (
        id,
        title,
        author_id,
        default_author_note_before,
        default_author_note_after,
        profiles!author_id(
          username
        )
      )
    `)
    .eq("id", chapterId)
    .eq("story_id", storyId)
    .single();

  if (error || !chapter) {
    notFound();
  }

  // Only show published chapters (unless author)
  if (!chapter.is_published && chapter.stories?.author_id !== user?.id) {
    notFound();
  }

  // Fetch author tiers for gating check
  const { data: authorTiers } = await supabase
    .from('author_tiers')
    .select('tier_name, enabled, description')
    .eq('author_id', chapter.stories?.author_id)
    .eq('enabled', true);

  // Check if chapter is gated and user has access
  let hasAccess = true;
  const requiredTier = chapter.min_tier_name;

  if (requiredTier && chapter.stories?.author_id !== user?.id) {
    hasAccess = false;

    if (user) {
      // Check if user has an active subscription to this author at required tier or higher
      const { data: sub } = await supabase
        .from('author_subscriptions')
        .select('tier_name')
        .eq('subscriber_id', user.id)
        .eq('author_id', chapter.stories?.author_id)
        .eq('status', 'active')
        .single();

      if (sub && TIER_HIERARCHY[sub.tier_name] >= TIER_HIERARCHY[requiredTier]) {
        hasAccess = true;
      }
    }
  }

  // Fetch all chapters for navigation
  const { data: allChapters } = await supabase
    .from("chapters")
    .select("id, title, chapter_number, is_published, slug, short_id")
    .eq("story_id", storyId)
    .eq("is_published", true)
    .order("chapter_number", { ascending: true });

  const chapters = allChapters || [];
  const currentIndex = chapters.findIndex((ch) => ch.id === chapterId);
  const prevChapter = currentIndex > 0 ? chapters[currentIndex - 1] : null;
  const nextChapter = currentIndex < chapters.length - 1 ? chapters[currentIndex + 1] : null;

  // Calculate word count for reading time
  const wordCount = countWordsFromTiptap(chapter.content);

  // Compute URLs for prev/next chapters
  const prevChapterUrl = prevChapter ? getChapterUrl(resolvedStory, { slug: prevChapter.slug, short_id: prevChapter.short_id }) : undefined;
  const nextChapterUrl = nextChapter ? getChapterUrl(resolvedStory, { slug: nextChapter.slug, short_id: nextChapter.short_id }) : undefined;
  const storyUrlPath = getStoryUrl(resolvedStory);

  // Get the current URL for sharing
  const storyUrl = getAbsoluteStoryUrl(resolvedStory);

  // Header content for the wrapper
  const headerContent = (
    <>
      <Link
        href={getStoryUrl(resolvedStory)}
        className="flex items-center gap-1 text-sm opacity-70 hover:opacity-100 min-w-0 flex-shrink"
      >
        <ChevronLeft className="h-4 w-4 flex-shrink-0" />
        <span className="truncate max-w-[120px] sm:max-w-[200px]">{chapter.stories?.title}</span>
      </Link>
      <div className="flex items-center gap-2 flex-shrink-0">
        <span className="text-sm font-medium whitespace-nowrap">Ch. {chapter.chapter_number}</span>
        <ReadingTimeEstimate wordCount={wordCount} />
      </div>
    </>
  );

  return (
    <>
      {/* Scroll to top on navigation — disabled in continuous scroll mode */}
      <PagedModeOnly>
        <ScrollToTop />
      </PagedModeOnly>

      {/* Cache chapter for offline reading */}
      <ChapterOfflineCacher
        storyId={storyId}
        chapterId={chapterId}
        storyTitle={chapter.stories?.title || ''}
        chapterTitle={chapter.title}
        chapterNumber={chapter.chapter_number}
        authorName={chapter.stories?.profiles?.username || 'Unknown'}
        content={chapter.content}
        wordCount={wordCount}
        prevChapterId={prevChapter?.id}
        nextChapterId={nextChapter?.id}
      />

      {/* Auto-add to library when reading chapter 2+ */}
      <AutoLibraryAdd 
        storyId={storyId} 
        chapterNumber={chapter.chapter_number} 
      />

      {/* Track reading progress */}
      <ReadingProgressTracker
        storyId={storyId}
        chapterId={chapterId}
        chapterNumber={chapter.chapter_number}
        userId={user?.id ?? null}
      />

      {/* Track scroll position for resume reading */}
      <ScrollPositionTracker
        storyId={storyId}
        chapterId={chapterId}
        chapterNumber={chapter.chapter_number}
        userId={user?.id ?? null}
      />

      {/* Track views (unique per session/user) */}
      <ViewTracker chapterId={chapterId} storyId={storyId} hasAccess={hasAccess} />

      {/* Keyboard/swipe navigation: disabled in continuous scroll mode */}
      <PagedModeOnly>
        <KeyboardNavigation
          storyUrl={storyUrlPath}
          prevChapterUrl={prevChapterUrl}
          nextChapterUrl={nextChapterUrl}
        />
        <SwipeNavigation
          prevChapterUrl={prevChapterUrl}
          nextChapterUrl={nextChapterUrl}
        />
      </PagedModeOnly>

      <ChapterContentWrapper 
        headerContent={headerContent}
        storyTitle={chapter.stories?.title || 'Fictionry'}
        storyUrl={storyUrl}
      >
        <header className="mb-8">
          <h1 className="text-2xl md:text-3xl font-bold">{chapter.title}</h1>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2">
            <p className="opacity-70">
              By{" "}
              <Link
                href={`/author/${chapter.stories?.profiles?.username}`}
                className="hover:underline"
              >
                {chapter.stories?.profiles?.username || "Unknown"}
              </Link>
            </p>
            <ReadingTimeEstimate wordCount={wordCount} variant="full" />
          </div>
        </header>

        {!hasAccess ? (
          <ChapterLockedOverlay
            storyId={storyId}
            chapterId={chapterId}
            authorId={chapter.stories?.author_id || ''}
            authorName={chapter.stories?.profiles?.username || 'this author'}
            requiredTier={requiredTier as TierName}
            availableTiers={(authorTiers || []).map(t => ({
              tier_name: t.tier_name as TierName,
              enabled: t.enabled,
              description: t.description,
            }))}
            isLoggedIn={!!user}
          />
        ) : (
          <>
            {/* Story Default Author's Note (Before) */}
            {chapter.stories?.default_author_note_before && (
              <div className="mb-6 p-4 rounded-lg bg-black/5 dark:bg-white/5 border-l-4 border-primary">
                <p className="text-sm font-medium opacity-70 mb-1">Author&apos;s Note</p>
                <p className="text-sm whitespace-pre-wrap break-words">{chapter.stories.default_author_note_before}</p>
              </div>
            )}

            {/* Chapter-Specific Author's Note (Before) */}
            {chapter.author_note_before && (
              <div className="mb-8 p-4 rounded-lg bg-black/5 dark:bg-white/5 border-l-4 border-secondary">
                <p className="text-sm font-medium opacity-70 mb-1">Chapter Note</p>
                <p className="text-sm whitespace-pre-wrap break-words">{chapter.author_note_before}</p>
              </div>
            )}

            {/* Main Content */}
            <div className="prose dark:prose-invert max-w-none">
              <TiptapRenderer content={chapter.content} />
            </div>

            {/* Chapter-Specific Author's Note (After) */}
            {chapter.author_note_after && (
              <div className="mt-8 p-4 rounded-lg bg-black/5 dark:bg-white/5 border-l-4 border-secondary">
                <p className="text-sm font-medium opacity-70 mb-1">Chapter Note</p>
                <p className="text-sm whitespace-pre-wrap break-words">{chapter.author_note_after}</p>
              </div>
            )}

            {/* Story Default Author's Note (After) */}
            {chapter.stories?.default_author_note_after && (
              <div className="mt-6 p-4 rounded-lg bg-black/5 dark:bg-white/5 border-l-4 border-primary">
                <p className="text-sm font-medium opacity-70 mb-1">Author&apos;s Note</p>
                <p className="text-sm whitespace-pre-wrap break-words">{chapter.stories.default_author_note_after}</p>
              </div>
            )}
          </>
        )}

        {/* Post-content: different rendering based on reading mode */}
        <ReadingModeSwitch
          pagedContent={
            <>
              <ChapterCompleteCard
                storyUrl={storyUrlPath}
                storyTitle={chapter.stories?.title ?? ""}
                chapterId={chapterId}
                storyId={storyId}
                chapterNumber={chapter.chapter_number}
                chapterTitle={chapter.title}
                totalChapters={chapters.length}
                initialLikes={chapter.likes ?? 0}
                currentUserId={user?.id ?? null}
                storyAuthorId={chapter.stories?.author_id ?? ""}
                prevChapter={prevChapterUrl && prevChapter ? { url: prevChapterUrl, title: prevChapter.title } : null}
                nextChapter={nextChapterUrl && nextChapter ? { url: nextChapterUrl, title: nextChapter.title } : null}
                shareUrl={getAbsoluteChapterUrl(resolvedStory, { slug: resolvedChapter.slug, short_id: resolvedChapter.short_id })}
                shareTitle={`${chapter.title} — ${chapter.stories?.title || "Story"}`}
                reportButton={
                  user && user.id !== chapter.stories?.author_id ? (
                    <ReportButton
                      contentType="chapter"
                      contentId={chapterId}
                      contentTitle={`${chapter.stories?.title} - Ch. ${chapter.chapter_number}: ${chapter.title}`}
                      size="sm"
                      variant="ghost"
                    />
                  ) : undefined
                }
              />

              {/* Chapter Navigation - Hidden on mobile (bottom nav shows instead) */}
              <div className="hidden md:block">
                <ChapterNav
                  storyUrl={storyUrlPath}
                  currentChapter={chapter.chapter_number}
                  totalChapters={chapters.length}
                  prevChapterUrl={prevChapterUrl}
                  nextChapterUrl={nextChapterUrl}
                />
              </div>

              {/* Comments - collapsed on mobile for binge readers */}
              <CollapsibleComments>
                <CommentList
                  chapterId={chapterId}
                  currentUserId={user?.id ?? null}
                  storyAuthorId={chapter.stories?.author_id ?? ""}
                />
              </CollapsibleComments>
            </>
          }
          continuousScrollData={{
            initialChapterId: chapterId,
            initialChapterTitle: chapter.title,
            initialChapterNumber: chapter.chapter_number,
            initialWordCount: wordCount,
            initialCommentCount: 0,
            allChapterIds: chapters.map(ch => ({ id: ch.id, title: ch.title, chapterNumber: ch.chapter_number, slug: ch.slug, shortId: ch.short_id })),
            storyId,
            storySlug: resolvedStory.slug,
            storyShortId: resolvedStory.short_id,
            storyTitle: chapter.stories?.title || '',
            currentUserId: user?.id ?? null,
            storyAuthorId: chapter.stories?.author_id ?? '',
            authorName: (chapter.stories?.profiles as any)?.username || 'Unknown',
            authorTiers: (authorTiers || []).map(t => ({
              tier_name: t.tier_name,
              enabled: t.enabled,
              description: t.description,
            })),
          }}
        />

        {/* Mobile Bottom Navigation - always visible for jump-to-chapter */}
        <MobileChapterNav
          storyUrl={storyUrlPath}
          storyTitle={chapter.stories?.title ?? ""}
          prevChapter={prevChapterUrl && prevChapter ? { url: prevChapterUrl, title: prevChapter.title } : null}
          nextChapter={nextChapterUrl && nextChapter ? { url: nextChapterUrl, title: nextChapter.title } : null}
          currentChapterNumber={chapter.chapter_number}
          totalChapters={chapters.length}
        />
      </ChapterContentWrapper>
    </>
  );
}
