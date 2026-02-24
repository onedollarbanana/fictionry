import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Metadata } from 'next'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Trophy, BookOpen, Pen, Users, TrendingUp, Award, Sparkles } from 'lucide-react'
import { AchievementGrid, RecentlyUnlocked, StreakCard } from '@/components/achievements'
import type { AchievementDefinition, UserAchievement, AchievementCategory, UserStatsMap, StreakInfo } from '@/components/achievements/types'
import { ExperienceCard } from '@/components/experience/experience-card'
import type { ExperienceData } from '@/components/experience/types'
import { BadgeSelectorClient } from './badge-selector-client'
import { getRecentlyUnlocked } from '@/lib/achievements'

export const metadata: Metadata = {
  title: 'Achievements | Fictionry',
  description: 'View your achievements and select badges to display on your profile',
}

const categoryIcons: Record<AchievementCategory, typeof Trophy> = {
  reading: BookOpen,
  writing: Pen,
  social: Users,
  popularity: TrendingUp,
  rankings: Award,
  special: Sparkles,
}

const categoryLabels: Record<AchievementCategory, string> = {
  reading: 'Reading',
  writing: 'Writing',
  social: 'Social',
  popularity: 'Popularity',
  rankings: 'Rankings',
  special: 'Special',
}

export default async function AchievementsPage() {
  const supabase = await createClient()

  // Check if user is logged in
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  // ---- Parallel data fetching ----
  const [
    { data: allAchievementsResult },
    { data: userAchievementsResult },
    { data: featuredBadgesResult },
    { data: userStatsResult },
    { data: experienceResult },
  ] = await Promise.all([
    supabase.rpc('get_all_achievements'),
    supabase.rpc('get_user_achievements', { target_user_id: user.id }),
    supabase.rpc('get_featured_badges', { target_user_id: user.id }),
    supabase.rpc('get_user_stats_full', { p_user_id: user.id }),
    supabase.rpc('get_user_experience', { target_user_id: user.id }),
  ])

  const allAchievements: AchievementDefinition[] =
    (allAchievementsResult as AchievementDefinition[]) || []
  const userAchievements: UserAchievement[] =
    (userAchievementsResult as UserAchievement[]) || []
  const featuredBadges = (featuredBadgesResult as { achievementId: string }[]) || []
  const featuredBadgeIds = featuredBadges.map(fb => fb.achievementId)
  const userStats: UserStatsMap | null = (userStatsResult as UserStatsMap) ?? null
  const experience: ExperienceData | null = (experienceResult as ExperienceData) ?? null

  // ---- Streaks ----
  const streaks: StreakInfo = {
    readingCurrent: userStats?.reading_streak ?? 0,
    readingLongest: userStats?.reading_longest_streak ?? 0,
    publishingCurrent: userStats?.publishing_streak ?? 0,
    publishingLongest: userStats?.publishing_longest_streak ?? 0,
  }

  // ---- Recently unlocked ----
  const recentlyUnlocked = getRecentlyUnlocked(userAchievements, 5)

  // ---- Category stats ----
  const categories: AchievementCategory[] = [
    'reading',
    'writing',
    'social',
    'popularity',
    'rankings',
    'special',
  ]
  const categoryStats = categories.map(cat => {
    const total = allAchievements.filter(a => a.category === cat).length
    const unlocked = userAchievements.filter(ua =>
      allAchievements.find(a => a.id === ua.achievementId)?.category === cat,
    ).length
    return {
      category: cat,
      total,
      unlocked,
      percentage: total > 0 ? Math.round((unlocked / total) * 100) : 0,
    }
  })

  const totalUnlocked = userAchievements.length
  const totalAchievements = allAchievements.length
  const overallPercentage =
    totalAchievements > 0
      ? Math.round((totalUnlocked / totalAchievements) * 100)
      : 0

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
        {/* =========================================================
            1. Page Header
        ========================================================= */}
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Trophy className="h-8 w-8 text-yellow-500" />
            Achievements
          </h1>
          <p className="text-muted-foreground mt-2">
            Track your progress and unlock achievements by participating in the community
          </p>
        </div>

        {/* =========================================================
            2. XP & Level Card
        ========================================================= */}
        <ExperienceCard experience={experience} />

        {/* =========================================================
            3. Streak Section
        ========================================================= */}
        <StreakCard streaks={streaks} />

        {/* =========================================================
            4. Recently Unlocked
        ========================================================= */}
        <RecentlyUnlocked achievements={recentlyUnlocked} />

        {/* =========================================================
            5. Overall Progress
        ========================================================= */}
        <Card className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 border-0">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold">
                  {totalUnlocked} / {totalAchievements} Achievements
                </h2>
                <p className="text-muted-foreground">{overallPercentage}% complete</p>
              </div>
              <div className="w-full md:w-64">
                <Progress value={overallPercentage} className="h-3" />
              </div>
            </div>

            {/* Category Breakdown */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mt-6">
              {categoryStats.map(({ category, total, unlocked, percentage }) => {
                const Icon = categoryIcons[category]
                return (
                  <div key={category} className="text-center">
                    <Icon className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
                    <p className="font-semibold">{categoryLabels[category]}</p>
                    <p className="text-sm text-muted-foreground">
                      {unlocked}/{total} ({percentage}%)
                    </p>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* =========================================================
            6. Featured Badges
        ========================================================= */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Featured Badges</span>
              <BadgeSelectorClient
                userAchievements={userAchievements}
                featuredBadgeIds={featuredBadgeIds}
              />
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Select up to 5 achievements to display on your profile
            </p>
          </CardHeader>
        </Card>

        {/* =========================================================
            7. Category Tabs
        ========================================================= */}
        <Tabs defaultValue="all" className="space-y-6">
          <TabsList className="bg-zinc-100 dark:bg-zinc-800 p-1 flex flex-wrap h-auto gap-1">
            <TabsTrigger value="all">
              All ({totalUnlocked}/{totalAchievements})
            </TabsTrigger>
            {categories.map(cat => (
              <TabsTrigger key={cat} value={cat}>
                {categoryLabels[cat]}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="all">
            <AchievementGrid
              achievements={allAchievements}
              userAchievements={userAchievements}
              userStats={userStats}
              showLocked
            />
          </TabsContent>

          {categories.map(cat => (
            <TabsContent key={cat} value={cat}>
              <AchievementGrid
                achievements={allAchievements}
                userAchievements={userAchievements}
                userStats={userStats}
                category={cat}
                showLocked
              />
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </div>
  )
}
