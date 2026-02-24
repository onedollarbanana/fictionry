"use client";

import Link from "next/link";
import { 
  Sword, 
  Rocket, 
  Heart, 
  Search, 
  Skull, 
  Gamepad2, 
  Scroll,
  Sparkles
} from "lucide-react";

const genres = [
  { name: "Fantasy", icon: Sword, color: "bg-purple-500/10 hover:bg-purple-500/20 text-purple-600 dark:text-purple-400" },
  { name: "Sci-Fi", icon: Rocket, color: "bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-600 dark:text-cyan-400" },
  { name: "Romance", icon: Heart, color: "bg-pink-500/10 hover:bg-pink-500/20 text-pink-600 dark:text-pink-400" },
  { name: "Mystery", icon: Search, color: "bg-slate-500/10 hover:bg-slate-500/20 text-slate-600 dark:text-slate-400" },
  { name: "Horror", icon: Skull, color: "bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400" },
  { name: "LitRPG", icon: Gamepad2, color: "bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400" },
  { name: "Historical", icon: Scroll, color: "bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400" },
  { name: "All Genres", icon: Sparkles, color: "bg-primary/10 hover:bg-primary/20 text-primary" },
];

export function GenreLinks() {
  return (
    <section className="mb-10">
      <h2 className="text-lg font-semibold mb-4">Browse by Genre</h2>
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
        {genres.map((genre) => {
          const Icon = genre.icon;
          const href = genre.name === "All Genres" 
            ? "/browse" 
            : `/browse?genre=${encodeURIComponent(genre.name)}`;
          
          return (
            <Link
              key={genre.name}
              href={href}
              className={`flex flex-col items-center gap-2 p-3 rounded-xl transition-all duration-200 hover:scale-105 ${genre.color}`}
            >
              <Icon className="h-6 w-6" />
              <span className="text-xs font-medium text-center">{genre.name}</span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
