import { createClient } from '@/lib/supabase/server';
import { sendEmail } from '@/lib/send-email';
import { WelcomeEmail } from '@/components/emails/welcome-email';
import { NextResponse } from 'next/server';
import { createElement } from 'react';

export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name, username')
    .eq('id', user.id)
    .maybeSingle();

  const displayName = profile?.display_name || profile?.username || 'there';

  // Fire-and-forget — never blocks
  void sendEmail({
    to: user.email,
    subject: 'Welcome to Fictionry!',
    react: createElement(WelcomeEmail, { displayName }),
  });

  return NextResponse.json({ ok: true });
}
