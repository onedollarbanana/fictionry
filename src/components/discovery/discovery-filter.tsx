"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useCallback } from "react";
import { PRIMARY_GENRES } from "@/lib/constants";

interface Props {
  showOngoingToggle?: boolean;
}

export function DiscoveryFilter({ showOngoingToggle = false }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const currentGenre = searchParams.get("genre") || "";
  const ongoingOnly = searchParams.get("ongoing") === "true";

  const updateParams = useCallback(
    (key: string, value: string | null) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      params.delete("page");
      const qs = params.toString();
      router.push(qs ? `${pathname}?${qs}` : pathname);
    },
    [router, searchParams, pathname]
  );

  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Genre filter — value is slug, matches primary_genre column */}
      <select
        value={currentGenre}
        onChange={(e) => updateParams("genre", e.target.value || null)}
        className="h-9 rounded-md border border-input bg-background px-3 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
      >
        <option value="">All Genres</option>
        {PRIMARY_GENRES.map((genre) => (
          <option key={genre.slug} value={genre.slug}>
            {genre.emoji} {genre.name}
          </option>
        ))}
      </select>

      {/* Ongoing toggle */}
      {showOngoingToggle && (
        <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
          <input
            type="checkbox"
            checked={ongoingOnly}
            onChange={(e) =>
              updateParams("ongoing", e.target.checked ? "true" : null)
            }
            className="h-4 w-4 rounded border-input accent-primary"
          />
          <span className="text-muted-foreground">Ongoing only</span>
        </label>
      )}
    </div>
  );
}
