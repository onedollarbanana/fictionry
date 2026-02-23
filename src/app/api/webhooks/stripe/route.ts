import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import Stripe from 'stripe';
import { PLATFORM_CONFIG } from '@/lib/platform-config';

export const dynamic = 'force-dynamic';

// Use service role for webhook operations (not user-scoped)
function getAdminSupabase() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

type AdminClient = ReturnType<typeof getAdminSupabase>;

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get('stripe-signature');

  if (!signature) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  const supabase = getAdminSupabase();

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.metadata?.type === 'reader_premium' && session.subscription) {
          const subscription = await stripe.subscriptions.retrieve(
            session.subscription as string
          );
          await handleSubscriptionCreated(supabase, subscription);
        } else if (session.metadata?.type === 'author_subscription' && session.subscription) {
          // Handle author subscription checkout
          const subscription = await stripe.subscriptions.retrieve(
            session.subscription as string
          );
          await handleAuthorSubscriptionCreated(supabase, subscription);
        }
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        if (subscription.metadata.type === 'author_subscription') {
          await handleAuthorSubscriptionUpdated(supabase, subscription);
        } else {
          await handleSubscriptionUpdated(supabase, subscription);
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        if (subscription.metadata.type === 'author_subscription') {
          await handleAuthorSubscriptionDeleted(supabase, subscription);
        } else {
          await handleSubscriptionDeleted(supabase, subscription);
        }
        break;
      }

      case 'invoice.paid': {
        const invoice = event.data.object as Stripe.Invoice;
        await handleInvoicePaid(supabase, invoice);
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        await handlePaymentFailed(supabase, invoice);
        break;
      }

      case 'account.updated': {
        const account = event.data.object as Stripe.Account;
        const authorId = account.metadata?.author_id;
        if (!authorId) {
          // Try to find by stripe_account_id if metadata missing
          const { data: existing } = await supabase
            .from('author_stripe_accounts')
            .select('author_id')
            .eq('stripe_account_id', account.id)
            .maybeSingle();
          if (!existing) break;
          await supabase
            .from('author_stripe_accounts')
            .update({
              status: account.details_submitted ? 'active' as const : 'pending' as const,
              charges_enabled: account.charges_enabled || false,
              payouts_enabled: account.payouts_enabled || false,
              onboarded_at: account.details_submitted ? new Date().toISOString() : null,
              updated_at: new Date().toISOString(),
            })
            .eq('stripe_account_id', account.id);
        } else {
          // Upsert - creates record if initial save failed
          await supabase
            .from('author_stripe_accounts')
            .upsert({
              author_id: authorId,
              stripe_account_id: account.id,
              status: account.details_submitted ? 'active' as const : 'pending' as const,
              charges_enabled: account.charges_enabled || false,
              payouts_enabled: account.payouts_enabled || false,
              onboarded_at: account.details_submitted ? new Date().toISOString() : null,
              updated_at: new Date().toISOString(),
            }, { onConflict: 'author_id' });
        }
        break;
      }
    }
  } catch (error) {
    console.error(`Webhook handler error for ${event.type}:`, error);
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

// Helper to safely get period timestamps from subscription
// Stripe v20 types may not expose these directly but they're in the API response
function getSubscriptionPeriod(subscription: Stripe.Subscription) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sub = subscription as any;
  const start = sub.current_period_start;
  const end = sub.current_period_end;
  return {
    start: typeof start === 'number' ? new Date(start * 1000).toISOString() : new Date().toISOString(),
    end: typeof end === 'number' ? new Date(end * 1000).toISOString() : new Date(Date.now() + 30 * 86400000).toISOString(),
  };
}

// Helper to safely access Invoice properties that Stripe v20 types don't expose
// These fields still exist in the API response but were removed from TypeScript types
function getInvoiceFields(invoice: Stripe.Invoice) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const inv = invoice as any;
  return {
    subscription: inv.subscription as string | null,
    amountPaid: (inv.amount_paid ?? inv.amountPaid ?? 0) as number,
    hostedInvoiceUrl: (inv.hosted_invoice_url ?? inv.hostedInvoiceUrl ?? null) as string | null,
    paymentIntent: (typeof inv.payment_intent === 'string' ? inv.payment_intent : null) as string | null,
  };
}

