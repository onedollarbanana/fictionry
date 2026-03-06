import { createClient } from '@/lib/supabase/server';
import { ReadingPreferencesClient } from './reading-preferences-client';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Reading Preferences | Settings | Fictionry',
};

export default async function ReadingPreferencesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const [{ data: mutedTags }, { data: blockedAuthors }] = await Promise.all([
    supabase
      .from('user_muted_tags')
      .select('tag, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false }),
    supabase
      .from('user_blocked_authors')
      .select('author_id, created_at, profiles!author_id(username, display_name, avatar_url)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false }),
  ]);

  const tags = (mutedTags || []).map((r) => r.tag as string);
  const authors = (blockedAuthors || []).map((r: any) => ({
    id: r.author_id as string,
    username: r.profiles?.username as string,
    display_name: r.profiles?.display_name as string | null,
    avatar_url: r.profiles?.avatar_url as string | null,
  }));

  return <ReadingPreferencesClient initialMutedTags={tags} initialBlockedAuthors={authors} />;
}
