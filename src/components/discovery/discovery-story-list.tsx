import { StoryCard, type StoryCardData } from "@/components/story/story-card";

interface RankedStory extends StoryCardData {
  rank?: number;
  score?: number;
}

interface Props {
  stories: RankedStory[];
  showRank?: boolean;
  surface?: string;
}

export function DiscoveryStoryList({ stories, showRank = false, surface }: Props) {
  return (
    <div className="flex flex-col gap-3">
      {stories.map((story) => (
        <StoryCard
          key={story.id}
          story={story}
          variant="horizontal"
          expandable
          rank={showRank ? story.rank : undefined}
          surface={surface}
        />
      ))}
    </div>
  );
}
