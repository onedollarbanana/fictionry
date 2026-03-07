export const revalidate = 3600;
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BookOpen } from 'lucide-react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Browse Fiction by Genre | Fictionry',
  description:
    'Explore web fiction across 20+ genres on Fictionry. From Fantasy and Sci-Fi to LitRPG and Xianxia, find your next favorite story by genre.',
  alternates: {
    canonical: 'https://www.fictionry.com/genres',
  },
  openGraph: {
    title: 'Browse Fiction by Genre | Fictionry',
    description:
      'Explore web fiction across 20+ genres on Fictionry. From Fantasy and Sci-Fi to LitRPG and Xianxia, find your next favorite story by genre.',
    url: 'https://www.fictionry.com/genres',
    type: 'website',
    siteName: 'Fictionry',
  },
};

const GENRE_ICONS: Record<string, string> = {
  Fantasy: '🧙',
  'Sci-Fi': '🚀',
  Romance: '💖',
  Mystery: '🔍',
  Horror: '👻',
  Thriller: '💥',
  LitRPG: '🎮',
  Progression: '📈',
  Isekai: '🌀',
  'Slice of Life': '☕',
  Adventure: '🌄',
  Action: '⚔️',
  Comedy: '😂',
  Drama: '🎭',
  Historical: '🏰',
};

export default async function GenresPage() {
  const supabase = await createClient();

  // Get story counts per genre
  const { data: stories } = await supabase
    .from('stories')
    .select('primary_genre')
    .eq('visibility', 'published')
    .gt('chapter_count', 0);

  // Count stories per genre (one count per story)
  const genreCounts: Record<string, number> = {};
  stories?.forEach((story) => {
    if (story.primary_genre) {
      genreCounts[story.primary_genre] = (genreCounts[story.primary_genre] || 0) + 1;
    }
  });

  // Sort genres by count
  const sortedGenres = Object.entries(genreCounts).sort(
    ([, a], [, b]) => b - a
  );

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'Browse Fiction by Genre',
    description:
      'Explore web fiction across 20+ genres on Fictionry. Find your next favorite story by genre.',
    url: 'https://www.fictionry.com/genres',
    isPartOf: {
      '@type': 'WebSite',
      name: 'Fictionry',
      url: 'https://www.fictionry.com',
    },
    numberOfItems: sortedGenres.length,
    itemListElement: sortedGenres.map(([genre, count], index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: genre,
      url: `https://www.fictionry.com/browse/genre/${encodeURIComponent(genre)}`,
      description: `${count} ${count === 1 ? 'story' : 'stories'}`,
    })),
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <h1 className="text-3xl font-bold mb-2">Browse by Genre</h1>
      <p className="text-muted-foreground mb-8">
        Explore stories across different genres
      </p>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {sortedGenres.map(([genre, count]) => (
          <Link
            key={genre}
            href={`/browse/genre/${encodeURIComponent(genre)}`}
          >
            <Card className="hover:shadow-lg transition-all hover:-translate-y-1 cursor-pointer h-full">
              <CardHeader className="pb-2">
                <div className="text-3xl mb-2">
                  {GENRE_ICONS[genre] || '📚'}
                </div>
                <CardTitle className="text-lg">{genre}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  {count} {count === 1 ? 'story' : 'stories'}
                </p>
              </CardContent>
            </Card>
          </Link>
        ))}

        {sortedGenres.length === 0 && (
          <Card className="col-span-full">
            <CardContent className="py-12 text-center">
              <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                No stories yet. Be the first to write one!
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
