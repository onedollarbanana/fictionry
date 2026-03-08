import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase-admin';
import { checkRateLimit } from '@/lib/rate-limit';
import { createNotification } from '@/lib/create-notification';
import { sendEmail } from '@/lib/send-email';
import { NewReviewEmail } from '@/components/emails/new-review-email';
import { NextResponse } from 'next/server';
import { createElement } from 'react';

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { story_id, overall_rating, review_text } = body;

  if (!story_id || !overall_rating) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  // Rate limit: 5 ratings per hour
  const rateLimit = await checkRateLimit(supabase, user.id, 'review');
  if (!rateLimit.allowed) {
    return NextResponse.json({ error: rateLimit.message }, { status: 429 });
  }

  // Fetch story metadata and user's reading depth in parallel
  const [storyResult, chaptersReadResult, wordsReadResult] = await Promise.all([
    supabase.from('stories').select('chapter_count, word_count, author_id').eq('id', story_id).single(),
    supabase.from('chapter_reads').select('id', { count: 'exact', head: true }).eq('user_id', user.id).eq('story_id', story_id),
    supabase.from('chapter_reads').select('chapters!chapter_id(word_count)').eq('user_id', user.id).eq('story_id', story_id),
  ]);

  const story = storyResult.data;
  if (!story) return NextResponse.json({ error: 'Story not found' }, { status: 404 });

  // Block authors from rating their own stories
  if (story.author_id === user.id) {
    return NextResponse.json({ error: 'Cannot rate your own story' }, { status: 403 });
  }

  const chaptersRead = chaptersReadResult.count ?? 0;
  const wordsRead = (wordsReadResult.data ?? []).reduce((sum: number, row: any) => {
    const wc = Array.isArray(row.chapters) ? row.chapters[0]?.word_count : row.chapters?.word_count;
    return sum + (wc ?? 0);
  }, 0);

  const storyWords = story.word_count ?? 0;
  const minWordsByPercent = Math.min(12000, Math.max(1500, Math.round(0.35 * storyWords)));

  // Eligibility: 3 chapters OR 6,000 words OR 35% of available (clamped 1500–12000)
  const isEligible =
    chaptersRead >= 3 ||
    wordsRead >= 6000 ||
    (storyWords > 0 && wordsRead >= minWordsByPercent);

  if (!isEligible) {
    return NextResponse.json({ error: 'Read more of the story before rating' }, { status: 403 });
  }

  // Credibility weight based on reading depth
  const totalChapters = story.chapter_count ?? 0;
  const pct = totalChapters > 0 ? chaptersRead / totalChapters : 0;
  const credibilityWeight =
    pct >= 0.90 ? 1.3 :
    pct >= 0.60 || chaptersRead >= 25 ? 1.2 :
    pct >= 0.25 || chaptersRead >= 10 ? 1.1 :
    1.0;

  // Check if review_text qualifies (higher threshold: 5 chapters / 20k words / 50%)
  const minWordsByPctReview = Math.min(25000, Math.max(5000, Math.round(0.50 * storyWords)));
  const reviewEligible =
    chaptersRead >= 5 ||
    wordsRead >= 20000 ||
    (storyWords > 0 && wordsRead >= minWordsByPctReview);

  const { error } = await supabase
    .from('story_ratings')
    .insert({
      story_id,
      user_id: user.id,
      overall_rating,
      review_text: (review_text && reviewEligible) ? review_text.trim() : null,
      chapters_read: chaptersRead,
      words_read_unique: wordsRead,
      credibility_weight: credibilityWeight,
      is_qualified: true,
      updated_at: new Date().toISOString(),
    });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Notify story author (must await — Vercel terminates after response)
  await notifyNewReview({ reviewerId: user.id, storyId: story_id, rating: overall_rating });

  return NextResponse.json({ ok: true });
}

async function notifyNewReview({
  reviewerId,
  storyId,
  rating,
}: {
  reviewerId: string;
  storyId: string;
  rating: number;
}) {
  try {
    const admin = createAdminClient();

    // Fetch story + author info
    const { data: story } = await admin
      .from('stories')
      .select('title, slug, author_id, profiles!author_id(username, display_name)')
      .eq('id', storyId)
      .maybeSingle();

    if (!story) return;
    const authorId: string = story.author_id;
    if (authorId === reviewerId) return; // Don't notify self

    // Fetch reviewer profile
    const { data: reviewerProfile } = await admin
      .from('profiles')
      .select('username, display_name')
      .eq('id', reviewerId)
      .maybeSingle();

    const reviewerName = reviewerProfile?.display_name || reviewerProfile?.username || 'Someone';
    const storyTitle = story.title as string;
    const storyUrl = `https://www.fictionry.com/story/${story.slug}`;

    // Create in-app notification
    const notification = await createNotification({
      user_id: authorId,
      type: 'new_review',
      title: `${reviewerName} rated ${storyTitle}`,
      message: `${rating}/5 stars`,
      link: storyUrl,
    });

    // Fetch author email
    const { data: authorUser } = await admin.auth.admin.getUserById(authorId);
    const email = authorUser?.user?.email;

    if (email && notification) {
      const authorName =
        (story.profiles as any)?.display_name || (story.profiles as any)?.username || 'Author';

      void sendEmail({
        to: email,
        subject: `${reviewerName} rated ${storyTitle}`,
        react: createElement(NewReviewEmail, {
          authorName,
          reviewerName,
          storyTitle,
          rating,
          storyUrl,
        }),
        notificationId: notification.id,
        userId: authorId,
        notificationType: 'new_review',
      });
    }
  } catch (err) {
    console.error('[notifyNewReview] Error:', err);
  }
}
