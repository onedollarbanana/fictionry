"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CoverUpload } from "@/components/story/cover-upload";
import { HelpLink } from "@/components/ui/help-link";
import { PrimaryGenreSelector } from "@/components/author/taxonomy/primary-genre-selector";
import { SubgenreSelector } from "@/components/author/taxonomy/subgenre-selector";
import { TagSelector } from "@/components/author/taxonomy/tag-selector";
import { ContentRatingSelector } from "@/components/author/taxonomy/content-rating-selector";
import { ContentWarningsSelector } from "@/components/author/taxonomy/content-warnings-selector";
import { FormatSelector } from "@/components/author/taxonomy/format-selector";
import { OriginTypeToggle } from "@/components/author/taxonomy/origin-type-toggle";
import { FandomPicker } from "@/components/author/taxonomy/fandom-picker";
import { PRIMARY_GENRES, getPrimaryGenreBySlug } from "@/lib/constants";
import { getMinimumRatingForWarnings, type ContentRatingValue } from "@/lib/content-warnings";
import { showToast } from "@/components/ui/toast";
import { AlertTriangle, Info } from "lucide-react";



// Genre change cooldown rules
const COOLDOWN_DAYS = 90;
const MAX_CHANGES_PER_YEAR = 2;

function getCooldownStatus(
  changeCount: number,
  lastChangedAt: string | null
): { canChange: boolean; reason: string | null } {
  if (changeCount === 0) return { canChange: true, reason: null };

  const now = new Date();

  // Check yearly cap
  const yearStart = new Date(now.getFullYear(), 0, 1);
  if (lastChangedAt) {
    const lastChanged = new Date(lastChangedAt);
    const changesThisYear = lastChanged >= yearStart ? 1 : 0; // simplified: tracks via count
    if (changeCount >= MAX_CHANGES_PER_YEAR && lastChanged >= yearStart) {
      return {
        canChange: false,
        reason: `You've reached the maximum of ${MAX_CHANGES_PER_YEAR} genre changes this year.`,
      };
    }
  }

  // Check 90-day cooldown
  if (lastChangedAt) {
    const lastChanged = new Date(lastChangedAt);
    const daysSince = Math.floor(
      (now.getTime() - lastChanged.getTime()) / (1000 * 60 * 60 * 24)
    );
    if (daysSince < COOLDOWN_DAYS) {
      const daysRemaining = COOLDOWN_DAYS - daysSince;
      return {
        canChange: false,
        reason: `Genre can be changed again in ${daysRemaining} day${daysRemaining !== 1 ? "s" : ""}.`,
      };
    }
  }

  return { canChange: true, reason: null };
}

