"use client";

import Link from "next/link";
import { PRIMARY_GENRES } from "@/lib/constants";
import { Sparkles } from "lucide-react";

const GENRE_COLORS: Record<string, string> = {
  'fantasy': 'bg-purple-500/10 hover:bg-purple-500/20 text-purple-600 dark:text-purple-400',
  'science-fiction': 'bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-600 dark:text-cyan-400',
  'horror': 'bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400',
  'romance': 'bg-pink-500/10 hover:bg-pink-500/20 text-pink-600 dark:text-pink-400',
  'thriller-mystery': 'bg-slate-500/10 hover:bg-slate-500/20 text-slate-600 dark:text-slate-400',
  'action-adventure': 'bg-orange-500/10 hover:bg-orange-500/20 text-orange-600 dark:text-orange-400',
  'comedy-satire': 'bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-600 dark:text-yellow-400',
  'contemporary-fiction': 'bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400',
  'historical-fiction': 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400',
  'literary-fiction': 'bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400',
  'paranormal-supernatural': 'bg-violet-500/10 hover:bg-violet-500/20 text-violet-600 dark:text-violet-400',
  'non-fiction-essay': 'bg-stone-500/10 hover:bg-stone-500/20 text-stone-600 dark:text-stone-400',
  'fan-fiction': 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400',
};

export function GenreLinks() {
  return (
    <section className="mb-10">
      <h2 className="text-lg font-semibold mb-4">Browse by Genre</h2>
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-7 gap-3">
        {PRIMARY_GENRES.map((genre) => (
          <Link
            key={genre.slug}
            href={`/browse/genre/${genre.slug}`}
            className={`flex flex-col items-center gap-2 p-3 rounded-xl transition-all duration-200 hover:scale-105 ${GENRE_COLORS[genre.slug] || 'bg-muted hover:bg-muted/80 text-foreground'}`}
          >
            <span className="text-2xl" role="img" aria-label={genre.name}>{genre.emoji}</span>
            <span className="text-xs font-medium text-center leading-tight">{genre.name}</span>
          </Link>
        ))}
        <Link
          href="/browse"
          className="flex flex-col items-center gap-2 p-3 rounded-xl transition-all duration-200 hover:scale-105 bg-primary/10 hover:bg-primary/20 text-primary"
        >
          <Sparkles className="h-6 w-6" />
          <span className="text-xs font-medium text-center">All Genres</span>
        </Link>
      </div>
    </section>
  );
}
