"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Search, X, SlidersHorizontal } from "lucide-react";
import {
  PRIMARY_GENRES,
  SUBGENRES,
  TAG_GROUPS,
  CONTENT_RATINGS,
  STORY_FORMATS,
} from "@/lib/constants";

// ── Curated Tropes & Relationship picks ───────────────────────────────────────
const CURATED_TROPES_SLUGS = [
  'slow-burn', 'enemies-to-lovers', 'friends-to-lovers', 'found-family',
  'fated-mates', 'forced-proximity', 'reincarnation', 'regression',
  'time-loop', 'revenge-plot', 'redemption-arc', 'dungeon-diving',
];

const CURATED_TROPES = (() => {
  const romanticsGroup = TAG_GROUPS.find(g => g.slug === 'romantic-relationship');
  const tropesGroup = TAG_GROUPS.find(g => g.slug === 'tropes-story-patterns');
  const allTags = [...(romanticsGroup?.tags ?? []), ...(tropesGroup?.tags ?? [])];
  return CURATED_TROPES_SLUGS
    .map(slug => allTags.find(t => t.slug === slug))
    .filter(Boolean) as typeof allTags;
})();

// Groups shown inside the filter sheet
const SHEET_TAG_GROUPS = TAG_GROUPS.filter(g =>
  ['tone-mood', 'romantic-relationship', 'tropes-story-patterns', 'character-pov',
   'plot-structure', 'world-setting', 'power-progression', 'representation'].includes(g.slug)
);

const GENRE_COLORS: Record<string, string> = {
  'fantasy': 'bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30',
  'science-fiction': 'bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border-cyan-500/30',
  'horror': 'bg-red-500/15 text-red-700 dark:text-red-300 border-red-500/30',
  'romance': 'bg-pink-500/15 text-pink-700 dark:text-pink-300 border-pink-500/30',
  'thriller-mystery': 'bg-slate-500/15 text-slate-700 dark:text-slate-300 border-slate-500/30',
  'action-adventure': 'bg-orange-500/15 text-orange-700 dark:text-orange-300 border-orange-500/30',
  'comedy-satire': 'bg-yellow-500/15 text-yellow-700 dark:text-yellow-300 border-yellow-500/30',
  'contemporary-fiction': 'bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30',
  'historical-fiction': 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30',
  'literary-fiction': 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-500/30',
  'paranormal-supernatural': 'bg-violet-500/15 text-violet-700 dark:text-violet-300 border-violet-500/30',
  'non-fiction-essay': 'bg-stone-500/15 text-stone-700 dark:text-stone-300 border-stone-500/30',
  'fan-fiction': 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30',
};

const SORT_OPTIONS = [
  { value: "updated", label: "Recently Updated" },
  { value: "newest", label: "Newest First" },
  { value: "popular", label: "Most Popular" },
  { value: "followers", label: "Most Followed" },
  { value: "rating", label: "Highest Rated" },
];

interface BrowseFiltersProps {
  genreCounts?: Record<string, number>;
}

