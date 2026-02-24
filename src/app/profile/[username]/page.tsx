import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatDistanceToNow } from 'date-fns'
import { 
  BookOpen, 
  Eye, 
  FileText, 
  Star,
  Library,
  Clock,
  User,
  CalendarDays,
  BookMarked,
  MessageSquare,
  Trophy
} from 'lucide-react'
import { ExperienceBadge } from '@/components/experience/experience-badge'
import { ExperienceCard } from '@/components/experience/experience-card'
import type { ExperienceData } from '@/components/experience/types'
import { AchievementBadge } from '@/components/achievements/achievement-badge'
import { StreakInline } from '@/components/achievements/streak-display'
import type { FeaturedBadge, UserStatsMap, StreakInfo } from '@/components/achievements/types'
import { ProfileBorder } from '@/components/profile/profile-border'
import { ReportButton } from '@/components/moderation/report-button'
import { PremiumBadge } from '@/components/premium-badge'
import { getStoryUrl } from '@/lib/url-utils'
import { AuthorTierCards } from '@/components/story/author-tier-cards'

export const revalidate = 120


interface ProfilePageProps {
  params: Promise<{ username: string }>
}

export async function generateMetadata({ params }: ProfilePageProps): Promise<Metadata> {
  const { username } = await params
  const decodedUsername = decodeURIComponent(username)
  const supabase = await createClient()

  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name, bio')
    .eq('username', decodedUsername)
    .single()

  const displayName = profile?.display_name || decodedUsername
  const description = profile?.bio
    ? `${profile.bio.slice(0, 155)}${profile.bio.length > 155 ? '…' : ''}`
    : `View ${displayName}'s stories, library, and activity on Fictionry`

  return {
    title: `${displayName}'s Profile | Fictionry`,
    description,
    openGraph: {
      title: `${displayName}'s Profile | Fictionry`,
      description,
      type: 'profile',
      url: `/profile/${username}`,
      username: decodedUsername,
    },
    twitter: {
      card: 'summary_large_image',
      title: `${displayName}'s Profile | Fictionry`,
      description,
    },
    alternates: {
      canonical: `/profile/${username}`,
    },
  }
}

