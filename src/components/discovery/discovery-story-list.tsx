import { StoryCard, type StoryCardData } from "@/components/story/story-card";

interface RankedStory extends StoryCardData {
  rank?: number;
  score?: number;
}

interface Props {
  stories: RankedStory[];
  showRank?: boolean;
}

export function DiscoveryStoryList({ stories, showRank = false }: Props) {
  return (
    <div className="flex flex-col gap-3">
      {stories.map((story) => (
        <div key={story.id} className="flex items-stretch gap-3">
          {showRank && story.rank != null && (
            <div className="flex items-center justify-center w-12 shrink-0">
              <span className="text-2xl font-bold text-muted-foreground">
                #{story.rank}
              </span>
            </div>
          )}
          <div className="flex-1 min-w-0">
            <StoryCard story={story} variant="horizontal" expandable />
          </div>
        </div>
      ))}
    </div>
  );
}