// Small tag pill used inside the Sheet
function FilterTag({
  label,
  active,
  onClick,
  title,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  title?: string;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors border ${
        active
          ? 'bg-primary text-primary-foreground border-primary'
          : 'bg-muted/50 text-muted-foreground border-transparent hover:bg-muted'
      }`}
    >
      {label}
    </button>
  );
}

export function BrowseFilters({ genreCounts }: BrowseFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const currentSearch = searchParams.get("q") || "";
  const currentGenre = searchParams.get("genre") || "";
  const currentSubgenre = searchParams.get("subgenre") || "";
  const currentSort = searchParams.get("sort") || "updated";
  const currentRating = searchParams.get("rating") || "";
  const currentFormat = searchParams.get("format") || "";
  const currentTagsParam = searchParams.get("tag") || "";

  const [searchInput, setSearchInput] = useState(currentSearch);

  const selectedTags = currentTagsParam ? currentTagsParam.split(",").map(t => t.trim()) : [];

  // Count active "detail" filters (shown on the Filters button badge)
  const detailFilterCount =
    selectedTags.length +
    (currentRating ? 1 : 0) +
    (currentFormat ? 1 : 0);

  const updateParams = useCallback((updates: Record<string, string>) => {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(updates)) {
      if (value) params.set(key, value);
      else params.delete(key);
    }
    params.delete("page");
    startTransition(() => {
      router.push(`/browse?${params.toString()}`);
    });
  }, [router, searchParams]);

  const toggleTag = useCallback((slug: string) => {
    const newTags = selectedTags.includes(slug)
      ? selectedTags.filter(t => t !== slug)
      : [...selectedTags, slug];
    updateParams({ tag: newTags.join(",") });
  }, [selectedTags, updateParams]);

  const clearDetailFilters = () => {
    updateParams({ rating: "", format: "", tag: "" });
  };

  const clearAllFilters = () => {
    setSearchInput("");
    startTransition(() => router.push("/browse"));
  };

  const hasAnyFilter = currentSearch || currentGenre || currentSubgenre ||
    currentRating || currentFormat || currentTagsParam || currentSort !== "updated";

  const subgenresForGenre = currentGenre ? (SUBGENRES[currentGenre] ?? []) : [];

  return (
    <div className="space-y-3 mb-6">
      {/* Search */}
      <form
        onSubmit={(e) => { e.preventDefault(); updateParams({ q: searchInput.trim() }); }}
        className="flex gap-2"
      >
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search by title or author..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="pl-10 pr-10"
          />
          {searchInput && (
            <button
              type="button"
              onClick={() => { setSearchInput(""); updateParams({ q: "" }); }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <Button type="submit" disabled={isPending}>Search</Button>
      </form>

      {/* Genre pills */}
      <div className="overflow-x-auto [&::-webkit-scrollbar]:hidden">
        <div className="flex gap-2 pb-1 min-w-max md:min-w-0 md:flex-wrap">
          <button
            onClick={() => updateParams({ genre: "", subgenre: "" })}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition-all border ${
              !currentGenre
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-muted/50 text-muted-foreground border-transparent hover:bg-muted'
            }`}
          >
            All
          </button>
          {PRIMARY_GENRES.map((genre) => {
            const isActive = currentGenre === genre.slug;
            const count = genreCounts?.[genre.slug];
            return (
              <button
                key={genre.slug}
                onClick={() => updateParams({ genre: isActive ? "" : genre.slug, subgenre: "" })}
                className={`flex-shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition-all border ${
                  isActive
                    ? (GENRE_COLORS[genre.slug] || 'bg-primary/15 text-primary border-primary/30') + ' ring-2 ring-primary/30'
                    : 'bg-muted/50 text-muted-foreground border-transparent hover:bg-muted'
                }`}
              >
                {genre.emoji} {genre.name}
                {count ? <span className="ml-1 opacity-50 text-xs">({count})</span> : ''}
              </button>
            );
          })}
        </div>
      </div>

      {/* Subgenre pills — contextual */}
      {currentGenre && subgenresForGenre.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {subgenresForGenre.map((sub) => {
            const isActive = currentSubgenre === sub.slug;
            return (
              <button
                key={sub.slug}
                onClick={() => updateParams({ subgenre: isActive ? "" : sub.slug })}
                title={sub.description}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all border ${
                  isActive
                    ? 'bg-primary/15 text-primary border-primary/40'
                    : 'bg-muted/30 text-muted-foreground border-transparent hover:bg-muted'
                }`}
              >
                {sub.name}
              </button>
            );
          })}
        </div>
      )}

      {/* Compact control bar */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Filters sheet trigger */}
        <Sheet>
          <SheetTrigger asChild>
            <button
              type="button"
              className={`flex items-center gap-1.5 h-9 px-3 rounded-md text-sm font-medium border transition-colors ${
                detailFilterCount > 0
                  ? 'bg-primary/10 border-primary/30 text-primary hover:bg-primary/15'
                  : 'bg-background border-input text-foreground hover:bg-muted'
              }`}
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              Filters
              {detailFilterCount > 0 && (
                <span className="bg-primary text-primary-foreground rounded-full px-1.5 py-0.5 text-xs leading-none">
                  {detailFilterCount}
                </span>
              )}
            </button>
          </SheetTrigger>

          <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
            <SheetHeader className="mb-4">
              <div className="flex items-center justify-between">
                <SheetTitle>Filters</SheetTitle>
                {detailFilterCount > 0 && (
                  <button
                    onClick={clearDetailFilters}
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Clear all ({detailFilterCount})
                  </button>
                )}
              </div>
            </SheetHeader>

            <div className="space-y-6">
              {/* Content Rating */}
              <section>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                  Content Rating
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {CONTENT_RATINGS.map((r) => (
                    <FilterTag
                      key={r.value}
                      label={r.label}
                      active={currentRating === r.value}
                      onClick={() => updateParams({ rating: currentRating === r.value ? "" : r.value })}
                      title={r.description}
                    />
                  ))}
                </div>
              </section>

              {/* Format */}
              <section>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                  Format
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {STORY_FORMATS.map((fmt) => (
                    <FilterTag
                      key={fmt.value}
                      label={fmt.label}
                      active={currentFormat === fmt.value}
                      onClick={() => updateParams({ format: currentFormat === fmt.value ? "" : fmt.value })}
                      title={fmt.description}
                    />
                  ))}
                </div>
              </section>

              {/* All tag groups */}
              {SHEET_TAG_GROUPS.map((group) => (
                <section key={group.slug}>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                    {group.name}
                    {!group.countsTowardCap && (
                      <span className="ml-1.5 text-xs normal-case font-normal opacity-60">unlimited</span>
                    )}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {group.tags.map((tag) => (
                      <FilterTag
                        key={tag.slug}
                        label={tag.name}
                        active={selectedTags.includes(tag.slug)}
                        onClick={() => toggleTag(tag.slug)}
                        title={tag.description}
                      />
                    ))}
                  </div>
                </section>
              ))}
            </div>
          </SheetContent>
        </Sheet>

        {/* Sort */}
        <select
          value={currentSort}
          onChange={(e) => updateParams({ sort: e.target.value })}
          className="h-9 rounded-md border border-input bg-background px-3 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
        >
          {SORT_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        {/* Clear all */}
        {hasAnyFilter && (
          <button
            type="button"
            onClick={clearAllFilters}
            className="flex items-center gap-1 h-9 px-3 text-sm text-muted-foreground hover:text-foreground transition-colors rounded-md hover:bg-muted"
          >
            <X className="h-3.5 w-3.5" />
            Clear all
          </button>
        )}

        {isPending && (
          <span className="text-xs text-muted-foreground">Loading…</span>
        )}
      </div>
    </div>
  );
}
