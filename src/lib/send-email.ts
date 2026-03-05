import { getResend } from '@/lib/resend';
import { createAdminClient } from '@/lib/supabase-admin';
import type { ReactElement } from 'react';

interface SendEmailOptions {
  to: string;
  subject: string;
  react: ReactElement;
  notificationId?: string; // For deduplication + marking email_sent
  userId?: string;         // For preference check
  notificationType?: string; // e.g. 'new_chapter', 'comment_reply', 'new_review', 'announcement'
}

/**
 * Fire-and-forget email sender. Never throws — all errors are caught and logged.
 * Checks email preferences and deduplicates against recent sends.
 */
export async function sendEmail(opts: SendEmailOptions): Promise<void> {
  try {
    const supabase = createAdminClient();

    // Check email preference if user + type provided
    if (opts.userId && opts.notificationType) {
      const { data: pref } = await supabase
        .from('notification_preferences')
        .select('enabled')
        .eq('user_id', opts.userId)
        .eq('notification_type', opts.notificationType)
        .eq('channel', 'email')
        .maybeSingle();

      // If a preference row exists and is disabled, skip
      if (pref && !pref.enabled) return;
      // If no row exists, default is opt-in (send)
    }

    // Deduplication: check if notification was emailed in the last 5 minutes
    if (opts.notificationId) {
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      const { data: notif } = await supabase
        .from('notifications')
        .select('email_sent, email_sent_at')
        .eq('id', opts.notificationId)
        .maybeSingle();

      if (notif?.email_sent && notif.email_sent_at && notif.email_sent_at > fiveMinutesAgo) {
        return; // Already sent recently
      }
    }

    await getResend().emails.send({
      from: process.env.EMAIL_FROM!,
      to: opts.to,
      subject: opts.subject,
      react: opts.react,
    });

    // Mark notification as emailed
    if (opts.notificationId) {
      await supabase
        .from('notifications')
        .update({ email_sent: true, email_sent_at: new Date().toISOString() })
        .eq('id', opts.notificationId);
    }
  } catch (err) {
    console.error('[sendEmail] Failed to send email:', err);
  }
}