function StatCard({ 
  icon: Icon, 
  label, 
  value, 
  color = "text-primary"
}: { 
  icon: React.ElementType
  label: string
  value: string | number
  color?: string 
}) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg bg-muted ${color}`}>
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <p className="text-2xl font-bold">{value}</p>
            <p className="text-sm text-muted-foreground">{label}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// Type for achievement items from get_user_achievements RPC
interface AchievementItem {
  achievementId: string
  unlockedAt: string | null
  achievement: {
    id: string
    description: string
    icon: string | null
    category: string
    xpReward: number
    trackId: string
    trackType: string
    milestoneLevel: number | null
    thresholdValue: number
  }
}

export default async function ProfilePage({ params }: ProfilePageProps) {
  const { username } = await params
  const decodedUsername = decodeURIComponent(username)
  const supabase = await createClient()
  
  // ===== GROUP 1: Profile + Auth (parallel, must complete before Group 2) =====
  const [profileResult, currentUserResult] = await Promise.all([
    supabase
      .from('profiles')
      .select('*')
      .eq('username', decodedUsername)
      .single(),
    supabase.auth.getUser()
  ])

  const { data: profile, error: profileError } = profileResult
  const { data: { user: currentUser } } = currentUserResult
  
  if (profileError || !profile) {
    console.error('Profile not found:', decodedUsername, profileError)
    notFound()
  }

  console.log('PROFILE_DEBUG - Profile loaded:', { id: profile.id, username: profile.username })

  const isOwnProfile = currentUser?.id === profile.id

  // ===== GROUP 2: All queries depending on profile.id (parallel) =====
  const [
    storiesResult,
    libraryResult,
    reviewsResult,
    recentActivityResult,
    experienceResult,
    peerRepResult,
    featuredBadgesResult,
    achievementsResult,
    fullStatsResult,
    authorTiersResult,
    equippedBorderResult
  ] = await Promise.all([
    // Get user's published stories
    supabase
      .from('stories')
      .select(`
        id,
        title,
        slug,
        short_id,
        blurb,
        cover_url,
        total_views,
        chapter_count,
        status,
        created_at,
        updated_at
      `)
      .eq('author_id', profile.id)
      .eq('visibility', 'published')
      .order('updated_at', { ascending: false }),

    // Get user's library (followed stories)
    supabase
      .from('follows')
      .select(`
        id,
        created_at,
        stories (
          id,
          title,
          slug,
          short_id,
          cover_url
        )
      `)
      .eq('user_id', profile.id)
      .order('created_at', { ascending: false })
      .limit(10),

    // Get user's reviews (ratings with review text)
    supabase
      .from('story_ratings')
      .select(`
        id,
        overall_rating,
        review_text,
        created_at,
        stories (
          id,
          title,
          slug,
          short_id
        )
      `)
      .eq('user_id', profile.id)
      .not('review_text', 'is', null)
      .order('created_at', { ascending: false })
      .limit(10),

    // Get user's activity (comments)
    supabase
      .from('comments')
      .select(`
        id,
        content,
        created_at,
        chapters (
          id,
          title,
          stories (
            id,
            title,
            slug,
            short_id
          )
        )
      `)
      .eq('user_id', profile.id)
      .order('created_at', { ascending: false })
      .limit(10),

    // Get user's experience data
    supabase
      .rpc('get_user_experience', { target_user_id: profile.id }),

    // Get user's peer reputation
    supabase
      .rpc('get_user_peer_reputation', { target_user_id: profile.id }),

    // Get user's featured badges
    supabase
      .rpc('get_featured_badges', { target_user_id: profile.id, p_limit: 5 }),

    // Get user's achievements
    supabase
      .rpc('get_user_achievements', { target_user_id: profile.id }),

    // Get full user stats for streak display
    supabase
      .rpc('get_user_stats_full', { p_user_id: profile.id }),

    // Get author's tier configuration
    supabase
      .from('author_tiers')
      .select('tier_name, description')
      .eq('author_id', profile.id)
      .eq('enabled', true)
      .order('tier_name'),

    // Get user's equipped border (conditional)
    profile.equipped_border_id
      ? supabase
          .from('profile_borders')
          .select('*')
          .eq('id', profile.equipped_border_id)
          .single()
      : Promise.resolve({ data: null })
  ])

  const { data: stories, error: storiesError } = storiesResult
  const { data: library } = libraryResult
  const { data: reviews } = reviewsResult
  const { data: recentActivity } = recentActivityResult
  const { data: experienceData } = experienceResult
  const { data: peerRepData } = peerRepResult
  const { data: featuredBadgesData } = featuredBadgesResult
  const { data: achievementsData } = achievementsResult
  const { data: fullStatsData } = fullStatsResult
  const { data: authorTiers } = authorTiersResult
  const { data: borderData } = equippedBorderResult

  console.log('PROFILE_DEBUG - Stories query result:', { 
    count: stories?.length ?? 'null', 
    error: storiesError?.message ?? 'none',
    authorId: profile.id 
  })

  // get_user_experience returns a single object, not an array
  const experience: ExperienceData | null = experienceData

  const peerRep = peerRepData

  const featuredBadges = featuredBadgesData || []

  const achievements: AchievementItem[] = achievementsData || []
  const unlockedCount = achievements.filter((item) => item.unlockedAt).length

  const fullStats: UserStatsMap | null = (fullStatsData as UserStatsMap) ?? null

  // Build streak info
  const streaks: StreakInfo = {
    readingCurrent: fullStats?.reading_streak ?? 0,
    readingLongest: fullStats?.reading_longest_streak ?? 0,
    publishingCurrent: fullStats?.publishing_streak ?? 0,
    publishingLongest: fullStats?.publishing_longest_streak ?? 0,
  }

  // Process equipped border
  let equippedBorder = null
  if (borderData) {
    equippedBorder = {
      id: borderData.id,
      name: borderData.name,
      description: borderData.description,
      cssClass: borderData.css_class,
      unlockType: borderData.unlock_type,
      unlockValue: borderData.unlock_value,
      rarity: borderData.rarity,
      sortOrder: borderData.sort_order
    }
  }

  // ===== GROUP 3: Depends on both currentUser AND profile =====
  // Get current user's subscription to this author
  let currentAuthorSub = null
  if (currentUser && !isOwnProfile) {
    const { data: subData } = await supabase
      .from('author_subscriptions')
      .select('tier_name, status')
      .eq('subscriber_id', currentUser.id)
      .eq('author_id', profile.id)
      .eq('status', 'active')
      .single()
    currentAuthorSub = subData
  }

  // Calculate stats
  const totalViews = stories?.reduce((sum, story) => sum + (story.total_views || 0), 0) || 0
  const totalChapters = stories?.reduce((sum, story) => sum + (story.chapter_count || 0), 0) || 0

  console.log('PROFILE_DEBUG - Calculated stats:', { 
    storyCount: stories?.length || 0, 
    totalViews, 
    totalChapters,
    reviewCount: reviews?.length || 0 
  })

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ProfilePage",
    mainEntity: {
      "@type": "Person",
      name: profile.display_name || profile.username,
      alternateName: profile.username,
      description: profile.bio || undefined,
      url: `https://www.fictionry.com/profile/${profile.username}`,
      interactionStatistic: {
        "@type": "InteractionCounter",
        interactionType: "https://schema.org/WriteAction",
        userInteractionCount: stories?.length || 0,
      },
    },
  }

  return (
    <main className="max-w-6xl mx-auto px-4 py-8 space-y-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {/* Profile Header */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-6 items-start">
            {/* Avatar with Border */}
            <div className="relative">
              <ProfileBorder border={equippedBorder} size="lg">
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center overflow-hidden">
                  {profile.avatar_url ? (
                    <Image
                      src={profile.avatar_url}
                      alt={profile.username}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <User className="h-12 w-12 text-muted-foreground" />
                  )}
                </div>
              </ProfileBorder>
              {experience && (
                <div className="absolute -bottom-1 -right-1">
                  <ExperienceBadge tier={experience.tier} size="sm" />
                </div>
              )}
            </div>
            
            {/* Profile Info */}
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-2xl font-bold">{profile.display_name || profile.username}</h1>
                {experience && (
                  <ExperienceBadge tier={experience.tier} showLabel size="sm" />
                )}
                {profile.is_premium && <PremiumBadge />}
              </div>
              <p className="text-muted-foreground mb-2">@{profile.username}</p>
              
              {/* Featured Badges */}
              {featuredBadges.length > 0 && (
                <div className="flex items-center gap-2 mb-3">
                  {featuredBadges.map((badge: FeaturedBadge) => (
                    <AchievementBadge
                      key={badge.achievementId}
                      achievement={badge.achievement}
                      size="sm"
                    />
                  ))}
                </div>
              )}
              
              {profile.bio && (
                <p className="text-sm mb-3">{profile.bio}</p>
              )}
              <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                <span className="flex items-center gap-1">
                  <CalendarDays className="h-4 w-4" />
                  Joined {formatDistanceToNow(new Date(profile.created_at), { addSuffix: true })}
                </span>
                {unlockedCount > 0 && (
                  <span className="flex items-center gap-1">
                    <Trophy className="h-4 w-4 text-yellow-500" />
                    {unlockedCount} achievement{unlockedCount !== 1 ? 's' : ''}
                  </span>
                )}
              </div>
            </div>

            {/* Edit Profile Button */}
            {isOwnProfile && (
              <div className="flex gap-2">
                <Link
                  href="/settings/profile"
                  className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2"
                >
                  Edit Profile
                </Link>
              </div>
            )}
            {!isOwnProfile && (
              <ReportButton
                contentType="profile"
                contentId={profile.id}
                contentTitle={profile.username}
                variant="ghost"
                size="sm"
              />
            )}
          </div>
        </CardContent>
      </Card>

      {/* Streak Display — shown between header and stats grid */}
      <StreakInline streaks={streaks} />

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard 
          icon={BookOpen} 
          label="Stories Published" 
          value={stories?.length || 0} 
          color="text-blue-500"
        />
        <StatCard 
          icon={Eye} 
          label="Total Views" 
          value={totalViews.toLocaleString()} 
          color="text-green-500"
        />
        <StatCard 
          icon={FileText} 
          label="Chapters Written" 
          value={totalChapters} 
          color="text-purple-500"
        />
        <StatCard 
          icon={Star} 
          label="Reviews Given" 
          value={reviews?.length || 0} 
          color="text-yellow-500"
        />
      </div>

      {/* Author Tier Subscriptions */}
      {authorTiers && authorTiers.length > 0 && !isOwnProfile && (
        <AuthorTierCards
          authorId={profile.id}
          authorName={profile.display_name || profile.username}
          tiers={authorTiers.map((t: any) => ({ ...t, advance_chapter_count: 0 }))}
          currentSubscription={currentAuthorSub}
          isLoggedIn={!!currentUser}
        />
      )}

      {/* Tabbed Content */}
      <Tabs defaultValue="activity" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="activity" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            <span className="hidden sm:inline">Activity</span>
          </TabsTrigger>
          <TabsTrigger value="stories" className="flex items-center gap-2">
            <BookOpen className="h-4 w-4" />
            <span className="hidden sm:inline">Stories ({stories?.length || 0})</span>
          </TabsTrigger>
          <TabsTrigger value="library" className="flex items-center gap-2">
            <Library className="h-4 w-4" />
            <span className="hidden sm:inline">Library</span>
          </TabsTrigger>
          <TabsTrigger value="reviews" className="flex items-center gap-2">
            <Star className="h-4 w-4" />
            <span className="hidden sm:inline">Reviews</span>
          </TabsTrigger>
          <TabsTrigger value="achievements" className="flex items-center gap-2">
            <Trophy className="h-4 w-4" />
            <span className="hidden sm:inline">Achievements</span>
          </TabsTrigger>
        </TabsList>

        {/* Activity Tab */}
        <TabsContent value="activity">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Recent Comments
              </CardTitle>
            </CardHeader>
            <CardContent>
              {recentActivity && recentActivity.length > 0 ? (
                <div className="space-y-4">
                  {recentActivity.map((comment) => {
                    const chapter = comment.chapters as unknown as { 
                      id: string
                      title: string
                      stories: { id: string; title: string; slug: string; short_id: string } | { id: string; title: string; slug: string; short_id: string }[]
                    } | null
                    const story = chapter?.stories
                    const storyData = Array.isArray(story) ? story[0] : story
                    
                    return (
                      <div key={comment.id} className="border-b last:border-0 pb-4 last:pb-0">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            {storyData && (
                              <Link 
                                href={getStoryUrl(storyData)}
                                className="text-sm font-medium hover:text-primary transition-colors"
                              >
                                {storyData.title}
                              </Link>
                            )}
                            {chapter && (
                              <span className="text-sm text-muted-foreground"> · {chapter.title}</span>
                            )}
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {comment.content}
                        </p>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">
                  No recent activity
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Stories Tab */}
        <TabsContent value="stories">
          <div className="grid gap-4">
            {stories && stories.length > 0 ? (
              stories.map((story) => (
                <Card key={story.id}>
                  <CardContent className="pt-6">
                    <div className="flex gap-4">
                      {story.cover_url && (
                        <div className="relative w-20 h-28 flex-shrink-0">
                          <Image
                            src={story.cover_url}
                            alt={story.title}
                            fill
                            className="object-cover rounded"
                          />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <Link 
                          href={getStoryUrl(story)}
                          className="font-semibold hover:text-primary transition-colors line-clamp-1 break-all"
                        >
                          {story.title}
                        </Link>
                        <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                          <Badge variant="outline" className="capitalize">
                            {story.status}
                          </Badge>
                          <span className="flex items-center gap-1">
                            <Eye className="h-3 w-3" />
                            {(story.total_views || 0).toLocaleString()}
                          </span>
                          <span className="flex items-center gap-1">
                            <FileText className="h-3 w-3" />
                            {story.chapter_count || 0} chapters
                          </span>
                        </div>
                        {story.blurb && (
                          <p className="text-sm text-muted-foreground mt-2 line-clamp-2 break-words">
                            {story.blurb}
                          </p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <Card>
                <CardContent className="py-12 text-center">
                  <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No stories published yet</p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* Library Tab */}
        <TabsContent value="library">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookMarked className="h-5 w-5" />
                Reading List
              </CardTitle>
            </CardHeader>
            <CardContent>
              {library && library.length > 0 ? (
                <div className="grid gap-3">
                  {library.map((item) => {
                    const story = item.stories as unknown as { id: string; title: string; slug: string; short_id: string; cover_url: string | null } | null
                    if (!story) return null
                    
                    return (
                      <Link 
                        key={item.id}
                        href={getStoryUrl(story)}
                        className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted transition-colors"
                      >
                        {story.cover_url && (
                          <div className="relative w-10 h-14 flex-shrink-0">
                            <Image
                              src={story.cover_url}
                              alt={story.title}
                              fill
                              className="object-cover rounded"
                            />
                          </div>
                        )}
                        <span className="font-medium line-clamp-1">{story.title}</span>
                      </Link>
                    )
                  })}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">
                  No stories in library
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Reviews Tab */}
        <TabsContent value="reviews">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Star className="h-5 w-5" />
                Reviews Written
              </CardTitle>
            </CardHeader>
            <CardContent>
              {reviews && reviews.length > 0 ? (
                <div className="space-y-4">
                  {reviews.map((review) => {
                    const story = review.stories as unknown as { id: string; title: string; slug: string; short_id: string } | { id: string; title: string; slug: string; short_id: string }[] | null
                    const storyData = Array.isArray(story) ? story[0] : story
                    
                    return (
                      <div key={review.id} className="border-b last:border-0 pb-4 last:pb-0">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            {storyData && (
                              <Link 
                                href={getStoryUrl(storyData)}
                                className="font-medium hover:text-primary transition-colors"
                              >
                                {storyData.title}
                              </Link>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="flex items-center gap-1">
                              <Star className="h-4 w-4 fill-yellow-500 text-yellow-500" />
                              <span className="font-medium">{review.overall_rating.toFixed(1)}</span>
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(review.created_at), { addSuffix: true })}
                            </span>
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-3">
                          {review.review_text}
                        </p>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">
                  No reviews written yet
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Achievements Tab */}
        <TabsContent value="achievements">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5" />
                Achievements ({unlockedCount} / {achievements.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* Experience Card */}
              {experience && (
                <div className="mb-6">
                  <ExperienceCard experience={experience} />
                </div>
              )}

              {/* Peer Reputation */}
              {peerRep && peerRep.repScore > 0 && (
                <div className="mb-6 p-4 rounded-lg bg-muted/50">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Peer Reputation</p>
                      <p className="text-2xl font-bold">{peerRep.repScore}</p>
                    </div>
                    <Badge variant="outline" className="capitalize">
                      {peerRep.tier}
                    </Badge>
                  </div>
                </div>
              )}

              {/* Achievement Badges */}
              {achievements.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {achievements
                    .filter((item) => item.unlockedAt)
                    .map((item) => (
                      <div 
                        key={item.achievementId} 
                        className="flex items-center gap-2 p-3 rounded-lg bg-muted/50"
                      >
                        <AchievementBadge achievement={item.achievement} size="sm" />
                        <div className="min-w-0">
                          <p className="font-medium text-sm truncate">{item.achievement.description}</p>
                          <p className="text-xs text-muted-foreground">+{item.achievement.xpReward} XP</p>
                        </div>
                      </div>
                    ))
                  }
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">
                  No achievements yet
                </p>
              )}

              {/* Link to full achievements page */}
              <div className="mt-6 text-center">
                <Link 
                  href="/achievements"
                  className="text-sm text-primary hover:underline"
                >
                  View all achievements →
                </Link>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </main>
  )
}
