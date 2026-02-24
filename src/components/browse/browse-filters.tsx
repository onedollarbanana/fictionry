"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, X, ChevronDown, ChevronUp } from "lucide-react";
import { TAGS } from "@/lib/constants";

const GENRES = [
  "Fantasy",
  "Sci-Fi", 
  "LitRPG",
  "Romance",
  "Horror",
  "Mystery",
  "Thriller",
  "Adventure",
  "Slice of Life",
  "Comedy",
  "Drama",
  "Action",
  "Historical",
  "Urban Fantasy",
  "Progression Fantasy",
];

const SORT_OPTIONS = [
  { value: "updated", label: "Recently Updated" },
  { value: "newest", label: "Newest First" },
  { value: "popular", label: "Most Popular" },
  { value: "followers", label: "Most Followed" },
  { value: "rating", label: "Highest Rated" },
];

const GENRE_CONFIG: Record<string, { color: string }> = {
  'Fantasy': { color: 'bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30' },
  'Sci-Fi': { color: 'bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border-cyan-500/30' },
  'Romance': { color: 'bg-pink-500/15 text-pink-600 dark:text-pink-400 border-pink-500/30' },
  'Mystery': { color: 'bg-slate-500/15 text-slate-600 dark:text-slate-400 border-slate-500/30' },
  'Horror': { color: 'bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30' },
  'LitRPG': { color: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30' },
  'Historical': { color: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30' },
  'Thriller': { color: 'bg-orange-500/15 text-orange-600 dark:text-orange-400 border-orange-500/30' },
  'Adventure': { color: 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30' },
  'Comedy': { color: 'bg-yellow-500/15 text-yellow-600 dark:text-yellow-400 border-yellow-500/30' },
  'Drama': { color: 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border-indigo-500/30' },
  'Action': { color: 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30' },
};

function getGenreTagline(genre: string): string {
  const taglines: Record<string, string> = {
    'Fantasy': 'Swords, sorcery, and worlds beyond imagination',
    'Sci-Fi': 'Explore the frontiers of technology and space',
    'Romance': 'Love stories that make your heart race',
    'Mystery': 'Unravel secrets and solve the puzzle',
    'Horror': 'Tales that lurk in the shadows',
    'LitRPG': 'Level up with game-infused adventures',
    'Historical': 'Journey through the ages',
    'Thriller': 'Edge-of-your-seat suspense',
    'Adventure': 'Epic journeys and daring quests',
    'Comedy': 'Stories that keep you laughing',
    'Drama': 'Compelling characters, powerful emotions',
    'Action': 'Non-stop thrills and explosive moments',
    'Slice of Life': 'Everyday moments, extraordinary stories',
    'Urban Fantasy': 'Magic hidden in the modern world',
    'Progression Fantasy': 'Watch heroes grow stronger',
  };
  return taglines[genre] || `Discover the best ${genre} stories`;
}

interface BrowseFiltersProps {
  genreCounts?: Record<string, number>;
}

export function BrowseFilters({ genreCounts }: BrowseFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const currentSearch = searchParams.get("q") || "";
  const currentGenre = searchParams.get("genre") || "";
  const currentSort = searchParams.get("sort") || "updated";
  const currentTags = searchParams.get("tag") || "";

  const [searchInput, setSearchInput] = useState(currentSearch);
  const [showTags, setShowTags] = useState(false);

  const selectedTags = currentTags ? currentTags.split(",").map(t => t.trim()) : [];

  const updateParams = useCallback((key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    // Reset to page 1 when filters change
    params.delete("page");
    startTransition(() => {
      router.push(`/browse?${params.toString()}`);
    });
  }, [router, searchParams]);

  const toggleTag = useCallback((tag: string) => {
    const newTags = selectedTags.includes(tag)
      ? selectedTags.filter(t => t !== tag)
      : [...selectedTags, tag];
    updateParams("tag", newTags.join(","));
  }, [selectedTags, updateParams]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    updateParams("q", searchInput.trim());
  };

  const clearSearch = () => {
    setSearchInput("");
    updateParams("q", "");
  };

  const clearAllFilters = () => {
    setSearchInput("");
    startTransition(() => {
      router.push("/browse");
    });
  };

  const hasActiveFilters = currentSearch || currentGenre || currentSort !== "updated" || currentTags;

  return (
    <div className="space-y-4 mb-8">
      {/* Search Bar */}
      <form onSubmit={handleSearch} className="flex gap-2">
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
              onClick={clearSearch}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <Button type="submit" disabled={isPending}>
          Search
        </Button>
      </form>

      {/* Genre Pills */}
      <div className="overflow-x-auto">
        <div className="flex overflow-x-auto md:flex-wrap md:overflow-x-visible pb-2 md:pb-0 gap-2 [&::-webkit-scrollbar]:hidden">
          <button
            onClick={() => updateParams("genre", "")}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition-all border ${
              !currentGenre 
                ? 'bg-primary text-primary-foreground border-primary' 
                : 'bg-muted/50 text-muted-foreground border-transparent hover:bg-muted'
            }`}
          >
            All Genres
          </button>
          {GENRES.map((genre) => {
            const isActive = currentGenre === genre;
            const config = GENRE_CONFIG[genre];
            const count = genreCounts?.[genre];
            return (
              <button
                key={genre}
                onClick={() => updateParams("genre", isActive ? "" : genre)}
                className={`flex-shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition-all border ${
                  isActive
                    ? (config?.color || 'bg-primary/15 text-primary border-primary/30') + ' ring-2 ring-primary/30'
                    : 'bg-muted/50 text-muted-foreground border-transparent hover:bg-muted'
                }`}
              >
                {genre}
                {count ? <span className="ml-1 opacity-60">({count})</span> : ''}
              </button>
            );
          })}
        </div>
        {currentGenre && (
          <p className="text-sm text-muted-foreground italic mt-2">
            {getGenreTagline(currentGenre)}
          </p>
        )}
      </div>

      {/* Filters Row */}
      <div className="flex flex-wrap gap-3 items-center">
        {/* Sort */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Sort:</span>
          <select
            value={currentSort}
            onChange={(e) => updateParams("sort", e.target.value)}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {/* Tag Toggle */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowTags(!showTags)}
          className="text-sm"
        >
          {showTags ? <ChevronUp className="h-4 w-4 mr-1" /> : <ChevronDown className="h-4 w-4 mr-1" />}
          {showTags ? "Hide tags" : "Show tags"}
          {selectedTags.length > 0 && (
            <span className="ml-1 bg-primary text-primary-foreground rounded-full px-1.5 py-0.5 text-xs">
              {selectedTags.length}
            </span>
          )}
        </Button>

        {/* Clear Filters */}
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearAllFilters}
            className="text-muted-foreground"
          >
            <X className="h-4 w-4 mr-1" />
            Clear filters
          </Button>
        )}
      </div>

      {/* Tag Selector */}
      {showTags && (
        <div className="flex flex-wrap gap-2 p-4 border rounded-lg bg-muted/30">
          {TAGS.map((tag) => (
            <button
              key={tag}
              onClick={() => toggleTag(tag)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                selectedTags.includes(tag)
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              {tag}
            </button>
          ))}
        </div>
      )}

      {/* Active filter indicator */}
      {isPending && (
        <div className="text-sm text-muted-foreground">Loading...</div>
      )}
    </div>
  );
}
