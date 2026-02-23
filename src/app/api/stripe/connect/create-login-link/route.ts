import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase-admin';

export async function POST() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const adminSupabase = createAdminClient();

    // Look up author's Stripe Connect account
    const { data: account } = await adminSupabase
      .from('author_stripe_accounts')
      .select('stripe_account_id, status')
      .eq('author_id', user.id)
      .maybeSingle();

    if (!account?.stripe_account_id) {
      return NextResponse.json(
        { error: 'No Stripe Connect account found. Please complete onboarding first.' },
        { status: 404 }
      );
    }

    if (account.status !== 'active') {
      return NextResponse.json(
        { error: 'Please complete Stripe onboarding first.' },
        { status: 400 }
      );
    }

    // Generate login link to Stripe Express dashboard
    const loginLink = await stripe.accounts.createLoginLink(account.stripe_account_id);

    return NextResponse.json({ url: loginLink.url });
  } catch (error) {
    console.error('Create login link error:', error);
    return NextResponse.json(
      { error: 'Failed to create Stripe dashboard link' },
      { status: 500 }
    );
  }
}
