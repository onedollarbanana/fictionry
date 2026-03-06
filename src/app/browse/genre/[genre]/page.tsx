export const revalidate = 60;
import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import { BookOpen } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { type StoryCardData } from '@/components/story/story-card';
import { BrowseStoryGrid } from '@/components/story/browse-story-grid';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { PRIMARY_GENRE_SLUGS, getPrimaryGenreBySlug } from '@/lib/constants';
import { GenreSurfaceTabs, type GenreSurface } from '@/components/browse/genre-surface-tabs';
import { enrichWithCommunityPicks } from '@/lib/community-picks';
import { getGenreSeo } from '@/lib/genre-seo';
import Link from 'next/link';
import type { Metadata } from 'next';

/* eslint-disable @typescript-eslint/no-explicit-any */

interface GenrePageProps {
  params: Promise<{ genre: string }>;
  searchParams: Promise<{ surface?: string }>;
}

export async function generateStaticParams() {
  return PRIMARY_GENRE_SLUGS.map((slug) => ({ genre: slug }));
}

export async function generateMetadata({ params }: GenrePageProps): Promise<Metadata> {
  const { genre: rawGenre } = await params;
  const genre = rawGenre.toLowerCase();
  const seo = getGenreSeo(genre);
  const canonicalUrl = `https://www.fictionry.com/browse/genre/${genre}`;
  return {
    title: seo.metaTitle,
    description: seo.metaDescription,
    alternates: { canonical: canonicalUrl },
    openGraph: {
      title: seo.metaTitle,
      description: seo.metaDescription,
      url: canonicalUrl,
      type: 'website',
      siteName: 'Fictionry',
    },
  };
}

const VALID_SURFACES: GenreSurface[] = ['new', 'rising', 'trending', 'top', 'complete'];

function mapRpcRow(row: any): StoryCardData {
  return {
    ...row,
    profiles: {
      username: row.author_username,
      display_name: row.author_display_name,
    },
  } as StoryCardData;
}

export default async function GenrePage({ params, searchParams }: GenrePageProps) {
  const { genre: rawGenre } = await params;
  const genre = rawGenre.toLowerCase();
  const { surface: rawSurface = 'rising' } = await searchParams;
  const surface: GenreSurface = VALID_SURFACES.includes(rawSurface as GenreSurface)
    ? (rawSurface as GenreSurface)
    : 'rising';

  if (!PRIMARY_GENRE_SLUGS.includes(genre)) notFound();

  const genreData = getPrimaryGenreBySlug(genre)!;
  const seo = getGenreSeo(genre);
  const supabase = await createClient();

  // Fetch the selected surface
  let stories: StoryCardData[] = [];

  if (surface === 'new') {
    const { data } = await supabase.rpc('get_new_in_genre', { p_genre: genre, p_limit: 50 });
    stories = (data || []).map(mapRpcRow);
  } else if (surface === 'rising') {
    const { data } = await supabase.rpc('get_rising_in_genre', { p_genre: genre, p_limit: 50 });
    stories = (data || []).map(mapRpcRow);
  } else if (surface === 'trending') {
    const { data } = await supabase.rpc('get_trending_in_genre', { p_genre: genre, p_limit: 50 });
    stories = (data || []).map(mapRpcRow);
  } else if (surface === 'top') {
    const { data } = await supabase.rpc('get_top_in_genre', { p_genre: genre, p_limit: 50 });
    stories = (data || []).map(mapRpcRow);
  } else if (surface === 'complete') {
    const { data } = await supabase.rpc('get_complete_in_genre', { p_genre: genre, p_limit: 50 });
    stories = (data || []).map(mapRpcRow);
  }

  // Probe which other surfaces have results (for greying out empty tabs)
  // Only probe if current surface is empty to avoid extra queries when it isn't
  let emptySurfaces: GenreSurface[] = [];
  if (stories.length === 0) {
    // Current surface is empty — mark it; other tabs can still be active
    emptySurfaces = [surface];
  } else {
    // Quick check: complete tab should be greyed if no completed stories exist
    const { count: completeCount } = await supabase
      .from('stories')
      .select('id', { count: 'exact', head: true })
      .eq('visibility', 'published')
      .eq('primary_genre', genre)
      .eq('status', 'completed');
    if (!completeCount || completeCount === 0) emptySurfaces.push('complete');

    // Grey out Top if no rated stories exist
    const { count: ratedCount } = await supabase
      .from('stories')
      .select('id', { count: 'exact', head: true })
      .eq('visibility', 'published')
      .eq('primary_genre', genre)
      .in('rating_confidence', ['forming', 'established']);
    if (!ratedCount || ratedCount === 0) emptySurfaces.push('top');
  }

  await enrichWithCommunityPicks(stories, supabase);

  const surfaceLabel: Record<GenreSurface, string> = {
    new: 'New',
    rising: 'Rising',
    trending: 'Trending',
    top: 'Top Rated',
    complete: 'Complete',
  };

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: `${genreData.name} Stories`,
    description: seo.metaDescription,
    url: `https://www.fictionry.com/browse/genre/${genre}`,
    isPartOf: { '@type': 'WebSite', name: 'Fictionry', url: 'https://www.fictionry.com' },
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <Breadcrumb
        items={[{ label: 'Genres', href: '/genres' }, { label: genreData.name }]}
      />

      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <span className="text-4xl" role="img" aria-label={genreData.name}>
            {genreData.emoji}
          </span>
          <h1 className="text-3xl font-bold">{genreData.name}</h1>
        </div>
        <p className="text-muted-foreground text-sm">
          {surfaceLabel[surface]} stories in {genreData.name}
        </p>
      </div>

      {/* Surface tabs */}
      <div className="mb-6">
        <GenreSurfaceTabs
          currentSurface={surface}
          genreSlug={genre}
          emptySurfaces={emptySurfaces}
        />
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

      {stories.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">
              No {surfaceLabel[surface].toLowerCase()} stories in {genreData.name} yet.
              {surface === 'new' && ' Check back soon!'}
              {surface === 'complete' && ' Try another tab.'}
              {surface === 'top' && ' Not enough ratings yet — try Rising.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <BrowseStoryGrid stories={stories} surface={`${surface}_genre`} />
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
                <Link key={relatedSlug} href={`/browse/genre/${relatedSlug}`}>
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