async function handleSubscriptionCreated(
  supabase: AdminClient,
  subscription: Stripe.Subscription
) {
  const userId = subscription.metadata.user_id;
  if (!userId) return;

  const item = subscription.items.data[0];
  const interval = item.price.recurring?.interval === 'year' ? 'annual' : 'monthly';
  const period = getSubscriptionPeriod(subscription);

  // Upsert subscription record
  await supabase.from('subscriptions').upsert({
    user_id: userId,
    type: 'reader_premium',
    status: 'active',
    billing_interval: interval,
    stripe_subscription_id: subscription.id,
    stripe_customer_id: subscription.customer as string,
    stripe_price_id: item.price.id,
    amount_cents: item.price.unit_amount || (interval === 'annual' ? 3000 : 300),
    currency: item.price.currency || 'usd',
    current_period_start: period.start,
    current_period_end: period.end,
    cancel_at_period_end: subscription.cancel_at_period_end,
  }, { onConflict: 'stripe_subscription_id' });

  // Update profile premium status
  await supabase
    .from('profiles')
    .update({ is_premium: true })
    .eq('id', userId);
}

async function handleSubscriptionUpdated(
  supabase: AdminClient,
  subscription: Stripe.Subscription
) {
  const userId = subscription.metadata.user_id;
  if (!userId) return;

  const mapStatus = (s: string): string => {
    switch (s) {
      case 'active': return 'active';
      case 'past_due': return 'past_due';
      case 'canceled': return 'canceled';
      case 'incomplete': return 'incomplete';
      case 'trialing': return 'trialing';
      default: return 'incomplete';
    }
  };

  const period = getSubscriptionPeriod(subscription);

  await supabase
    .from('subscriptions')
    .update({
      status: mapStatus(subscription.status),
      cancel_at_period_end: subscription.cancel_at_period_end,
      canceled_at: subscription.canceled_at
        ? new Date(subscription.canceled_at * 1000).toISOString()
        : null,
      current_period_start: period.start,
      current_period_end: period.end,
      updated_at: new Date().toISOString(),
    })
    .eq('stripe_subscription_id', subscription.id);

  // Update premium status
  const isPremium = subscription.status === 'active' || subscription.status === 'trialing';
  await supabase
    .from('profiles')
    .update({ is_premium: isPremium })
    .eq('id', userId);
}

