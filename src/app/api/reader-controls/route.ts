import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

type Action = 'mute_tag' | 'unmute_tag' | 'block_author' | 'unblock_author';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { action, tag, author_id }: { action: Action; tag?: string; author_id?: string } = body;

    switch (action) {
      case 'mute_tag': {
        if (!tag || typeof tag !== 'string' || tag.trim().length === 0) {
          return NextResponse.json({ error: 'tag required' }, { status: 400 });
        }
        const { error } = await supabase
          .from('user_muted_tags')
          .insert({ user_id: user.id, tag: tag.trim().toLowerCase() })
          .select()
          .single();
        if (error && error.code !== '23505') throw error; // ignore duplicate
        return NextResponse.json({ ok: true });
      }

      case 'unmute_tag': {
        if (!tag) return NextResponse.json({ error: 'tag required' }, { status: 400 });
        await supabase
          .from('user_muted_tags')
          .delete()
          .eq('user_id', user.id)
          .eq('tag', tag.trim().toLowerCase());
        return NextResponse.json({ ok: true });
      }

      case 'block_author': {
        if (!author_id) return NextResponse.json({ error: 'author_id required' }, { status: 400 });
        if (author_id === user.id) return NextResponse.json({ error: 'Cannot block yourself' }, { status: 400 });
        const { error } = await supabase
          .from('user_blocked_authors')
          .insert({ user_id: user.id, author_id })
          .select()
          .single();
        if (error && error.code !== '23505') throw error;
        return NextResponse.json({ ok: true });
      }

      case 'unblock_author': {
        if (!author_id) return NextResponse.json({ error: 'author_id required' }, { status: 400 });
        await supabase
          .from('user_blocked_authors')
          .delete()
          .eq('user_id', user.id)
          .eq('author_id', author_id);
        return NextResponse.json({ ok: true });
      }

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (err) {
    console.error('Reader controls error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
