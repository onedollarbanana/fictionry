import { createClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { BookOpen, Clock, Eye, Heart, Lock, Pencil, User } from "lucide-react";
import { ChapterReadToggle } from "@/components/story/chapter-read-toggle";
import { formatDistanceToNow } from "date-fns";
import { LibraryButton } from "@/components/story/LibraryButton";
import { AnnouncementBanner } from "@/components/announcements";
import { StoryRatingSectionServer } from "@/components/story/story-rating-section-server";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { RelatedStories } from "@/components/story/related-stories";
import { MoreFromAuthor } from "@/components/story/more-from-author";
import { ReportButton } from "@/components/moderation/report-button";
import { hasMatureContent } from "@/lib/content-warnings";
import { ContentWarningGate } from "@/components/story/content-warning-gate";
import { NominateButton } from "@/components/story/nominate-button";
import { CommunityPickBadge } from "@/components/story/community-pick-badge";
import { CoverLightbox } from "@/components/ui/cover-lightbox";
import { getCommunityPickBadge } from "@/lib/community-picks";
import { AuthorTierCards } from "@/components/story/author-tier-cards";
import { type TierName } from "@/lib/platform-config";
import { ShareButtons } from "@/components/ui/share-buttons";
import { SignupCta } from "@/components/onboarding/signup-cta";
import type { Metadata } from "next";
import { isLegacyUuid, parseStoryParam, getStoryUrl, getAbsoluteStoryUrl, getChapterUrl } from "@/lib/url-utils";

export const revalidate = 120

interface PageProps {
  params: { id: string };
}

/**
 * Resolve the URL param to a story UUID.
 * Handles both legacy UUID params and new slug-shortId params.
 */
async function resolveStoryParam(param: string, supabase: any): Promise<{ id: string; slug: string; short_id: string } | null> {
  if (isLegacyUuid(param)) {
    const { data } = await supabase
      .from("stories")
      .select("id, slug, short_id")
      .eq("id", param)
      .single();
    return data;
  }

  const parsed = parseStoryParam(param);
  if (parsed) {
    const { data } = await supabase
      .from("stories")
      .select("id, slug, short_id")
      .eq("short_id", parsed.shortId)
      .single();
    return data;
  }

  return null;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = params;
  if (!id) return { title: "Story Not Found | Fictionry" };
  const supabase = await createClient();

  const resolved = await resolveStoryParam(id, supabase);
  const storyId = resolved?.id || id;

  const { data: story } = await supabase
    .from("stories")
    .select(`
      title,
      blurb,
      cover_url,
      primary_genre,
      slug,
      short_id,
      profiles!author_id(
        username,
        display_name
      )
    `)
    .eq("id", storyId)
    .single();

  if (!story) {
    return { title: "Story Not Found | Fictionry" };
  }

  const authorName = (story.profiles as any)?.display_name || (story.profiles as any)?.username || "Unknown";
  const genreLabel = story.primary_genre
    ? story.primary_genre.replace(/-/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())
    : "";
  const title = genreLabel
    ? `Read ${story.title} by ${authorName} — ${genreLabel} Fiction | Fictionry`
    : `Read ${story.title} by ${authorName} | Fictionry`;
  const description = story.blurb
    ? story.blurb.length > 160
      ? story.blurb.substring(0, 157) + "..."
      : story.blurb
    : `Read ${story.title} by ${authorName} on Fictionry`;

  const ogParams = new URLSearchParams();
  ogParams.set("title", story.title);
  ogParams.set("author", authorName);
  if (story.cover_url) ogParams.set("cover", story.cover_url);
  if (story.blurb) ogParams.set("description", story.blurb.substring(0, 120));
  if (story.primary_genre) ogParams.set("genre", genreLabel);

  const ogImageUrl = `https://www.fictionry.com/api/og?${ogParams.toString()}`;

  const canonicalUrl = resolved
    ? getAbsoluteStoryUrl({ id: resolved.id, slug: story.slug, short_id: story.short_id })
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

export default async function StoryPage({ params }: PageProps) {
  const { id } = params;
  const supabase = await createClient();

  // === Step 1: Resolve URL param (must run first) ===
  const resolved = await resolveStoryParam(id, supabase);
  if (!resolved) {
    notFound();
  }

  // Redirect legacy UUID URLs to SEO-friendly slug URLs
  const canonicalPath = getStoryUrl(resolved);
  if (isLegacyUuid(id)) {
    redirect(canonicalPath);
  }

  // Redirect if slug doesn't match (e.g., story was renamed)
  const parsed = parseStoryParam(id);
  if (parsed && parsed.slug !== resolved.slug) {
    redirect(canonicalPath);
  }

  const storyId = resolved.id;

  // === Step 2: Parallel Group A — all independent queries ===
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const [
    { data: story, error },
    { data: { user } },
    { data: chapters },
    { data: authorTiers },
    { data: storyTierSettings },
    { data: allAnnouncements },
    communityPickData,
  ] = await Promise.all([
    // Fetch story with author info
    supabase
      .from("stories")
      .select(`
        *,
        profiles!author_id(
          username,
          display_name,
          avatar_url
        )
      `)
      .eq("id", storyId)
      .single(),
    // Get current user to check ownership
    supabase.auth.getUser(),
    // Fetch published chapters (include min_tier_name for lock icons)
    supabase
      .from("chapters")
      .select("id, title, chapter_number, word_count, likes, created_at, is_published, min_tier_name, slug, short_id")
      .eq("story_id", storyId)
      .eq("is_published", true)
      .order("chapter_number", { ascending: true }),
    // Fetch author tiers (global settings - no advance_chapter_count here)
    supabase
      .from('author_tiers')
      .select('tier_name, enabled, description')
      .eq('author_id', resolved.id)
      .eq('enabled', true)
      .order('tier_name'),
    // Fetch per-story tier settings for advance chapter counts
    supabase
      .from('story_tier_settings')
      .select('tier_name, advance_chapter_count')
      .eq('story_id', storyId),
    // Fetch announcements for this story (last 30 days)
    supabase
      .from("announcements")
      .select("*")
      .eq("story_id", storyId)
      .gte("created_at", thirtyDaysAgo.toISOString())
      .order("created_at", { ascending: false })
      .limit(10),
    // Check if this story is a Community Pick
    getCommunityPickBadge(storyId, supabase),
  ]);

  // === Step 3: Early exits after Group A ===
  if (error || !story) {
    notFound();
  }

  const isOwner = user && story.author_id === user.id;

  // Check visibility - only owner can see draft/removed stories
  if ((story.visibility === 'draft' || story.visibility === 'removed') && !isOwner) {
    notFound();
  }

  const publishedChapters = chapters || [];
  const totalWords = publishedChapters.reduce((sum, ch) => sum + (ch.word_count || 0), 0);

  // Build a map of tier_name -> advance_chapter_count for this story
  const advanceCountMap: Record<string, number> = {};
  if (storyTierSettings) {
    for (const s of storyTierSettings) {
      advanceCountMap[s.tier_name] = s.advance_chapter_count;
    }
  }

  // === Step 4: Parallel Group B — user-specific, conditional on user being logged in ===
  let readingProgress: { chapter_id: string; chapter_number: number } | null = null;
  let userSubscription = null;
  let readChapterIds = new Set<string>();
  let unreadAnnouncements = allAnnouncements || [];

  if (user) {
    const [progressResult, subResult, announcementReadsResult, chapterReadsResult] = await Promise.all([
      // Fetch reading progress for current user
      supabase
        .from('reading_progress')
        .select('chapter_id, chapter_number')
        .eq('user_id', user.id)
        .eq('story_id', storyId)
        .single(),
      // Check user's subscription to this author
      supabase
        .from('author_subscriptions')
        .select('tier_name, status')
        .eq('subscriber_id', user.id)
        .eq('author_id', story.author_id)
        .eq('status', 'active')
        .single(),
      // Get which announcements user has read
      allAnnouncements && allAnnouncements.length > 0
        ? supabase
            .from("announcement_reads")
            .select("announcement_id")
            .eq("user_id", user.id)
            .in("announcement_id", allAnnouncements.map(a => a.id))
        : Promise.resolve({ data: null }),
      // Get which chapters user has read
      publishedChapters.length > 0
        ? supabase
            .from("chapter_reads")
            .select("chapter_id")
            .eq("user_id", user.id)
            .in("chapter_id", publishedChapters.map(c => c.id))
        : Promise.resolve({ data: null }),
    ]);

    readingProgress = progressResult.data;
    userSubscription = subResult.data;

    if (allAnnouncements && allAnnouncements.length > 0 && announcementReadsResult.data) {
      const readIds = new Set(announcementReadsResult.data.map((r: any) => r.announcement_id));
      unreadAnnouncements = allAnnouncements.filter(a => !readIds.has(a.id));
    }

    if (chapterReadsResult.data) {
      readChapterIds = new Set(chapterReadsResult.data.map((r: any) => r.chapter_id));
    }
  }

  const authorName = story.profiles?.display_name || story.profiles?.username || 'Unknown';
  const isMature = hasMatureContent(story.content_rating);

  const pageContent = (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* JSON-LD Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Book",
            name: story.title,
            author: {
              "@type": "Person",
              name: authorName,
              url: `https://www.fictionry.com/profile/${story.profiles?.username || ""}`,
            },
            description: story.blurb || undefined,
            genre: story.primary_genre
              ? story.primary_genre.replace(/-/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())
              : undefined,
            image: story.cover_url || undefined,
            url: getAbsoluteStoryUrl(resolved),
            numberOfPages: publishedChapters.length,
            wordCount: totalWords,
            publisher: {
              "@type": "Organization",
              name: "Fictionry",
              url: "https://www.fictionry.com",
            },
            aggregateRating: story.rating_count > 0
              ? {
                  "@type": "AggregateRating",
                  ratingValue: story.average_rating,
                  ratingCount: story.rating_count,
                  bestRating: 5,
                  worstRating: 1,
                }
              : undefined,
            inLanguage: "en",
          }),
        }}
      />

      {/* Breadcrumb */}
      <Breadcrumb items={[
        { label: 'Browse', href: '/browse' },
        { label: story.title }
      ]} />

      {/* Story Header */}
      <div className="flex flex-col md:flex-row gap-6 mb-8">
        {/* Cover Image - 2:3 aspect ratio */}
        {story.cover_url ? (
          <div className="relative max-w-[200px] mx-auto md:max-w-none md:mx-0 w-full md:w-48 aspect-[2/3] rounded-lg overflow-hidden shrink-0">
            <CommunityPickBadge pickMonth={communityPickData?.pickMonth} />
            <CoverLightbox
              src={`${story.cover_url}?t=${new Date(story.updated_at).getTime()}`}
              alt={`Cover for ${story.title}`}
            />
          </div>
        ) : (
          <div className="relative max-w-[200px] mx-auto md:max-w-none md:mx-0 w-full md:w-48 aspect-[2/3] bg-gradient-to-br from-primary/20 to-primary/5 rounded-lg flex items-center justify-center shrink-0">
            <CommunityPickBadge pickMonth={communityPickData?.pickMonth} />
            <BookOpen className="h-16 w-16 text-primary/40" />
          </div>
        )}

        <div className="flex-1">
          <div className="flex flex-col sm:flex-row items-start justify-between gap-2 mb-2">
            <h1 className="text-3xl font-bold">{story.title}</h1>
            {isOwner && (
              <div className="flex gap-2 shrink-0">
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/author/stories/${storyId}/edit`}>
                    <Pencil className="h-4 w-4 mr-1" />
                    Edit Story
                  </Link>
                </Button>
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/author/stories/${storyId}`}>
                    <BookOpen className="h-4 w-4 mr-1" />
                    Edit Chapters
                  </Link>
                </Button>
              </div>
            )}
          </div>
          
          <Link 
            href={`/profile/${story.profiles?.username}`}
            className="text-muted-foreground hover:text-primary flex items-center gap-2 mb-4"
          >
            <User className="h-4 w-4" />
            {authorName}
          </Link>

          {/* Stats Row */}
          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground mb-4">
            <span className="flex items-center gap-1">
              <BookOpen className="h-4 w-4" />
              {publishedChapters.length} chapters
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              {totalWords.toLocaleString()} words
            </span>
            <span className="flex items-center gap-1">
              <Eye className="h-4 w-4" />
              {(story.total_views ?? 0).toLocaleString()} views
            </span>
            <span className="flex items-center gap-1">
              <Heart className="h-4 w-4" />
              {(story.follower_count ?? 0).toLocaleString()} followers
            </span>
          </div>

          {/* Status Badge */}
          <Badge variant="secondary" className="mb-4">
            {story.status?.charAt(0).toUpperCase() + story.status?.slice(1) || "Ongoing"}
          </Badge>

          {story.release_schedule && (
            <span className="text-sm text-muted-foreground flex items-center gap-1">
              📅 {story.release_schedule}
            </span>
          )}

          {/* Primary genre + subgenres */}
          {(story.primary_genre || (story.subgenres && story.subgenres.length > 0)) && (
            <div className="flex flex-wrap items-center gap-2 mb-3">
              {story.primary_genre && (
                <Link href={`/browse/genre/${story.primary_genre}`}>
                  <Badge variant="default" className="cursor-pointer hover:bg-primary/80 capitalize">
                    {story.primary_genre.replace(/-/g, ' ')}
                  </Badge>
                </Link>
              )}
              {(story.subgenres || []).map((sub: string) => (
                <Badge key={sub} variant="secondary" className="capitalize">
                  {sub.replace(/-/g, ' ')}
                </Badge>
              ))}
            </div>
          )}

          {/* Tags - clickable, link to browse filter */}
          {story.tags && story.tags.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 mb-4">
              <span className="text-sm text-muted-foreground">Tags:</span>
              {(story.tags || []).map((tag: string) => (
                <Link key={tag} href={`/browse?tag=${encodeURIComponent(tag)}`}>
                  <Badge variant="secondary" className="cursor-pointer hover:bg-muted">
                    {tag.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                  </Badge>
                </Link>
              ))}
            </div>
          )}

          {/* Content Warnings */}
          {story.content_warnings && story.content_warnings.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-4">
              {story.content_warnings.map((warning: string) => (
                <span key={warning} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
                  ⚠️ {warning.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                </span>
              ))}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-3">
            {publishedChapters.length > 0 ? (() => {
              const progressChapter = readingProgress
                ? publishedChapters.find(ch => ch.id === readingProgress!.chapter_id)
                : null;
              const targetChapter = progressChapter || publishedChapters[0];
              const isContinuing = !!progressChapter && readingProgress!.chapter_number > 1;
              return (
                <Button asChild>
                  <Link href={getChapterUrl(resolved, { short_id: targetChapter.short_id, slug: targetChapter.slug })}>
                    {isContinuing 
                      ? `Continue Reading (Ch. ${readingProgress!.chapter_number})`
                      : 'Start Reading'}
                  </Link>
                </Button>
              );
            })() : (
              <Button disabled>No Chapters Yet</Button>
            )}
            <LibraryButton 
              storyId={storyId}
              storySlug={resolved.slug}
              storyShortId={resolved.short_id}
              initialFollowerCount={story.follower_count ?? 0} 
            />
            <ShareButtons
              url={getAbsoluteStoryUrl(resolved)}
              title={`${story.title} by ${authorName}`}
              description={story.blurb || undefined}
            />
          </div>
          {/* Report Button - only for logged-in non-owners */}
          {user && !isOwner && (
            <div className="mt-2 flex items-center gap-2">
              <ReportButton
                contentType="story"
                contentId={storyId}
                contentTitle={story.title}
                size="sm"
                variant="ghost"
              />
              {story.visibility === 'published' && (
                <NominateButton storyId={storyId} storyWordCount={totalWords} />
              )}
            </div>
          )}
          {/* Signup CTA for logged-out users */}
          {!user && (
            <div className="mt-4">
              <SignupCta variant="story" />
            </div>
          )}
        </div>
      </div>

      {/* Announcements Banner */}
      {(allAnnouncements && allAnnouncements.length > 0) && (
        <AnnouncementBanner 
          announcements={allAnnouncements}
          unreadIds={unreadAnnouncements.map(a => a.id)}
          userId={user?.id || null}
        />
      )}

      {/* Description */}
      <Card className="mb-6">
        <CardContent className="pt-6 overflow-hidden">
          <h2 className="text-lg font-semibold mb-3">Description</h2>
          <p className="text-muted-foreground whitespace-pre-wrap break-words">
            {story.blurb || "No description provided."}
          </p>
        </CardContent>
      </Card>

      {/* Author Tier Cards */}
      {authorTiers && authorTiers.length > 0 && !isOwner && (
        <div className="mb-6">
          <AuthorTierCards
            authorId={story.author_id}
            authorName={authorName}
            tiers={authorTiers.map(t => ({
              tier_name: t.tier_name as TierName,
              description: t.description,
              advance_chapter_count: advanceCountMap[t.tier_name] || 0,
            }))}
            currentSubscription={userSubscription ? {
              tier_name: userSubscription.tier_name as TierName,
              status: userSubscription.status,
            } : null}
            isLoggedIn={!!user}
          />
        </div>
      )}

      {/* Ratings Section */}
      <div className="mb-8">
        <StoryRatingSectionServer storyId={storyId} authorId={story.author_id} />
      </div>

      {/* Chapter List */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">
          Chapters ({publishedChapters.length})
        </h2>
        
        {publishedChapters.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              No chapters published yet. Check back soon!
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {publishedChapters.map((chapter) => {
              const isRead = readChapterIds.has(chapter.id);
              return (
                <div key={chapter.id} className="flex items-center gap-2">
                  <ChapterReadToggle
                    chapterId={chapter.id}
                    storyId={storyId}
                    initialIsRead={isRead}
                  />
                  <Link
                    href={getChapterUrl(resolved, { short_id: chapter.short_id, slug: chapter.slug })}
                    className="block flex-1"
                  >
                    <Card className={`hover:bg-muted/50 transition-colors ${isRead ? "border-green-500/30 bg-green-500/5" : ""}`}>
                      <CardContent className="py-3 px-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div>
                          <span className="font-medium flex items-center gap-1.5">
                            Chapter {chapter.chapter_number}: {chapter.title}
                            {chapter.min_tier_name && (
                              <span className="inline-flex items-center gap-1 text-xs font-normal text-amber-600 dark:text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded-full shrink-0">
                                <Lock className="h-3 w-3" />
                                {chapter.min_tier_name.charAt(0).toUpperCase() + chapter.min_tier_name.slice(1)}+
                              </span>
                            )}
                          </span>
                          <div className="flex items-center gap-3 text-sm text-muted-foreground">
                            <span>{(chapter.word_count ?? 0).toLocaleString()} words</span>
                            {(chapter.likes ?? 0) > 0 && (
                              <span className="flex items-center gap-1">
                                <Heart className="h-3 w-3" />
                                {(chapter.likes ?? 0).toLocaleString()}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {formatDistanceToNow(new Date(chapter.created_at), { addSuffix: true })}
                      </span>
                    </CardContent>
                  </Card>
                </Link>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* More from this Author */}
      <MoreFromAuthor 
        storyId={storyId}
        authorId={story.author_id}
        authorName={authorName}
        authorUsername={story.profiles?.username || 'Unknown'}
      />

      {/* Related Stories */}
      <RelatedStories
        storyId={storyId}
        primaryGenre={story.primary_genre ?? null}
        authorId={story.author_id}
      />
    </div>
  );

  if (isMature) {
    return (
      <ContentWarningGate contentRating={story.content_rating} warnings={story.content_warnings || []} storyTitle={story.title}>
        {pageContent}
      </ContentWarningGate>
    );
  }

  return pageContent;
}
