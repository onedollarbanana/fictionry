import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase-admin';

const MAX_BATCH = 50;

const VALID_SURFACES = new Set([
  'homepage', 'browse', 'search', 'genre', 'featured', 'popular',
  'rising', 'new_releases', 'most_followed', 'recently_updated',
  'new_genre', 'rising_genre', 'trending_genre', 'top_genre', 'complete_genre',
  'cross_genre', 'best_match', 'community_picks', 'tag',
]);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { events } = body;

    if (!Array.isArray(events) || events.length === 0) {
      return NextResponse.json({ ok: true });
    }

    if (events.length > MAX_BATCH) {
      return NextResponse.json({ error: 'Too many events' }, { status: 400 });
    }

    // Validate and sanitise events
    const valid = events.filter(
      (e) =>
        typeof e.story_id === 'string' && e.story_id.length > 0 &&
        typeof e.surface === 'string' && VALID_SURFACES.has(e.surface),
    );

    if (valid.length === 0) {
      return NextResponse.json({ ok: true });
    }

    // Optionally attribute to logged-in user (best-effort, no error if it fails)
    let userId: string | null = null;
    try {
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();
      userId = user?.id ?? null;
    } catch {
      // Auth check failure is non-fatal
    }

    const rows = valid.map((e) => ({
      story_id: e.story_id,
      surface: e.surface,
      session_id: typeof e.session_id === 'string' ? e.session_id.substring(0, 32) : null,
      user_id: userId,
    }));

    // Use admin client — bypasses RLS for this write-only operation
    await createAdminClient().from('story_impressions').insert(rows);

    return NextResponse.json({ ok: true });
  } catch {
    // Silently succeed — client ignores errors anyway
    return NextResponse.json({ ok: true });
  }
}
