import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase-admin';
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
  const { story_id, overall_rating, style_rating, story_rating, grammar_rating, character_rating, chapters_read } = body;

  if (!story_id || !overall_rating) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const ratingData = {
    story_id,
    user_id: user.id,
    overall_rating,
    style_rating: style_rating ?? null,
    story_rating: story_rating ?? null,
    grammar_rating: grammar_rating ?? null,
    character_rating: character_rating ?? null,
    chapters_read: chapters_read ?? 0,
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase
    .from('story_ratings')
    .insert(ratingData);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Notify story author (non-blocking)
  void notifyNewReview({ reviewerId: user.id, storyId: story_id, rating: overall_rating });

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
