import { createAdminClient } from '@/lib/supabase-admin';

interface CreateNotificationParams {
  user_id: string;
  type: string;
  title: string;
  message: string;
  link?: string | null;
  metadata?: Record<string, unknown>;
}

/**
 * Insert an in-app notification using the admin client (bypasses RLS).
 * Returns the created notification row, or null on error.
 */
export async function createNotification(
  params: CreateNotificationParams
): Promise<{ id: string } | null> {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('notifications')
      .insert({
        user_id: params.user_id,
        type: params.type,
        title: params.title,
        message: params.message,
        link: params.link ?? null,
        metadata: params.metadata ?? null,
        email_sent: false,
      })
      .select('id')
      .single();

    if (error) {
      console.error('[createNotification] Error:', error);
      return null;
    }
    return data;
  } catch (err) {
    console.error('[createNotification] Unexpected error:', err);
    return null;
  }
}
