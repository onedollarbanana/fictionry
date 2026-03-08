import { SupabaseClient } from '@supabase/supabase-js'

export type RateLimitAction =
  | 'comment'
  | 'review'
  | 'report'
  | 'follow'
  | 'ticket'
  | 'chapter_publish'
  | 'announcement'

// Rate limit configs: [max_count, window_minutes]
const RATE_LIMITS: Record<RateLimitAction, [number, number]> = {
  comment: [20, 60],          // 20 comments per hour
  review: [5, 60],            // 5 reviews per hour
  report: [10, 60],           // 10 reports per hour
  follow: [30, 60],           // 30 follows per hour
  ticket: [5, 60],            // 5 tickets per hour
  chapter_publish: [10, 60],  // 10 chapter publishes per hour
  announcement: [5, 60],      // 5 announcements per hour (each sends emails to all followers)
}

export async function checkRateLimit(
  supabase: SupabaseClient,
  userId: string,
  action: RateLimitAction
): Promise<{ allowed: boolean; message?: string }> {
  const config = RATE_LIMITS[action]
  if (!config) return { allowed: true }

  const [maxCount, windowMinutes] = config

  const { data, error } = await supabase.rpc('check_rate_limit', {
    p_user_id: userId,
    p_action: action,
    p_max_count: maxCount,
    p_window_minutes: windowMinutes,
  })

  if (error) {
    console.error('Rate limit check failed:', error)
    // Fail open — don't block users if rate limit check errors
    return { allowed: true }
  }

  if (!data) {
    return {
      allowed: false,
      message: `You're doing that too quickly. Please wait a few minutes and try again.`,
    }
  }

  return { allowed: true }
}
