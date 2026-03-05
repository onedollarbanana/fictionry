"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Tag, Search } from "lucide-react";

interface TagItem {
  slug: string;
  label: string;
  group: string;
  count: number;
}

interface Props {
  tags: TagItem[];
}

export function TagGrid({ tags }: Props) {
  const [search, setSearch] = useState("");

  const filteredTags = search
    ? tags.filter((t) => t.label.toLowerCase().includes(search.toLowerCase()))
    : tags;

  return (
    <div>
      {/* Search input */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search tags..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full max-w-sm h-10 pl-10 pr-4 rounded-md border border-input bg-background text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
        />
      </div>

      {filteredTags.length === 0 ? (
        <p className="text-muted-foreground text-center py-8">
          No tags matching &ldquo;{search}&rdquo;
        </p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {filteredTags.map(({ slug, label, group, count }) => (
            <Link key={slug} href={`/browse?tag=${encodeURIComponent(slug)}`}>
              <Card className="hover:shadow-md transition-all hover:-translate-y-0.5 cursor-pointer h-full">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Tag className="h-4 w-4 text-primary flex-shrink-0" />
                    <span className="font-medium text-sm truncate">{label}</span>
                  </div>
                  <p className="text-xs text-muted-foreground/70 truncate mb-1">{group}</p>
                  <p className="text-xs text-muted-foreground">
                    {count} {count === 1 ? "story" : "stories"}
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
