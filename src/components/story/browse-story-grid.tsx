import { BrowseStoryCard } from "./browse-story-card";
import type { StoryCardData } from "./story-card";

interface BrowseStoryGridProps {
  stories: StoryCardData[];
  surface?: string;
}

export function BrowseStoryGrid({ stories, surface }: BrowseStoryGridProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {stories.map((story) => (
        <BrowseStoryCard key={story.id} story={story} surface={surface} />
      ))}
    </div>
  );
}