async function handleSubscriptionDeleted(
  supabase: AdminClient,
  subscription: Stripe.Subscription
) {
  const userId = subscription.metadata.user_id;
  if (!userId) return;

  await supabase
    .from('subscriptions')
    .update({
      status: 'canceled',
      canceled_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('stripe_subscription_id', subscription.id);

  // Check if user has any other active premium subs
  const { data: otherSubs } = await supabase
    .from('subscriptions')
    .select('id')
    .eq('user_id', userId)
    .eq('type', 'reader_premium')
    .eq('status', 'active')
    .neq('stripe_subscription_id', subscription.id);

  if (!otherSubs || otherSubs.length === 0) {
    await supabase
      .from('profiles')
      .update({ is_premium: false })
      .eq('id', userId);
  }
}

// --- Author Subscription Handlers ---

async function handleAuthorSubscriptionCreated(
  supabase: AdminClient,
  subscription: Stripe.Subscription
) {
  const subscriberId = subscription.metadata.subscriber_id;
  const authorId = subscription.metadata.author_id;
  const tierName = subscription.metadata.tier_name;
  if (!subscriberId || !authorId || !tierName) return;

  const item = subscription.items.data[0];
  const amountCents = item.price.unit_amount || 0;
  const period = getSubscriptionPeriod(subscription);

  // Upsert author_subscriptions record
  await supabase.from('author_subscriptions').upsert({
    subscriber_id: subscriberId,
    author_id: authorId,
    tier_name: tierName,
    stripe_subscription_id: subscription.id,
    status: 'active',
    amount_cents: amountCents,
    current_period_start: period.start,
    current_period_end: period.end,
    cancel_at_period_end: subscription.cancel_at_period_end,
  }, { onConflict: 'subscriber_id,author_id' });

  // Record revenue for author
  const platformFeeCents = Math.round(amountCents * PLATFORM_CONFIG.PLATFORM_FEE_PERCENT / 100);
  const netAmountCents = amountCents - platformFeeCents;

  await supabase.from('author_revenue').insert({
    author_id: authorId,
    subscription_id: null, // Will be linked after upsert
    gross_amount_cents: amountCents,
    platform_fee_cents: platformFeeCents,
    net_amount_cents: netAmountCents,
    description: `New ${tierName} subscription`,
  });
}

async function handleAuthorSubscriptionUpdated(
  supabase: AdminClient,
  subscription: Stripe.Subscription
) {
  const subscriberId = subscription.metadata.subscriber_id;
  const authorId = subscription.metadata.author_id;
  if (!subscriberId || !authorId) return;

  const mapStatus = (s: string): string => {
    switch (s) {
      case 'active': return 'active';
      case 'past_due': return 'past_due';
      case 'canceled': return 'canceled';
      case 'incomplete': return 'incomplete';
      default: return 'incomplete';
    }
  };

  const period = getSubscriptionPeriod(subscription);

  await supabase
    .from('author_subscriptions')
    .update({
      status: mapStatus(subscription.status),
      cancel_at_period_end: subscription.cancel_at_period_end,
      current_period_start: period.start,
      current_period_end: period.end,
      updated_at: new Date().toISOString(),
    })
    .eq('stripe_subscription_id', subscription.id);
}

async function handleAuthorSubscriptionDeleted(
  supabase: AdminClient,
  subscription: Stripe.Subscription
) {
  await supabase
    .from('author_subscriptions')
    .update({
      status: 'canceled',
      updated_at: new Date().toISOString(),
    })
    .eq('stripe_subscription_id', subscription.id);
}

async function handleInvoicePaid(
  supabase: AdminClient,
  invoice: Stripe.Invoice
) {
  const inv = getInvoiceFields(invoice);
  if (!inv.subscription) return;

  // Get subscription to find user/metadata
  const sub = await stripe.subscriptions.retrieve(inv.subscription);

  // Check if this is an author subscription payment
  if (sub.metadata.type === 'author_subscription') {
    const authorId = sub.metadata.author_id;
    const tierName = sub.metadata.tier_name;
    if (!authorId) return;

    const amountPaid = inv.amountPaid;
    const platformFeeCents = Math.round(amountPaid * PLATFORM_CONFIG.PLATFORM_FEE_PERCENT / 100);
    const netAmountCents = amountPaid - platformFeeCents;

    // Record revenue
    const { error: revenueError } = await supabase.from('author_revenue').insert({
      author_id: authorId,
      gross_amount_cents: amountPaid,
      platform_fee_cents: platformFeeCents,
      net_amount_cents: netAmountCents,
      description: `${tierName} subscription renewal`,
    });
    if (revenueError) console.error('Failed to insert author_revenue:', revenueError);

    // Record transaction
    const { error: txError } = await supabase.from('transactions').insert({
      user_id: sub.metadata.subscriber_id || null,
      type: 'author_subscription_payment',
      status: 'succeeded',
      amount_cents: amountPaid,
      currency: invoice.currency,
      author_id: authorId,
      platform_fee_cents: platformFeeCents,
      author_earning_cents: netAmountCents,
      stripe_payment_intent_id: inv.paymentIntent,
      stripe_invoice_id: invoice.id,
      stripe_receipt_url: inv.hostedInvoiceUrl,
      description: `${tierName} subscription to author`,
    });
    if (txError) console.error('Failed to insert transaction (author_sub):', txError);

    return; // Don't also process as reader premium
  }

  // Reader premium invoice handling
  const userId = sub.metadata.user_id;
  if (!userId) return;

  // Find our subscription record
  const { data: dbSub } = await supabase
    .from('subscriptions')
    .select('id')
    .eq('stripe_subscription_id', inv.subscription)
    .maybeSingle();

  const { error: readerTxError } = await supabase.from('transactions').insert({
    user_id: userId,
    subscription_id: dbSub?.id || null,
    type: 'reader_premium_payment',
    status: 'succeeded',
    amount_cents: inv.amountPaid,
    currency: invoice.currency,
    stripe_payment_intent_id: inv.paymentIntent,
    stripe_invoice_id: invoice.id,
    stripe_receipt_url: inv.hostedInvoiceUrl,
    description: `Reader Premium - ${sub.items.data[0]?.price?.recurring?.interval === 'year' ? 'Annual' : 'Monthly'}`,
  });
  if (readerTxError) console.error('Failed to insert transaction (reader_premium):', readerTxError);
}

async function handlePaymentFailed(
  supabase: AdminClient,
  invoice: Stripe.Invoice
) {
  const inv = getInvoiceFields(invoice);
  if (!inv.subscription) return;

  await supabase
    .from('subscriptions')
    .update({ status: 'past_due', updated_at: new Date().toISOString() })
    .eq('stripe_subscription_id', inv.subscription);
}
