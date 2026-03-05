import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase-admin';
import { createNotification } from '@/lib/create-notification';
import { sendEmail } from '@/lib/send-email';
import { CommentReplyEmail } from '@/components/emails/comment-reply-email';
import { NextResponse } from 'next/server';
import { createElement } from 'react';

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { chapter_id, parent_id, content } = body;

  if (!chapter_id || !content?.trim()) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  // Insert the comment using the user's own client (respects RLS)
  const { data: comment, error } = await supabase
    .from('comments')
    .insert({
      chapter_id,
      user_id: user.id,
      parent_id: parent_id || null,
      content: content.trim(),
    })
    .select('id')
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // If this is a reply, notify the parent comment author
  if (parent_id) {
    void notifyCommentReply({
      replierId: user.id,
      parentCommentId: parent_id,
      chapterId: chapter_id,
      replyText: content.trim(),
    });
  }

  return NextResponse.json({ id: comment.id });
}

async function notifyCommentReply({
  replierId,
  parentCommentId,
  chapterId,
  replyText,
}: {
  replierId: string;
  parentCommentId: string;
  chapterId: string;
  replyText: string;
}) {
  try {
    const admin = createAdminClient();

    // Fetch parent comment author and their profile
    const { data: parentComment } = await admin
      .from('comments')
      .select('user_id, content, profiles!user_id(username, display_name)')
      .eq('id', parentCommentId)
      .maybeSingle();

    if (!parentComment || parentComment.user_id === replierId) return; // Don't notify self

    const parentAuthorId: string = parentComment.user_id;

    // Fetch replier profile
    const { data: replierProfile } = await admin
      .from('profiles')
      .select('username, display_name')
      .eq('id', replierId)
      .maybeSingle();

    // Fetch chapter + story info for the link
    const { data: chapter } = await admin
      .from('chapters')
      .select('short_id, title, stories!story_id(slug, title)')
      .eq('id', chapterId)
      .maybeSingle();

    const storySlug = (chapter?.stories as any)?.slug ?? '';
    const storyTitle = (chapter?.stories as any)?.title ?? 'a story';
    const chapterShortId = chapter?.short_id ?? '';
    const chapterUrl = `https://www.fictionry.com/story/${storySlug}/chapter/${chapterShortId}`;

    const replierName =
      replierProfile?.display_name || replierProfile?.username || 'Someone';
    const originalComment = (parentComment.content as string).slice(0, 200);

    // Create in-app notification
    const notification = await createNotification({
      user_id: parentAuthorId,
      type: 'comment_reply',
      title: `${replierName} replied to your comment`,
      message: `"${replyText.slice(0, 100)}"`,
      link: chapterUrl,
    });

    // Fetch parent author email
    const { data: parentUser } = await admin.auth.admin.getUserById(parentAuthorId);
    const email = parentUser?.user?.email;

    if (email && notification) {
      void sendEmail({
        to: email,
        subject: `${replierName} replied to your comment on ${storyTitle}`,
        react: createElement(CommentReplyEmail, {
          recipientName:
            (parentComment.profiles as any)?.display_name ||
            (parentComment.profiles as any)?.username ||
            'Reader',
          replierName,
          storyTitle,
          originalComment,
          replyText: replyText.slice(0, 300),
          commentUrl: chapterUrl,
        }),
        notificationId: notification.id,
        userId: parentAuthorId,
        notificationType: 'comment_reply',
      });
    }
  } catch (err) {
    console.error('[notifyCommentReply] Error:', err);
  }
}
