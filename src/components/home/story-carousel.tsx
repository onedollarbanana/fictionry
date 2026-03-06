"use client";

import { useRef, useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { StoryCardCompact } from "./story-card-compact";
import type { RankedStory } from "@/lib/rankings";

interface StoryCarouselProps {
  title: string;
  icon?: React.ReactNode;
  stories: RankedStory[];
  viewAllLink?: string;
  emptyMessage?: string;
  surface?: string;
}

export function StoryCarousel({
  title,
  icon,
  stories,
  viewAllLink,
  emptyMessage = "No stories to show",
  surface,
}: StoryCarouselProps) {
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
  }, [stories]);

  const scroll = (direction: "left" | "right") => {
    if (!scrollRef.current) return;
    const scrollAmount = 400;
    scrollRef.current.scrollBy({
      left: direction === "left" ? -scrollAmount : scrollAmount,
      behavior: "smooth",
    });
  };

  if (stories.length === 0) {
    return (
      <section className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            {icon}
            {title}
          </h2>
        </div>
        <div className="bg-muted/50 rounded-lg py-12 px-4 text-center">
          <BookOpen className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
          <p className="text-muted-foreground">{emptyMessage}</p>
        </div>
      </section>
    );
  }

  return (
    <section className="mb-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          {icon}
          {title}
        </h2>
        <div className="flex items-center gap-2">
          {/* Navigation arrows - hidden on mobile */}
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
          {viewAllLink && (
            <Link
              href={viewAllLink}
              className="text-sm text-primary hover:underline flex items-center gap-1"
            >
              View All
              <ChevronRight className="h-4 w-4" />
            </Link>
          )}
        </div>
      </div>

      {/* Scrollable container */}
      <div
        ref={scrollRef}
        className="flex gap-4 overflow-x-auto scrollbar-hide pb-2 -mx-4 px-4 snap-x snap-mandatory sm:snap-none"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {stories.map((story) => (
          <div key={story.id} className="snap-start">
            <StoryCardCompact story={story} surface={surface} />
          </div>
        ))}
      </div>
    </section>
  );
}
