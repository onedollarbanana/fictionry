"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";

export type GenreSurface = "new" | "rising" | "trending" | "top" | "complete";

interface Tab {
  value: GenreSurface;
  label: string;
  description: string;
  disabled?: boolean;
}

const TABS: Tab[] = [
  { value: "new",      label: "New",      description: "Fresh stories just published" },
  { value: "rising",   label: "Rising",   description: "Gaining traction fast" },
  { value: "trending", label: "Trending", description: "Hot right now" },
  { value: "top",      label: "Top Rated", description: "Highest rated by readers" },
  { value: "complete", label: "Complete", description: "Finished stories" },
];

interface GenreSurfaceTabsProps {
  currentSurface: GenreSurface;
  genreSlug: string;
  emptySurfaces?: GenreSurface[];
}

export function GenreSurfaceTabs({ currentSurface, genreSlug, emptySurfaces = [] }: GenreSurfaceTabsProps) {
  return (
    <div className="flex gap-1 flex-wrap">
      {TABS.map((tab) => {
        const isEmpty = emptySurfaces.includes(tab.value);
        const isActive = tab.value === currentSurface;
        const href = `/browse/genre/${genreSlug}?surface=${tab.value}`;

        return (
          <Link
            key={tab.value}
            href={isEmpty ? "#" : href}
            title={tab.description}
            aria-disabled={isEmpty}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-medium transition-colors",
              isActive
                ? "bg-primary text-primary-foreground"
                : isEmpty
                  ? "text-muted-foreground/40 cursor-not-allowed pointer-events-none"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
