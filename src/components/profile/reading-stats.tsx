import Link from "next/link";
import { getStoryUrl } from "@/lib/url-utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen, Library, CheckCircle, BookMarked } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface ReadingStatsData {
  chaptersRead: number;
  librarySize: number;
  currentlyReading: number;
  completedCount: number;
  favoriteGenres: string[];
  recentActivity: Array<{
    storyId: string;
    storyTitle: string;
    storySlug?: string;
    storyShortId?: string;
    coverUrl: string | null;
    chaptersRead: number;
    totalChapters: number;
    lastReadAt: string;
  }>;
}

export function ReadingStats({ stats }: { stats: ReadingStatsData }) {
  return (
    <>
      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="pt-4 text-center">
            <BookOpen className="h-8 w-8 mx-auto mb-2 text-primary" />
            <div className="text-2xl font-bold">{stats.chaptersRead.toLocaleString()}</div>
            <div className="text-sm text-muted-foreground">Chapters Read</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-4 text-center">
            <Library className="h-8 w-8 mx-auto mb-2 text-blue-500" />
            <div className="text-2xl font-bold">{stats.librarySize}</div>
            <div className="text-sm text-muted-foreground">In Library</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-4 text-center">
            <BookMarked className="h-8 w-8 mx-auto mb-2 text-green-500" />
            <div className="text-2xl font-bold">{stats.currentlyReading}</div>
            <div className="text-sm text-muted-foreground">Reading</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-4 text-center">
            <CheckCircle className="h-8 w-8 mx-auto mb-2 text-purple-500" />
            <div className="text-2xl font-bold">{stats.completedCount}</div>
            <div className="text-sm text-muted-foreground">Completed</div>
          </CardContent>
        </Card>
      </div>

      {/* Favorite Genres */}
      {stats.favoriteGenres.length > 0 && (
        <Card className="mb-6">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Favorite Genres</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {stats.favoriteGenres.map((genre) => (
                <Link
                  key={genre}
                  href={`/browse/genre/${encodeURIComponent(genre)}`}
                  className="px-3 py-1 bg-primary/10 hover:bg-primary/20 text-primary rounded-full text-sm transition-colors"
                >
                  {genre}
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Activity */}
      {stats.recentActivity.length > 0 && (
        <Card className="mb-6">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Recent Reading</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.recentActivity.map((activity) => (
                <Link
                  key={activity.storyId}
                  href={activity.storySlug && activity.storyShortId ? getStoryUrl({ id: activity.storyId, slug: activity.storySlug, short_id: activity.storyShortId }) : `/story/${activity.storyId}`}
                  className="flex items-center gap-4 p-2 rounded-lg hover:bg-muted/50 transition-colors"
                >
                  {activity.coverUrl ? (
                    <img
                      src={activity.coverUrl}
                      alt={activity.storyTitle}
                      className="w-10 h-14 object-cover rounded"
                    />
                  ) : (
                    <div className="w-10 h-14 bg-muted rounded flex items-center justify-center">
                      <BookOpen className="h-5 w-5 text-muted-foreground" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium truncate">{activity.storyTitle}</h4>
                    <div className="text-sm text-muted-foreground">
                      Chapter {activity.chaptersRead} of {activity.totalChapters}
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(activity.lastReadAt), { addSuffix: true })}
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </>
  );
}
