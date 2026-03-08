"use client";

import { useRef, useState, useEffect } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, BookOpen, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getStoryUrl, getChapterUrl } from "@/lib/url-utils";
import { useGenreRecompute } from "@/hooks/use-genre-recompute";

interface ReadingItem {
  story_id: string;
  story_slug: string | null;
  story_short_id: string | null;
  title: string;
  cover_url: string | null;
  chapter_number: number;
  total_chapters: number;
  continue_chapter_number: number;
  next_chapter_id: string | null;
  next_chapter_slug: string | null;
  next_chapter_short_id: string | null;
  author_name: string;
  updated_at: string;
}

interface ContinueReadingProps {
  items: ReadingItem[];
}

export function ContinueReading({ items }: ContinueReadingProps) {
  useGenreRecompute();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkScroll = () => {
    if (!scrollRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
    setCanScrollLeft(scrollLeft > 0);
    setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 10);
  };

  useEffect(() => {
    checkScroll();
    const ref = scrollRef.current;
    if (ref) {
      ref.addEventListener("scroll", checkScroll);
      window.addEventListener("resize", checkScroll);
    }
    return () => {
      if (ref) ref.removeEventListener("scroll", checkScroll);
      window.removeEventListener("resize", checkScroll);
    };
  }, [items]);

  const scroll = (direction: "left" | "right") => {
    if (!scrollRef.current) return;
    const scrollAmount = 400;
    scrollRef.current.scrollBy({
      left: direction === "left" ? -scrollAmount : scrollAmount,
      behavior: "smooth",
    });
  };

  if (items.length === 0) return null;

  return (
    <section className="mb-8 bg-primary/5 rounded-xl p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <Play className="h-5 w-5" />
          Continue Reading
        </h2>
        <div className="flex items-center gap-2">
          <div className="hidden sm:flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => scroll("left")}
              disabled={!canScrollLeft}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => scroll("right")}
              disabled={!canScrollRight}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <Link
            href="/library"
            className="text-sm text-primary hover:underline flex items-center gap-1"
          >
            Library
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
      </div>

      {/* Scrollable container */}
      <div
        ref={scrollRef}
        className="flex gap-4 overflow-x-auto scrollbar-hide pb-2 snap-x snap-mandatory sm:snap-none"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {items.map((item) => (
          <div
            key={item.story_id}
            className="flex-shrink-0 w-[280px] sm:w-[320px] snap-start"
          >
            <div className="bg-card rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow">
              <div className="flex">
                {/* Cover */}
                <div className="w-20 h-28 flex-shrink-0">
                  {item.cover_url ? (
                    <img
                      src={`${item.cover_url}?t=${new Date(item.updated_at).getTime()}`}
                      alt={item.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                      <BookOpen className="h-6 w-6 text-primary/40" />
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 p-3 flex flex-col justify-between min-w-0">
                  <div>
                    <Link
                      href={getStoryUrl({ id: item.story_id, slug: item.story_slug, short_id: item.story_short_id })}
                      className="font-medium text-sm line-clamp-1 hover:text-primary"
                    >
                      {item.title}
                    </Link>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      by {item.author_name}
                    </p>
                  </div>

                  {/* Progress */}
                  <div className="mt-2">
                    <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                      <span>
                        Chapter {item.chapter_number} of {item.total_chapters}
                      </span>
                      <span>
                        {item.total_chapters > 0
                          ? Math.round(
                              (item.chapter_number / item.total_chapters) * 100
                            )
                          : 0}
                        %
                      </span>
                    </div>
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full transition-all"
                        style={{
                          width: `${
                            item.total_chapters > 0
                              ? Math.min(
                                  100,
                                  (item.chapter_number / item.total_chapters) *
                                    100
                                )
                              : 0
                          }%`,
                        }}
                      />
                    </div>
                  </div>

                  {/* Continue button */}
                  <Link
                    href={
                      item.next_chapter_id && item.next_chapter_short_id
                        ? getChapterUrl(
                            { id: item.story_id, slug: item.story_slug, short_id: item.story_short_id },
                            { slug: item.next_chapter_slug, short_id: item.next_chapter_short_id }
                          )
                        : getStoryUrl({ id: item.story_id, slug: item.story_slug, short_id: item.story_short_id })
                    }
                    className="mt-2"
                  >
                    <Button size="sm" className="w-full h-7 text-xs">
                      <Play className="h-3 w-3 mr-1" />
                      Continue Ch. {item.continue_chapter_number}
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
