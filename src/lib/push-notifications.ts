import { getChapterUrl } from "@/lib/url-utils";
import { createAdminClient } from '@/lib/supabase-admin';
import { sendEmail } from '@/lib/send-email';
import { createNotification } from '@/lib/create-notification';
import { NewChapterEmail } from '@/components/emails/new-chapter-email';
import { createElement } from 'react';

// Lazy initialization for web-push (same pattern as Stripe)
let webpushInitialized = false;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let webpush: any = null;

const TIER_HIERARCHY: Record<string, number> = {
  supporter: 1,
  enthusiast: 2,
  patron: 3,
};

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

/**
 * Tier-aware notification system.
 * When a new chapter is published, each follower gets notified about the chapter
 * that just became accessible to THEIR tier level:
 * - Free followers: the chapter that just became free (shifted out of gating window)
 * - Supporter followers: the chapter that just entered supporter's window
 * - Enthusiast followers: the chapter that just entered enthusiast's window
 * - Patron (highest): always the newly published chapter
 *
 * If no gating is configured, everyone gets notified about the new chapter.
 */
export async function notifyFollowers(
  storyId: string,
  storyTitle: string,
  chapterTitle: string,
  chapterNumber: number,
  chapterId: string
): Promise<{ sent: number; failed: number }> {
  const wp = getWebPush();
  const supabase = createAdminClient();

  // Get story author
  const { data: story } = await supabase
    .from('stories')
    .select('author_id, slug, short_id')
    .eq('id', storyId)
    .single();

  if (!story) return { sent: 0, failed: 0 };

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

  // Get tier settings for this story
  const { data: tierSettings } = await supabase
    .from('story_tier_settings')
    .select('tier_name, advance_chapter_count')
    .eq('story_id', storyId);

  // Get enabled tiers for author
  const { data: authorTiers } = await supabase
    .from('author_tiers')
    .select('tier_name, enabled')
    .eq('author_id', story.author_id)
    .eq('enabled', true);

  const enabledTiers = new Set((authorTiers ?? []).map(t => t.tier_name));
  const settingsMap = new Map(
    (tierSettings ?? []).map(s => [s.tier_name, s.advance_chapter_count as number])
  );

  // Calculate gating windows
  const highestAdvance = Math.max(0, ...Array.from(settingsMap.values()));
  const totalPublished = chapterNumber; // The new chapter IS the latest
  const freeCutoff = Math.max(0, totalPublished - highestAdvance);

  // Determine which chapter each tier level should be notified about
  // Key: tier hierarchy level (0=free, 1=supporter, 2=enthusiast, 3=patron)
  // Value: { chapterNumber, chapterTitle, chapterId }
  interface NotifyTarget {
    chapterNumber: number;
    chapterTitle: string;
    chapterId: string;
    slug: string | null;
    shortId: string | null;
  }

  // If no gating configured, everyone sees the new chapter
  const noGating = highestAdvance === 0 || enabledTiers.size === 0;

  // Get all published chapters ordered by number for looking up which chapter to notify about
  const { data: publishedChapters } = await supabase
    .from('chapters')
    .select('id, chapter_number, title, slug, short_id')
    .eq('story_id', storyId)
    .eq('is_published', true)
    .order('chapter_number', { ascending: true });

  const chaptersByNumber = new Map(
    (publishedChapters ?? []).map(c => [c.chapter_number, c])
  );

  // Build notification targets per tier level
  const tierTargets = new Map<number, NotifyTarget>(); // key = hierarchy level (0=free)

  if (noGating) {
    // Everyone gets the new chapter
    const ch = chaptersByNumber.get(chapterNumber);
    const target: NotifyTarget = {
      chapterNumber,
      chapterTitle,
      chapterId,
      slug: ch?.slug ?? null,
      shortId: ch?.short_id ?? null,
    };
    tierTargets.set(0, target);
    tierTargets.set(1, target);
    tierTargets.set(2, target);
    tierTargets.set(3, target);
  } else {
    // Free users: chapter at position freeCutoff (if > 0)
    if (freeCutoff > 0) {
      const ch = chaptersByNumber.get(freeCutoff);
      if (ch) {
        tierTargets.set(0, {
          chapterNumber: ch.chapter_number,
          chapterTitle: ch.title,
          chapterId: ch.id,
          slug: ch.slug,
          shortId: ch.short_id,
        });
      }
    }
    // No notification for free if freeCutoff is 0 (all chapters gated)

    // For each tier, compute which chapter position they should be notified about
    const tierNames: Array<[string, number]> = [
      ['supporter', 1],
      ['enthusiast', 2],
      ['patron', 3],
    ];

    for (const [tierName, tierLevel] of tierNames) {
      if (!enabledTiers.has(tierName)) continue;

      const advance = settingsMap.get(tierName) ?? 0;
      const targetPosition = freeCutoff + advance;

      // For the highest enabled tier, always notify about the new chapter
      const isHighestEnabled = !tierNames.some(
        ([tn, tl]) => tl > tierLevel && enabledTiers.has(tn)
      );

      if (isHighestEnabled) {
        const ch = chaptersByNumber.get(chapterNumber);
        tierTargets.set(tierLevel, {
          chapterNumber,
          chapterTitle,
          chapterId,
          slug: ch?.slug ?? null,
          shortId: ch?.short_id ?? null,
        });
      } else if (targetPosition > 0 && targetPosition <= totalPublished) {
        const ch = chaptersByNumber.get(targetPosition);
        if (ch) {
          tierTargets.set(tierLevel, {
            chapterNumber: ch.chapter_number,
            chapterTitle: ch.title,
            chapterId: ch.id,
            slug: ch.slug,
            shortId: ch.short_id,
          });
        }
      }
    }
  }

  // Get active subscriptions for the followers to determine their tier
  const { data: authorSubs } = await supabase
    .from('author_subscriptions')
    .select('subscriber_id, tier_name')
    .eq('author_id', story.author_id)
    .eq('status', 'active')
    .in('subscriber_id', followerIds);

  const userTierMap = new Map<string, number>();
  for (const sub of authorSubs ?? []) {
    const level = TIER_HIERARCHY[sub.tier_name] ?? 0;
    // Keep highest tier if user has multiple
    const current = userTierMap.get(sub.subscriber_id) ?? 0;
    if (level > current) {
      userTierMap.set(sub.subscriber_id, level);
    }
  }

  let sent = 0;
  let failed = 0;

  // Send push notifications only if VAPID is configured and subscribers exist
  if (wp) {
    const { data: subscriptions, error: subError } = await supabase
      .from('push_subscriptions')
      .select('endpoint, p256dh, auth, user_id')
      .in('user_id', followerIds);

    if (!subError && subscriptions?.length) {
      const results = await Promise.allSettled(
        subscriptions.map(async (sub: { endpoint: string; p256dh: string; auth: string; user_id: string }) => {
          const userTierLevel = userTierMap.get(sub.user_id) ?? 0;

          let target: NotifyTarget | undefined;
          for (let level = userTierLevel; level >= 0; level--) {
            target = tierTargets.get(level);
            if (target) break;
          }

          if (!target) return false;

          const notificationUrl = story.slug && target.slug && target.shortId
            ? getChapterUrl(
                { id: storyId, slug: story.slug, short_id: story.short_id },
                { short_id: target.shortId, slug: target.slug }
              )
            : `/story/${storyId}/chapter/${target.chapterId}`;

          const payload: PushPayload = {
            title: `New Chapter Available: ${storyTitle}`,
            body: `Chapter ${target.chapterNumber}: ${target.chapterTitle}`,
            icon: '/icons/icon-192x192.png',
            badge: '/icons/icon-72x72.png',
            url: notificationUrl,
          };

          return sendPushNotification(sub, payload);
        })
      );

      for (const result of results) {
        if (result.status === 'fulfilled' && result.value) {
          sent++;
        } else {
          failed++;
        }
      }
    }
  }

  // Send chapter emails (non-blocking, runs in background)
  void sendChapterEmails({
    supabase,
    followerIds,
    storyId,
    storyTitle,
    chapterTitle,
    chapterNumber,
    tierTargets,
    userTierMap,
    story,
  });

  return { sent, failed };
}

