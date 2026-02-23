import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase-admin';
import { PLATFORM_CONFIG, type TierName } from '@/lib/platform-config';

const VALID_TIER_NAMES: TierName[] = ['supporter', 'enthusiast', 'patron'];

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const adminSupabase = createAdminClient();

    const { data: tiers, error } = await adminSupabase
      .from('author_tiers')
      .select('*')
      .eq('author_id', user.id)
      .order('tier_name');

    if (error) {
      console.error('Fetch tiers error:', error);
      return NextResponse.json({ error: 'Failed to fetch tiers' }, { status: 500 });
    }

    // Return tiers with price info from platform config
    const tiersWithPrices = VALID_TIER_NAMES.map((tierName) => {
      const existing = tiers?.find((t) => t.tier_name === tierName);
      return {
        tier_name: tierName,
        display_name: PLATFORM_CONFIG.TIER_NAMES[tierName],
        price_cents: PLATFORM_CONFIG.TIER_PRICES[tierName],
        enabled: existing?.enabled ?? false,
        description: existing?.description ?? '',
      };
    });

    return NextResponse.json({ tiers: tiersWithPrices });
  } catch (error) {
    console.error('Get tiers error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tiers' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { tiers } = await request.json();

    if (!Array.isArray(tiers)) {
      return NextResponse.json({ error: 'Tiers must be an array' }, { status: 400 });
    }

    const adminSupabase = createAdminClient();

    // Validate and upsert each tier
    const upsertData = tiers
      .filter((t: { tier_name: string }) => VALID_TIER_NAMES.includes(t.tier_name as TierName))
      .map((t: { tier_name: string; enabled?: boolean; description?: string }) => ({
        author_id: user.id,
        tier_name: t.tier_name,
        enabled: t.enabled ?? false,
        description: t.description ?? '',
        updated_at: new Date().toISOString(),
      }));

    if (upsertData.length === 0) {
      return NextResponse.json({ error: 'No valid tiers provided' }, { status: 400 });
    }

    const { error } = await adminSupabase
      .from('author_tiers')
      .upsert(upsertData, { onConflict: 'author_id,tier_name' });

    if (error) {
      console.error('Upsert tiers error:', error);
      return NextResponse.json({ error: 'Failed to update tiers' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Update tiers error:', error);
    return NextResponse.json(
      { error: 'Failed to update tiers' },
      { status: 500 }
    );
  }
}
