export const revalidate = 60;
import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import { BookOpen } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { type StoryCardData } from '@/components/story/story-card';
import { BrowseStoryGrid } from '@/components/story/browse-story-grid';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { PRIMARY_GENRE_SLUGS, getPrimaryGenreBySlug } from '@/lib/constants';
import { GenreTagSort } from '@/components/browse/genre-tag-sort';
import { enrichWithCommunityPicks } from '@/lib/community-picks';
import { getGenreSeo } from '@/lib/genre-seo';
import Link from 'next/link';
import type { Metadata } from 'next';

interface GenrePageProps {
  params: Promise<{ genre: string }>;
  searchParams: Promise<{ sort?: string }>;
}

export async function generateStaticParams() {
  return PRIMARY_GENRE_SLUGS.map((slug) => ({ genre: slug }));
}

export async function generateMetadata({
  params,
}: GenrePageProps): Promise<Metadata> {
  const { genre } = await params;
  const seo = getGenreSeo(genre);
  const canonicalUrl = `https://www.fictionry.com/browse/genre/${genre}`;

  return {
    title: seo.metaTitle,
    description: seo.metaDescription,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title: seo.metaTitle,
      description: seo.metaDescription,
      url: canonicalUrl,
      type: 'website',
      siteName: 'Fictionry',
    },
  };
}

export default async function GenrePage({
  params,
  searchParams,
}: GenrePageProps) {
  const { genre } = await params;
  const { sort = 'popular' } = await searchParams;
  const supabase = await createClient();

  // Validate genre slug
  if (!PRIMARY_GENRE_SLUGS.includes(genre)) {
    notFound();
  }

  const genreData = getPrimaryGenreBySlug(genre)!;
  const seo = getGenreSeo(genre);

  // Determine sort order
  const orderColumn =
    sort === 'newest'
      ? 'created_at'
      : sort === 'updated'
        ? 'updated_at'
        : 'total_views';

  // Fetch stories in this genre
  const { data: stories, error } = await supabase
    .from('stories')
    .select(
      `
      id, slug, short_id,
      title,
      tagline,
      blurb,
      cover_url,
      primary_genre,
      subgenres,
      tags,
      status,
      total_views,
      follower_count,
      chapter_count,
      rating_count,
      rating_sentiment,
      rating_confidence,
      bayesian_rating,
      created_at,
      updated_at,
      profiles!author_id(
        username,
        display_name
      )
    `
    )
    .eq('visibility', 'published')
    .eq('primary_genre', genre)
    .order(orderColumn, { ascending: false })
    .limit(100);

  if (error) {
    console.error('Error fetching genre stories:', error);
  }

  const typedStories = (stories || []) as unknown as StoryCardData[];
  await enrichWithCommunityPicks(typedStories, supabase);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: `${genreData.name} Stories`,
    description: seo.metaDescription,
    url: `https://www.fictionry.com/browse/genre/${genre}`,
    isPartOf: {
      '@type': 'WebSite',
      name: 'Fictionry',
      url: 'https://www.fictionry.com',
    },
    numberOfItems: typedStories.length,
    breadcrumb: {
      '@type': 'BreadcrumbList',
      itemListElement: [
        {
          '@type': 'ListItem',
          position: 1,
          name: 'Genres',
          item: 'https://www.fictionry.com/genres',
        },
        {
          '@type': 'ListItem',
          position: 2,
          name: genreData.name,
          item: `https://www.fictionry.com/browse/genre/${genre}`,
        },
      ],
    },
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <Breadcrumb
        items={[
          { label: 'Genres', href: '/genres' },
          { label: genreData.name },
        ]}
      />

      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-3">
            <span className="text-4xl" role="img" aria-label={genreData.name}>
              {genreData.emoji}
            </span>
            <h1 className="text-3xl font-bold">{genreData.name}</h1>
          </div>
          <p className="text-muted-foreground mt-1">
            {typedStories.length}{' '}
            {typedStories.length === 1 ? 'story' : 'stories'}
          </p>
        </div>
        <GenreTagSort currentSort={sort} />
      </div>

      {/* Genre description for SEO */}
      <div className="mb-8 rounded-lg border bg-card p-6">
        <div className="prose prose-sm dark:prose-invert max-w-none">
          {seo.longDescription.split('\n\n').map((paragraph, index) => (
            <p key={index} className="text-muted-foreground leading-relaxed">
              {paragraph}
            </p>
          ))}
        </div>
      </div>

      {typedStories.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">
              No stories in {genreData.name} yet. Be the first to write one!
            </p>
          </CardContent>
        </Card>
      ) : (
        <BrowseStoryGrid stories={typedStories} />
      )}

      {/* Related Genres */}
      {seo.relatedGenres.length > 0 && (
        <div className="mt-12">
          <h2 className="text-2xl font-bold mb-4">Related Genres</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {seo.relatedGenres.map((relatedSlug) => {
              const relatedSeo = getGenreSeo(relatedSlug);
              const relatedGenreData = getPrimaryGenreBySlug(relatedSlug);
              return (
                <Link
                  key={relatedSlug}
                  href={`/browse/genre/${relatedSlug}`}
                >
                  <Card className="hover:shadow-lg transition-all hover:-translate-y-1 cursor-pointer h-full">
                    <CardContent className="flex items-center gap-3 py-4">
                      <span className="text-2xl">{relatedSeo.icon}</span>
                      <span className="font-medium">
                        {relatedGenreData?.name ?? relatedSlug}
                      </span>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