async function sendChapterEmails({
  supabase,
  followerIds,
  storyId,
  storyTitle,
  chapterTitle,
  chapterNumber,
  tierTargets,
  userTierMap,
  story,
}: {
  supabase: ReturnType<typeof createAdminClient>;
  followerIds: string[];
  storyId: string;
  storyTitle: string;
  chapterTitle: string;
  chapterNumber: number;
  tierTargets: Map<number, { chapterNumber: number; chapterTitle: string; chapterId: string; slug: string | null; shortId: string | null }>;
  userTierMap: Map<string, number>;
  story: { author_id: string; slug: string; short_id: string };
}) {
  try {
    // Get author profile for display name
    const { data: authorProfile } = await supabase
      .from('profiles')
      .select('username, display_name')
      .eq('id', story.author_id)
      .maybeSingle();
    const authorName = authorProfile?.display_name || authorProfile?.username || 'The author';

    // Get follower profiles + emails in batch
    const { data: followerProfiles } = await supabase
      .from('profiles')
      .select('id, username, display_name')
      .in('id', followerIds);

    const profileMap = new Map(
      (followerProfiles ?? []).map((p) => [p.id, p])
    );

    // Fetch emails via auth admin in batch (process sequentially to avoid hammering)
    for (const followerId of followerIds) {
      try {
        const userTierLevel = userTierMap.get(followerId) ?? 0;
        let target: { chapterNumber: number; chapterTitle: string; shortId: string | null } | undefined;
        for (let level = userTierLevel; level >= 0; level--) {
          target = tierTargets.get(level);
          if (target) break;
        }
        if (!target) continue;

        const { data: authUser } = await supabase.auth.admin.getUserById(followerId);
        const email = authUser?.user?.email;
        if (!email) continue;

        const profile = profileMap.get(followerId);
        const readerName = profile?.display_name || profile?.username || 'Reader';
        const chapterShortId = target.shortId ?? '';
        const chapterUrl = `https://www.fictionry.com/story/${story.slug}/chapter/${chapterShortId}`;

        // Create in-app notification
        const notification = await createNotification({
          user_id: followerId,
          type: 'new_chapter',
          title: `New chapter: ${storyTitle}`,
          message: `Chapter ${target.chapterNumber}: ${target.chapterTitle}`,
          link: chapterUrl,
        });

        void sendEmail({
          to: email,
          subject: `New chapter: ${storyTitle} — Chapter ${target.chapterNumber}`,
          react: createElement(NewChapterEmail, {
            readerName,
            storyTitle,
            chapterTitle: target.chapterTitle,
            authorName,
            chapterUrl,
          }),
          notificationId: notification?.id,
          userId: followerId,
          notificationType: 'new_chapter',
        });
      } catch (err) {
        console.error(`[sendChapterEmails] Error for follower ${followerId}:`, err);
      }
    }
  } catch (err) {
    console.error('[sendChapterEmails] Error:', err);
  }
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
