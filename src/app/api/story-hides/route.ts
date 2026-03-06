import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let story_id: string;
  try {
    ({ story_id } = await request.json());
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }

  if (!story_id || typeof story_id !== 'string') {
    return NextResponse.json({ error: 'story_id required' }, { status: 400 });
  }

  const { error } = await supabase
    .from('story_hides')
    .upsert({ user_id: user.id, story_id }, { onConflict: 'user_id,story_id' });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let story_id: string;
  try {
    ({ story_id } = await request.json());
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }

  const { error } = await supabase
    .from('story_hides')
    .delete()
    .eq('user_id', user.id)
    .eq('story_id', story_id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
