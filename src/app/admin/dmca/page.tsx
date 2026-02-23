import { createClient } from "@/lib/supabase/server";
import { DmcaClient } from "./dmca-client";

export const dynamic = "force-dynamic";

export default async function DmcaPage() {
  const supabase = await createClient();

  // Fetch DMCA claims
  const { data: claims } = await supabase
    .from("dmca_claims")
    .select(`
      *,
      story:stories(id, title, author_id, slug, short_id),
      handler:profiles!handled_by(username)
    `)
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">DMCA Claims</h2>
        <p className="text-muted-foreground">
          Handle copyright takedown requests
        </p>
      </div>

      <DmcaClient claims={claims || []} />
    </div>
  );
}
