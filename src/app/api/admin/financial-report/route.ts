import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const supabase = await createClient();

  // Auth check — admin only
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();
  if (profile?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const period = request.nextUrl.searchParams.get('period') || 'this_month';

  // Calculate start date based on period
  const now = new Date();
  let startDate: string | null = null;
  if (period === 'this_month') {
    startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  } else if (period === 'last_3_months') {
    startDate = new Date(now.getFullYear(), now.getMonth() - 3, 1).toISOString();
  } else if (period === 'this_year') {
    startDate = new Date(now.getFullYear(), 0, 1).toISOString();
  }
  // all_time: startDate stays null

  // Fetch transactions (capped at 10,000 rows — use a tighter period filter for all-time if this is hit)
  let txQuery = supabase.from('transactions').select('*').limit(10000);
  if (startDate) {
    txQuery = txQuery.gte('created_at', startDate);
  }
  const { data: transactions } = await txQuery;
  const txList = transactions ?? [];

  // Revenue calculations
  const succeeded = txList.filter(t => t.status === 'succeeded' && t.type !== 'refund');
  const refunds = txList.filter(t => t.type === 'refund');

  const grossRevenue = succeeded.reduce((s, t) => s + (t.amount_cents ?? 0), 0);
  const totalStripeFees = succeeded.reduce((s, t) => s + (t.stripe_fee_cents ?? 0), 0);
  const totalPlatformFees = succeeded.reduce((s, t) => s + (t.platform_fee_cents ?? 0), 0);
  const totalAuthorEarnings = succeeded.reduce((s, t) => s + (t.author_earning_cents ?? 0), 0);
  const totalRefunds = refunds.reduce((s, t) => s + Math.abs(t.amount_cents ?? 0), 0);

  // Monthly breakdown
  const monthlyMap = new Map<string, { gross: number; platformFees: number; authorEarnings: number; stripeFees: number; refunds: number }>();
  for (const t of txList) {
    if (!t.created_at) continue;
    const d = new Date(t.created_at);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    if (!monthlyMap.has(key)) {
      monthlyMap.set(key, { gross: 0, platformFees: 0, authorEarnings: 0, stripeFees: 0, refunds: 0 });
    }
    const entry = monthlyMap.get(key)!;
    if (t.type === 'refund') {
      entry.refunds += Math.abs(t.amount_cents ?? 0);
    } else if (t.status === 'succeeded') {
      entry.gross += t.amount_cents ?? 0;
      entry.platformFees += t.platform_fee_cents ?? 0;
      entry.authorEarnings += t.author_earning_cents ?? 0;
      entry.stripeFees += t.stripe_fee_cents ?? 0;
    }
  }
  const monthlyBreakdown = Array.from(monthlyMap.entries())
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([month, data]) => ({ month, ...data }));

  // Subscription stats (capped at 5,000 rows — replace with aggregate DB queries if this is hit)
  const { data: allSubs } = await supabase.from('subscriptions').select('*').limit(5000);
  const subsList = allSubs ?? [];

  const activeSubs = subsList.filter(s => s.status === 'active');
  const totalActive = activeSubs.length;

  let newInPeriod = 0;
  let canceledInPeriod = 0;
  const filteredSubs = startDate
    ? subsList.filter(s => s.created_at && s.created_at >= startDate)
    : subsList;
  newInPeriod = filteredSubs.length;

  const canceledSubs = startDate
    ? subsList.filter(s => s.canceled_at && s.canceled_at >= startDate)
    : subsList.filter(s => s.canceled_at);
  canceledInPeriod = canceledSubs.length;

  const readerPremiumActive = activeSubs.filter(s => s.type === 'reader_premium').length;
  const authorSupportActive = activeSubs.filter(s => s.type === 'author_support').length;

  // MRR calculation
  const monthlySubs = activeSubs.filter(s => s.billing_interval === 'monthly');
  const annualSubs = activeSubs.filter(s => s.billing_interval === 'yearly' || s.billing_interval === 'annual');
  const monthlyMRR = monthlySubs.reduce((s, sub) => s + (sub.amount_cents ?? 0), 0);
  const annualMRR = annualSubs.length > 0
    ? Math.round(annualSubs.reduce((s, sub) => s + (sub.amount_cents ?? 0), 0) / 12)
    : 0;
  const mrr = monthlyMRR + annualMRR;

  // Top earning authors
  const authorMap = new Map<string, { authorId: string; earnings: number }>();
  for (const t of succeeded) {
    if (!t.author_id) continue;
    if (!authorMap.has(t.author_id)) {
      authorMap.set(t.author_id, { authorId: t.author_id, earnings: 0 });
    }
    authorMap.get(t.author_id)!.earnings += t.author_earning_cents ?? 0;
  }
  const topAuthorEntries = Array.from(authorMap.values())
    .sort((a, b) => b.earnings - a.earnings)
    .slice(0, 10);

  // Fetch author usernames
  let topAuthors: Array<{ authorId: string; username: string; earnings: number }> = [];
  if (topAuthorEntries.length > 0) {
    const authorIds = topAuthorEntries.map(a => a.authorId);
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, username')
      .in('id', authorIds);
    const profileMap = new Map((profiles ?? []).map(p => [p.id, p.username ?? 'Unknown']));
    topAuthors = topAuthorEntries.map(a => ({
      authorId: a.authorId,
      username: profileMap.get(a.authorId) ?? 'Unknown',
      earnings: a.earnings,
    }));
  }

  return NextResponse.json({
    summary: {
      grossRevenue,
      totalStripeFees,
      totalPlatformFees,
      totalAuthorEarnings,
      totalRefunds,
      mrr,
    },
    monthlyBreakdown,
    subscriptions: {
      totalActive,
      newInPeriod,
      canceledInPeriod,
      byType: {
        reader_premium: readerPremiumActive,
        author_support: authorSupportActive,
      },
    },
    topAuthors,
  });
}