export default function EditStoryPage() {
  const params = useParams();
  const storyId = params.id as string;
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState("");

  // Basic info
  const [title, setTitle] = useState("");
  const [tagline, setTagline] = useState("");
  const [blurb, setBlurb] = useState("");
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [status, setStatus] = useState("ongoing");
  const [visibility, setVisibility] = useState("published");
  const [releaseSchedule, setReleaseSchedule] = useState("");
  const [defaultNoteBefore, setDefaultNoteBefore] = useState("");
  const [defaultNoteAfter, setDefaultNoteAfter] = useState("");
  const [hideCommunityBadge, setHideCommunityBadge] = useState(false);

  // Taxonomy
  const [primaryGenre, setPrimaryGenre] = useState<string | null>(null);
  const [originalPrimaryGenre, setOriginalPrimaryGenre] = useState<string | null>(null);
  const [subgenres, setSubgenres] = useState<string[]>([]);
  const [originType, setOriginType] = useState<"original" | "fan_fiction">("original");
  const [fandoms, setFandoms] = useState<string[]>([]);
  const [secondaryGenre, setSecondaryGenre] = useState<string | null>(null);
  const [tags, setTags] = useState<string[]>([]);
  const [contentRating, setContentRating] = useState<ContentRatingValue | null>(null);
  const [contentWarnings, setContentWarnings] = useState<string[]>([]);
  const [format, setFormat] = useState<string | null>(null);

  // Genre change cooldown tracking
  const [genreChangeCount, setGenreChangeCount] = useState(0);
  const [genreChangedAt, setGenreChangedAt] = useState<string | null>(null);

  const minimumRating = getMinimumRatingForWarnings(contentWarnings);
  const cooldownStatus = getCooldownStatus(genreChangeCount, genreChangedAt);
  const genreChanged = primaryGenre !== originalPrimaryGenre;

  useEffect(() => {
    async function loadStory() {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("stories")
        .select("*")
        .eq("id", storyId)
        .single();

      if (error || !data) {
        router.push("/author/dashboard");
        return;
      }

      setTitle(data.title);
      setTagline(data.tagline || "");
      setBlurb(data.blurb || "");
      setCoverUrl(data.cover_url || null);
      setStatus(data.status || "ongoing");
      setVisibility(data.visibility || "published");
      setReleaseSchedule(data.release_schedule || "");
      setDefaultNoteBefore(data.default_author_note_before || "");
      setDefaultNoteAfter(data.default_author_note_after || "");
      setHideCommunityBadge(data.hide_community_badge || false);

      // Taxonomy
      const pg = data.primary_genre || null;
      setPrimaryGenre(pg);
      setOriginalPrimaryGenre(pg);
      setSubgenres(data.subgenres || []);
      setOriginType(data.origin_type || "original");
      setFandoms(data.fandoms || []);
      setSecondaryGenre(data.secondary_genre || null);
      setTags(data.tags || []);
      setContentRating(data.content_rating || null);
      setContentWarnings(data.content_warnings || []);
      setFormat(data.format || null);
      setGenreChangeCount(data.primary_genre_change_count || 0);
      setGenreChangedAt(data.primary_genre_changed_at || null);

      setInitialLoading(false);
    }

    loadStory();
  }, [storyId, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    // Validate genre change is allowed
    if (genreChanged && originalPrimaryGenre !== null && !cooldownStatus.canChange) {
      setError(cooldownStatus.reason || "Genre change not allowed at this time.");
      setLoading(false);
      return;
    }

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push("/login");
      return;
    }

    const now = new Date().toISOString();
    const updates: Record<string, unknown> = {
      title,
      tagline: tagline || null,
      blurb: blurb || null,
      cover_url: coverUrl,
      status,
      visibility,
      release_schedule: releaseSchedule || null,
      default_author_note_before: defaultNoteBefore || null,
      default_author_note_after: defaultNoteAfter || null,
      hide_community_badge: hideCommunityBadge,
      // Taxonomy
      primary_genre: primaryGenre,
      subgenres,
      origin_type: originType,
      fandoms: originType === "fan_fiction" ? fandoms : [],
      secondary_genre: originType === "fan_fiction" ? secondaryGenre : null,
      tags,
      content_rating: contentRating,
      content_warnings: contentWarnings,
      format,
      updated_at: now,
    };

    // Handle genre change cooldown tracking
    if (genreChanged && primaryGenre !== null) {
      updates.primary_genre_change_count = genreChangeCount + 1;
      updates.primary_genre_changed_at = now;
    }

    const { error: updateError } = await supabase
      .from("stories")
      .update(updates)
      .eq("id", storyId);

    if (updateError) {
      setError(updateError.message);
      setLoading(false);
      return;
    }

    // Log the genre change
    if (genreChanged && primaryGenre !== null) {
      await supabase.from("story_genre_change_log").insert({
        story_id: storyId,
        changed_by: user.id,
        old_genre: originalPrimaryGenre,
        new_genre: primaryGenre,
      });
    }

    showToast("Story updated", "success");
    router.push(`/author/stories/${storyId}`);
  };

  if (initialLoading) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <h1 className="text-3xl font-bold mb-6 flex items-center gap-2">
        Edit Story <HelpLink href="/guides/authors/formatting" label="Formatting guide" />
      </h1>

      <form onSubmit={handleSubmit} className="space-y-8">
        {error && (
          <div className="p-4 bg-destructive/10 text-destructive rounded-md flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
            {error}
          </div>
        )}

        {/* ── Basic Info ─────────────────────────────────────────────────────── */}
        <section className="space-y-4">
          <h2 className="text-lg font-semibold">Basic Info</h2>

          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={title}
              onChange={e => setTitle(e.target.value)}
              required
              placeholder="My Awesome Story"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="tagline">Tagline</Label>
            <Input
              id="tagline"
              value={tagline}
              onChange={e => setTagline(e.target.value)}
              placeholder="e.g., A sword, a secret, and the end of everything"
              maxLength={60}
            />
            <p className="text-xs text-muted-foreground">{tagline.length}/60</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="blurb">Blurb / Description</Label>
            <Textarea
              id="blurb"
              value={blurb}
              onChange={e => setBlurb(e.target.value)}
              placeholder="A short description of your story..."
              rows={4}
              maxLength={2000}
            />
            <p className="text-xs text-muted-foreground">{blurb.length}/2000</p>
          </div>

          <CoverUpload
            storyId={storyId}
            currentCoverUrl={coverUrl}
            onUpload={setCoverUrl}
          />
        </section>

        {/* ── Publication ────────────────────────────────────────────────────── */}
        <section className="space-y-4 border-t pt-6">
          <h2 className="text-lg font-semibold">Publication</h2>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ongoing">Ongoing</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="hiatus">Hiatus</SelectItem>
                  <SelectItem value="dropped">Dropped</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Visibility</Label>
              <Select value={visibility} onValueChange={setVisibility}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="published">Published</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="unlisted">Unlisted</SelectItem>
                  <SelectItem value="removed">Removed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="releaseSchedule">Release Schedule</Label>
            <Input
              id="releaseSchedule"
              value={releaseSchedule}
              onChange={e => setReleaseSchedule(e.target.value)}
              placeholder="e.g., New chapters every Monday & Thursday"
              maxLength={100}
            />
            <p className="text-xs text-muted-foreground">Shown on your story page</p>
          </div>
        </section>

        {/* ── Classification ─────────────────────────────────────────────────── */}
        <section className="space-y-6 border-t pt-6">
          <h2 className="text-lg font-semibold">Classification</h2>

          {/* Origin type */}
          <div className="space-y-2">
            <Label>Origin</Label>
            <OriginTypeToggle value={originType} onChange={v => {
              setOriginType(v);
              if (v === "original") {
                setFandoms([]);
                setSecondaryGenre(null);
              }
            }} />
          </div>

          {originType === "fan_fiction" && (
            <div className="space-y-2">
              <Label>Fandom <span className="text-destructive">*</span></Label>
              <FandomPicker value={fandoms} onChange={setFandoms} />
            </div>
          )}

          {/* Primary genre with cooldown notice */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Primary Genre <span className="text-destructive">*</span></Label>
              {genreChangeCount > 0 && (
                <span className="text-xs text-muted-foreground">
                  Changed {genreChangeCount} time{genreChangeCount !== 1 ? "s" : ""}
                </span>
              )}
            </div>

            {!cooldownStatus.canChange && !genreChanged && (
              <div className="flex items-start gap-2 text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded px-3 py-2">
                <Info className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                {cooldownStatus.reason}
              </div>
            )}

            {genreChanged && originalPrimaryGenre && (
              <div className="flex items-start gap-2 text-xs text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded px-3 py-2">
                <Info className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                Changing from <strong className="mx-1">{getPrimaryGenreBySlug(originalPrimaryGenre)?.name ?? originalPrimaryGenre}</strong> to <strong className="mx-1">{getPrimaryGenreBySlug(primaryGenre!)?.name ?? primaryGenre}</strong>.
                {genreChangeCount === 0 && " This is your first free change — no cooldown."}
                {genreChangeCount > 0 && ` A 90-day cooldown will apply after saving.`}
              </div>
            )}

            <div className={!cooldownStatus.canChange ? "opacity-50 pointer-events-none" : ""}>
              <PrimaryGenreSelector
                value={primaryGenre}
                onChange={v => {
                  setPrimaryGenre(v);
                  setSubgenres([]);
                }}
              />
            </div>
          </div>

          {originType === "fan_fiction" && primaryGenre === "fan-fiction" && (
            <div className="space-y-2">
              <Label>Secondary Genre <span className="text-muted-foreground text-xs font-normal">(optional)</span></Label>
              <div className="flex flex-wrap gap-2">
                {PRIMARY_GENRES.filter(g => g.slug !== "fan-fiction").map(g => (
                  <button
                    key={g.slug}
                    type="button"
                    onClick={() => setSecondaryGenre(secondaryGenre === g.slug ? null : g.slug)}
                    className={`px-3 py-1 rounded-full text-sm transition-colors ${
                      secondaryGenre === g.slug
                        ? "bg-amber-500 text-white"
                        : "bg-muted hover:bg-muted/70"
                    }`}
                  >
                    {g.emoji} {g.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label>Subgenres <span className="text-muted-foreground text-xs font-normal">(optional, up to 3)</span></Label>
            <SubgenreSelector
              primaryGenreSlug={primaryGenre}
              value={subgenres}
              onChange={setSubgenres}
            />
          </div>

          <div className="space-y-2">
            <Label>Tags <span className="text-muted-foreground text-xs font-normal">(optional, up to 12 capped)</span></Label>
            <TagSelector value={tags} onChange={setTags} />
          </div>

          <div className="space-y-2">
            <Label>Content Rating <span className="text-destructive">*</span></Label>
            <ContentRatingSelector
              value={contentRating}
              onChange={v => setContentRating(v)}
              minimumRequired={minimumRating === "everyone" ? null : minimumRating}
            />
          </div>

          <div className="space-y-2">
            <Label>Content Warnings <span className="text-muted-foreground text-xs font-normal">(optional)</span></Label>
            <ContentWarningsSelector
              value={contentWarnings}
              onChange={v => {
                setContentWarnings(v);
                const minRating = getMinimumRatingForWarnings(v);
                const ratingOrder = ["everyone", "teen", "mature", "adult_18"];
                if (contentRating && ratingOrder.indexOf(minRating) > ratingOrder.indexOf(contentRating)) {
                  setContentRating(minRating as ContentRatingValue);
                }
              }}
            />
          </div>

          <div className="space-y-2">
            <Label>Format <span className="text-destructive">*</span></Label>
            <FormatSelector value={format} onChange={setFormat} />
          </div>
        </section>

        {/* ── Community Pick ─────────────────────────────────────────────────── */}
        <section className="border-t pt-6">
          <h2 className="text-lg font-semibold mb-4">Community Pick</h2>
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={!hideCommunityBadge}
              onChange={e => setHideCommunityBadge(!e.target.checked)}
              className="h-4 w-4 rounded border-gray-300"
            />
            <div>
              <span className="text-sm font-medium">Show Community Pick badge on story cover</span>
              <p className="text-sm text-muted-foreground">
                If your story is selected as a Community Pick, a badge will appear on the cover
              </p>
            </div>
          </label>
        </section>

        {/* ── Default Author Notes ───────────────────────────────────────────── */}
        <section className="border-t pt-6">
          <h2 className="text-lg font-semibold mb-4">Default Author Notes</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Automatically added to new chapters. You can edit them per-chapter.
          </p>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="defaultNoteBefore">Default Note (Before Chapter)</Label>
              <Textarea
                id="defaultNoteBefore"
                value={defaultNoteBefore}
                onChange={e => setDefaultNoteBefore(e.target.value)}
                placeholder="e.g., Thanks for reading!"
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="defaultNoteAfter">Default Note (After Chapter)</Label>
              <Textarea
                id="defaultNoteAfter"
                value={defaultNoteAfter}
                onChange={e => setDefaultNoteAfter(e.target.value)}
                placeholder="e.g., Next chapter drops Tuesday."
                rows={3}
              />
            </div>
          </div>
        </section>

        <div className="flex gap-4 pt-4">
          <Button type="submit" disabled={loading}>
            {loading ? "Saving..." : "Save Changes"}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push(`/author/stories/${storyId}`)}
          >
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
