"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { PLATFORM_CONFIG, TierName } from "@/lib/platform-config";
import { Button } from "@/components/ui/button";
import { Lock, Unlock, Info } from "lucide-react";
import { showToast } from "@/components/ui/toast";

// Tier hierarchy order (lowest to highest)
const TIER_HIERARCHY: TierName[] = ["supporter", "enthusiast", "patron"];

interface TierSetting {
  tierName: TierName;
  enabled: boolean;
  advanceChapterCount: number;
}

interface ChapterGatingConfigProps {
  storyId: string;
  publishedChapterCount: number;
}

export function ChapterGatingConfig({ storyId, publishedChapterCount }: ChapterGatingConfigProps) {
  const [tiers, setTiers] = useState<TierSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [originalValues, setOriginalValues] = useState<Record<string, number>>({});

  const loadTierSettings = useCallback(async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Load author's enabled tiers
    const { data: authorTiers } = await supabase
      .from("author_tiers")
      .select("tier_name, enabled")
      .eq("author_id", user.id);

    // Load story-specific settings
    const { data: storySettings } = await supabase
      .from("story_tier_settings")
      .select("tier_name, advance_chapter_count")
      .eq("story_id", storyId);

    const settingsMap = new Map(
      (storySettings ?? []).map(s => [s.tier_name, s.advance_chapter_count])
    );

    const enabledMap = new Map(
      (authorTiers ?? []).map(t => [t.tier_name, t.enabled])
    );

    // Build tier settings in hierarchy order - ALL tiers configurable
    const tierSettings: TierSetting[] = TIER_HIERARCHY
      .filter(name => enabledMap.get(name) === true)
      .map(name => ({
        tierName: name,
        enabled: true,
        advanceChapterCount: settingsMap.get(name) ?? 0,
      }));

    setTiers(tierSettings);
    const originals: Record<string, number> = {};
    tierSettings.forEach(t => { originals[t.tierName] = t.advanceChapterCount; });
    setOriginalValues(originals);
    setHasChanges(false);
    setLoading(false);
  }, [storyId]);

  useEffect(() => {
    loadTierSettings();
  }, [loadTierSettings]);

  const updateAdvanceCount = (tierName: TierName, rawValue: string) => {
    // Allow empty string for clearing the field
    const parsed = rawValue === "" ? 0 : parseInt(rawValue, 10);
    const newVal = isNaN(parsed) ? 0 : Math.max(0, Math.min(99, parsed));
    setTiers(prev => prev.map(t =>
      t.tierName === tierName ? { ...t, advanceChapterCount: newVal } : t
    ));
    setHasChanges(true);
  };

  const getValidationError = (): string | null => {
    // Higher tiers must have >= advance count of lower tiers
    for (let i = 1; i < tiers.length; i++) {
      if (tiers[i].advanceChapterCount < tiers[i - 1].advanceChapterCount) {
        return `${PLATFORM_CONFIG.TIER_NAMES[tiers[i].tierName]} must have at least as many advance chapters as ${PLATFORM_CONFIG.TIER_NAMES[tiers[i - 1].tierName]}`;
      }
    }
    return null;
  };

  const save = async () => {
    const error = getValidationError();
    if (error) {
      showToast(error, "error");
      return;
    }

    setSaving(true);
    const supabase = createClient();

    // Upsert ALL tier settings (including highest)
    const upserts = tiers.map(t => ({
      story_id: storyId,
      tier_name: t.tierName,
      advance_chapter_count: t.advanceChapterCount,
    }));

    if (upserts.length > 0) {
      const { error: upsertError } = await supabase
        .from("story_tier_settings")
        .upsert(upserts, { onConflict: "story_id,tier_name" });

      if (upsertError) {
        showToast("Failed to save gating settings", "error");
        setSaving(false);
        return;
      }
    }

    showToast("Chapter gating updated! Chapters will be recalculated automatically.", "success");
    setSaving(false);
    setHasChanges(false);
    // Reload to reflect trigger-recalculated values
    loadTierSettings();
  };

  // Compute preview of gating
  const getGatingPreview = () => {
    if (tiers.length === 0 || publishedChapterCount === 0) return null;

    // Highest advance count determines free cutoff
    const highestAdvance = Math.max(...tiers.map(t => t.advanceChapterCount));

    // If all advance counts are 0, everything is free
    if (highestAdvance === 0) return null;

    const freeCutoff = Math.max(0, publishedChapterCount - highestAdvance);

    const preview: { label: string; from: number; to: number; color: string }[] = [];

    if (freeCutoff > 0) {
      preview.push({
        label: "Free",
        from: 1,
        to: freeCutoff,
        color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
      });
    }

    // Each tier gets an exclusive window
    let lastEnd = freeCutoff;

    for (const tier of tiers) {
      const tierEnd = freeCutoff + tier.advanceChapterCount;
      if (tierEnd > lastEnd && lastEnd < publishedChapterCount) {
        preview.push({
          label: `${PLATFORM_CONFIG.TIER_NAMES[tier.tierName]}+`,
          from: lastEnd + 1,
          to: Math.min(tierEnd, publishedChapterCount),
          color: tier === tiers[tiers.length - 1]
            ? "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200"
            : "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
        });
        lastEnd = Math.min(tierEnd, publishedChapterCount);
      }
    }

    return preview;
  };

  if (loading) {
    return (
      <div className="p-4 rounded-lg border bg-card">
        <p className="text-muted-foreground text-sm">Loading gating settings...</p>
      </div>
    );
  }

  if (tiers.length === 0) {
    return (
      <div className="p-4 rounded-lg border bg-card">
        <div className="flex items-center gap-2 mb-2">
          <Unlock className="w-4 h-4 text-muted-foreground" />
          <h3 className="font-semibold">Chapter Gating</h3>
        </div>
        <p className="text-sm text-muted-foreground">
          All chapters are free. Enable subscriber tiers on your{" "}
          <a href="/author/dashboard/monetization" className="text-amber-600 hover:underline">
            monetization page
          </a>{" "}
          to gate advance chapters for paying subscribers.
        </p>
      </div>
    );
  }

  const preview = getGatingPreview();
  const validationError = getValidationError();

  return (
    <div className="p-4 rounded-lg border bg-card">
      <div className="flex items-center gap-2 mb-4">
        <Lock className="w-4 h-4" />
        <h3 className="font-semibold">Chapter Gating</h3>
      </div>

      <p className="text-sm text-muted-foreground mb-4">
        Set how many chapters ahead each tier gets. The newest chapters are gated;
        older ones become free as you publish more. Higher tiers must have more advance
        chapters than lower tiers.
      </p>

      <div className="space-y-3">
        {tiers.map((tier) => (
          <div key={tier.tierName} className="flex items-center gap-3">
            <label className="text-sm font-medium w-28 shrink-0">
              {PLATFORM_CONFIG.TIER_NAMES[tier.tierName]}
              <span className="text-muted-foreground font-normal ml-1">
                (${(PLATFORM_CONFIG.TIER_PRICES[tier.tierName] / 100).toFixed(0)}/mo)
              </span>
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={2}
                value={tier.advanceChapterCount || ""}
                placeholder="0"
                onChange={(e) => updateAdvanceCount(tier.tierName, e.target.value)}
                className="w-16 px-2 py-1 text-sm rounded border bg-background text-center"
              />
              <span className="text-sm text-muted-foreground">chapters ahead</span>
            </div>
          </div>
        ))}
      </div>

      {validationError && (
        <p className="text-sm text-red-500 mt-3 flex items-center gap-1">
          <Info className="w-3 h-3" /> {validationError}
        </p>
      )}

      {/* Preview */}
      {preview && preview.length > 0 && (
        <div className="mt-4 pt-4 border-t">
          <p className="text-xs font-medium text-muted-foreground mb-2">
            Preview ({publishedChapterCount} published chapters):
          </p>
          <div className="flex flex-wrap gap-1.5">
            {preview.map((p, i) => (
              <span key={i} className={`px-2 py-0.5 rounded text-xs font-medium ${p.color}`}>
                {p.label}: Ch. {p.from}{p.from !== p.to ? `–${p.to}` : ""}
              </span>
            ))}
          </div>
        </div>
      )}

      {hasChanges && (
        <div className="mt-4 flex gap-2">
          <Button
            size="sm"
            onClick={save}
            disabled={saving || !!validationError}
          >
            {saving ? "Saving..." : "Save Gating Settings"}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={loadTierSettings}
            disabled={saving}
          >
            Cancel
          </Button>
        </div>
      )}
    </div>
  );
}
