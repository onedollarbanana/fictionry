import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { Sparkles, BookOpen, Settings } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { type StoryCardData } from '@/components/story/story-card';
import { DiscoveryStoryList } from '@/components/discovery/discovery-story-list';
import Link from 'next/link';
import type { Metadata } from 'next';

/* eslint-disable @typescript-eslint/no-explicit-any */

export const metadata: Metadata = {
  title: 'For You | Fictionry',
  description: 'Stories matched to your reading taste',
};

export const dynamic = 'force-dynamic';

export default async function ForYouPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login?next=/for-you');

  const { data, error } = await supabase.rpc('get_best_match_for_you', {
    p_user_id: user.id,
    p_limit: 50,
  });

  if (error) console.error('For You RPC error:', error);

  const stories = (data || []).map((row: any) => ({
    ...row,
    profiles: {
      username: row.author_username,
      display_name: row.author_display_name,
    },
  })) as StoryCardData[];

  // Fetch muted tags count so we can surface the settings link meaningfully
  const { count: mutedCount } = await supabase
    .from('user_muted_tags')
    .select('tag', { count: 'exact', head: true })
    .eq('user_id', user.id);

  const { count: blockedCount } = await supabase
    .from('user_blocked_authors')
    .select('author_id', { count: 'exact', head: true })
    .eq('user_id', user.id);

  const hasControls = (mutedCount ?? 0) > 0 || (blockedCount ?? 0) > 0;

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Sparkles className="h-7 w-7 text-violet-500" />
            For You
          </h1>
          <p className="text-muted-foreground mt-1">
            Stories matched to your reading taste
          </p>
        </div>
        <Link
          href="/settings/reading"
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <Settings className="h-4 w-4" />
          {hasControls ? (
            <span>
              {[
                (mutedCount ?? 0) > 0 && `${mutedCount} muted tag${mutedCount !== 1 ? 's' : ''}`,
                (blockedCount ?? 0) > 0 && `${blockedCount} blocked author${blockedCount !== 1 ? 's' : ''}`,
              ].filter(Boolean).join(' · ')}
            </span>
          ) : (
            <span>Tune your feed</span>
          )}
        </Link>
      </div>

      {stories.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground font-medium mb-2">
              No matches yet
            </p>
            <p className="text-sm text-muted-foreground max-w-sm mx-auto">
              Read a few stories and follow genres you enjoy — your personalised feed will fill in automatically.
            </p>
            <Link
              href="/browse"
              className="mt-4 inline-block text-sm text-primary hover:underline"
            >
              Browse stories to get started
            </Link>
          </CardContent>
        </Card>
      ) : (
        <DiscoveryStoryList stories={stories} surface="best_match" userId={user.id} />
      )}
    </div>
  );
}
