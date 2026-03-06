export const revalidate = 60;

import { createClient } from "@/lib/supabase/server";
import { BookOpen } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { type StoryCardData } from "@/components/story/story-card";
import { DiscoveryStoryList } from "@/components/discovery/discovery-story-list";

/* eslint-disable @typescript-eslint/no-explicit-any */

export const metadata = {
  title: "Rising Across Fictionry | Fictionry",
  description: "The best rising stories from every genre — curated by reader engagement",
};

export default async function PopularPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data, error } = await supabase.rpc('get_cross_genre_rising', { p_limit: 30 });
  if (error) console.error("Cross-genre rising error:", error);

  const stories = (data || []).map((row: any) => ({
    ...row,
    profiles: {
      username: row.author_username,
      display_name: row.author_display_name,
    },
  })) as StoryCardData[];

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Rising Across Fictionry</h1>
        <p className="text-muted-foreground mt-1">
          The best rising stories from every genre — ranked by reader engagement
        </p>
      </div>

      {stories.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">Check back soon!</p>
          </CardContent>
        </Card>
      ) : (
        <DiscoveryStoryList stories={stories} surface="popular" userId={user?.id ?? null} />
      )}
    </div>
  );
}
