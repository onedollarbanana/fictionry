import { createClient } from "@/lib/supabase/server";
import { ReportsClient } from "./reports-client";

export const dynamic = "force-dynamic";

interface ReportRow {
  id: string;
  content_type: string;
  content_id: string;
  reason: string;
  details: string | null;
  status: string;
  created_at: string;
  resolved_at: string | null;
  resolution_notes: string | null;
  reporter: { id: string; username: string; avatar_url: string | null } | null;
  resolver: { username: string } | null;
}

export default async function ReportsPage() {
  const supabase = await createClient();

  // Fetch reports with reporter info
  const { data: reports, error } = await supabase
    .from("reports")
    .select(`
      id,
      content_type,
      content_id,
      reason,
      details,
      status,
      created_at,
      resolved_at,
      resolution_notes,
      reporter:profiles!reporter_id(id, username, avatar_url),
      resolver:profiles!moderator_id(username)
    `)
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    console.error("Error fetching reports:", error);
  }

  // Transform data to match expected types (Supabase returns single objects for !inner joins)
  const transformedReports: ReportRow[] = (reports || []).map((r) => ({
    ...r,
    reporter: Array.isArray(r.reporter) ? r.reporter[0] || null : r.reporter,
    resolver: Array.isArray(r.resolver) ? r.resolver[0] || null : r.resolver,
  }));

  // Look up slug/short_id for story and chapter reports
  const storyIds = transformedReports
    .filter((r) => r.content_type === "story")
    .map((r) => r.content_id);
  const chapterIds = transformedReports
    .filter((r) => r.content_type === "chapter")
    .map((r) => r.content_id);

  const storySlugMap: Record<string, { slug: string; short_id: string }> = {};

  if (storyIds.length > 0) {
    const { data: stories } = await supabase
      .from("stories")
      .select("id, slug, short_id")
      .in("id", storyIds);
    stories?.forEach((s) => {
      storySlugMap[s.id] = { slug: s.slug, short_id: s.short_id };
    });
  }

  if (chapterIds.length > 0) {
    const { data: chapters } = await supabase
      .from("chapters")
      .select("id, slug, short_id, stories!inner(id, slug, short_id)")
      .in("id", chapterIds);
    chapters?.forEach((c) => {
      const story = Array.isArray(c.stories) ? c.stories[0] : c.stories;
      if (story) {
        storySlugMap[`chapter:${c.id}`] = { slug: story.slug, short_id: story.short_id };
        storySlugMap[`chapterSelf:${c.id}`] = { slug: c.slug, short_id: c.short_id };
      }
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Reports Queue</h2>
        <p className="text-muted-foreground">Review and resolve user-submitted reports</p>
      </div>

      <ReportsClient reports={transformedReports} storySlugMap={storySlugMap} />
    </div>
  );
}
