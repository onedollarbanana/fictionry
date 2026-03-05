import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase-admin';
import { createNotification } from '@/lib/create-notification';
import { sendEmail } from '@/lib/send-email';
import { AuthorAnnouncementEmail } from '@/components/emails/author-announcement-email';
import { NextResponse } from 'next/server';
import { createElement } from 'react';

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { story_id, title, content, scope = 'story' } = body;

  if (!story_id || !title?.trim() || !content?.trim()) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const { error } = await supabase
    .from('announcements')
    .insert({
      story_id,
      author_id: user.id,
      title: title.trim(),
      content: content.trim(),
      scope,
    });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Notify story followers (non-blocking)
  void notifyAnnouncementFollowers({
    authorId: user.id,
    storyId: story_id,
    announcementTitle: title.trim(),
    announcementMessage: content.trim(),
  });

  return NextResponse.json({ ok: true });
}

async function notifyAnnouncementFollowers({
  authorId,
  storyId,
  announcementTitle,
  announcementMessage,
}: {
  authorId: string;
  storyId: string;
  announcementTitle: string;
  announcementMessage: string;
}) {
  try {
    const admin = createAdminClient();

    // Fetch author profile + story
    const [{ data: authorProfile }, { data: story }] = await Promise.all([
      admin.from('profiles').select('username, display_name').eq('id', authorId).maybeSingle(),
      admin.from('stories').select('title, slug').eq('id', storyId).maybeSingle(),
    ]);

    const authorName = authorProfile?.display_name || authorProfile?.username || 'An author';
    const storyTitle = story?.title ?? 'a story';
    const authorProfileUrl = `https://www.fictionry.com/profile/${authorProfile?.username ?? ''}`;

    // Get all story followers
    const { data: followers } = await admin
      .from('follows')
      .select('user_id')
      .eq('story_id', storyId);

    if (!followers?.length) return;

    const followerIds = followers.map((f: { user_id: string }) => f.user_id);

    // Get follower profiles
    const { data: followerProfiles } = await admin
      .from('profiles')
      .select('id, username, display_name')
      .in('id', followerIds);

    const profileMap = new Map(
      (followerProfiles ?? []).map((p) => [p.id, p])
    );

    for (const followerId of followerIds) {
      try {
        // Create in-app notification
        const notification = await createNotification({
          user_id: followerId,
          type: 'announcement',
          title: `${authorName}: ${announcementTitle}`,
          message: announcementMessage.slice(0, 200),
          link: authorProfileUrl,
        });

        // Fetch follower email
        const { data: authUser } = await admin.auth.admin.getUserById(followerId);
        const email = authUser?.user?.email;
        if (!email) continue;

        const profile = profileMap.get(followerId);
        const readerName = profile?.display_name || profile?.username || 'Reader';

        void sendEmail({
          to: email,
          subject: `${authorName}: ${announcementTitle}`,
          react: createElement(AuthorAnnouncementEmail, {
            readerName,
            authorName,
            announcementTitle,
            announcementMessage,
            authorProfileUrl,
          }),
          notificationId: notification?.id,
          userId: followerId,
          notificationType: 'announcement',
        });
      } catch (err) {
        console.error(`[notifyAnnouncementFollowers] Error for follower ${followerId}:`, err);
      }
    }
  } catch (err) {
    console.error('[notifyAnnouncementFollowers] Error:', err);
  }
}
