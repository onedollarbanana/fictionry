export const revalidate = 60;

import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { Tag, BookOpen } from "lucide-react";
import { TagGrid } from "./tag-grid";
import { TAG_GROUPS, ALL_TAGS } from "@/lib/constants";

export const metadata = {
  title: "Browse by Tag | Fictionry",
  description: "Explore stories by content tags on Fictionry",
};

export default async function TagsPage() {
  const supabase = await createClient();

  const { data: stories } = await supabase
    .from("stories")
    .select("tags")
    .eq("visibility", "published")
    .gt("chapter_count", 0);

  // Count stories per tag slug
  const tagCounts: Record<string, number> = {};
  stories?.forEach((story) => {
    story.tags?.forEach((tagSlug: string) => {
      tagCounts[tagSlug] = (tagCounts[tagSlug] || 0) + 1;
    });
  });

  // Build enriched tag list with labels and group names
  const tagItems = Object.entries(tagCounts)
    .map(([slug, count]) => {
      const tagDef = ALL_TAGS.find(t => t.slug === slug);
      const groupDef = TAG_GROUPS.find(g => g.tags.some(t => t.slug === slug));
      return {
        slug,
        label: tagDef?.name ?? slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
        group: groupDef?.name ?? 'Other',
        count,
      };
    })
    .sort((a, b) => b.count - a.count);

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="flex items-center gap-3 mb-2">
        <Tag className="h-7 w-7 text-primary" />
        <h1 className="text-3xl font-bold">Browse by Tag</h1>
      </div>
      <p className="text-muted-foreground mb-8">
        Explore stories by specific content tags
      </p>

      {tagItems.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">
              No tagged stories yet. Be the first to write one!
            </p>
          </CardContent>
        </Card>
      ) : (
        <TagGrid tags={tagItems} />
      )}
    </div>
  );
}
