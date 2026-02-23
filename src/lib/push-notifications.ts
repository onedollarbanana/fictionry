import { getChapterUrl } from "@/lib/url-utils";
import { createAdminClient } from '@/lib/supabase-admin';

// Lazy initialization for web-push (same pattern as Stripe)
let webpushInitialized = false;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let webpush: any = null;

function getWebPush() {
  if (!webpushInitialized) {
    const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    const privateKey = process.env.VAPID_PRIVATE_KEY;
    const email = process.env.VAPID_EMAIL || 'mailto:support@fictionry.com';

    if (!publicKey || !privateKey) {
      console.warn('VAPID keys not configured — push notifications disabled');
      return null;
    }

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    webpush = require('web-push');
    webpush.setVapidDetails(email, publicKey, privateKey);
    webpushInitialized = true;
  }
  return webpush;
}

export interface PushPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  url?: string;
}

export async function sendPushNotification(
  subscription: { endpoint: string; p256dh: string; auth: string },
  payload: PushPayload
): Promise<boolean> {
  const wp = getWebPush();
  if (!wp) return false;

  try {
    await wp.sendNotification(
      {
        endpoint: subscription.endpoint,
        keys: {
          p256dh: subscription.p256dh,
          auth: subscription.auth,
        },
      },
      JSON.stringify(payload),
      { TTL: 60 * 60 } // 1 hour TTL
    );
    return true;
  } catch (error: unknown) {
    const statusCode = (error as { statusCode?: number })?.statusCode;
    // 404 or 410 means subscription is no longer valid
    if (statusCode === 404 || statusCode === 410) {
      // Clean up invalid subscription
      const supabase = createAdminClient();
      await supabase
        .from('push_subscriptions')
        .delete()
        .eq('endpoint', subscription.endpoint);
    }
    console.error('Push notification failed:', error);
    return false;
  }
}

export async function notifyFollowers(
  storyId: string,
  storyTitle: string,
  chapterTitle: string,
  chapterNumber: number,
  chapterId: string
): Promise<{ sent: number; failed: number }> {
  const wp = getWebPush();
  if (!wp) return { sent: 0, failed: 0 };

  const supabase = createAdminClient();

  // Get followers who want chapter notifications
  const { data: followers, error: followError } = await supabase
    .from('follows')
    .select('user_id')
    .eq('story_id', storyId)
    .eq('notify_new_chapters', true);

  if (followError || !followers?.length) {
    return { sent: 0, failed: 0 };
  }

  const followerIds = followers.map((f: { user_id: string }) => f.user_id);

  // Get push subscriptions for these followers
  const { data: subscriptions, error: subError } = await supabase
    .from('push_subscriptions')
    .select('endpoint, p256dh, auth, user_id')
    .in('user_id', followerIds);

  if (subError || !subscriptions?.length) {
    return { sent: 0, failed: 0 };
  }

  // Look up slug data for clean URLs
  const { data: storyData } = await supabase
    .from('stories')
    .select('slug, short_id')
    .eq('id', storyId)
    .single();

  const { data: chapterData } = await supabase
    .from('chapters')
    .select('slug, short_id')
    .eq('id', chapterId)
    .single();

  const notificationUrl = storyData && chapterData
    ? getChapterUrl(
        { id: storyId, slug: storyData.slug, short_id: storyData.short_id },
        { short_id: chapterData.short_id, slug: chapterData.slug }
      )
    : `/story/${storyId}/chapter/${chapterId}`;

  const payload: PushPayload = {
    title: `New Chapter: ${storyTitle}`,
    body: `Chapter ${chapterNumber}: ${chapterTitle}`,
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png',
    url: notificationUrl,
  };

  let sent = 0;
  let failed = 0;

  // Send notifications in parallel (batched)
  const results = await Promise.allSettled(
    subscriptions.map((sub: { endpoint: string; p256dh: string; auth: string }) =>
      sendPushNotification(sub, payload)
    )
  );

  for (const result of results) {
    if (result.status === 'fulfilled' && result.value) {
      sent++;
    } else {
      failed++;
    }
  }

  return { sent, failed };
}

/**
 * Utility to trigger new chapter notification.
 * Call this from the chapter publish flow.
 */
export async function triggerNewChapterNotification(opts: {
  storyId: string;
  storyTitle: string;
  chapterTitle: string;
  chapterNumber: number;
  chapterId: string;
}) {
  return notifyFollowers(
    opts.storyId,
    opts.storyTitle,
    opts.chapterTitle,
    opts.chapterNumber,
    opts.chapterId
  );
}
