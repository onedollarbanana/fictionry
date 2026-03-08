'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/lib/hooks/useUser'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ArrowLeft, Flame, Target, PenLine, Calendar, TrendingUp } from 'lucide-react'
import { HelpLink } from '@/components/ui/help-link'

interface DailyLog {
  id: string
  log_date: string
  words_written: number
  chapters_worked: number
}

interface WritingGoal {
  id: string
  daily_word_goal: number
}

export default function WritingStatsPage() {
  const { user, loading: userLoading } = useUser()
  const router = useRouter()
  const [goal, setGoal] = useState<WritingGoal | null>(null)
  const [goalInput, setGoalInput] = useState('')
  const [logs, setLogs] = useState<DailyLog[]>([])
  const [loading, setLoading] = useState(true)
  const [savingGoal, setSavingGoal] = useState(false)

  useEffect(() => {
    if (!userLoading && !user) {
      router.push('/login')
      return
    }
    if (user) {
      fetchData()
    }
  }, [user, userLoading, router])

  async function fetchData() {
    const supabase = createClient()

    // Fetch goal
    const { data: goalData } = await supabase
      .from('author_writing_goals')
      .select('id, daily_word_goal')
      .eq('user_id', user!.id)
      .single()

    if (goalData) {
      setGoal(goalData)
      setGoalInput(goalData.daily_word_goal.toString())
    } else {
      setGoalInput('1000')
    }

    // Fetch last 30 days of logs
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const { data: logData } = await supabase
      .from('writing_daily_log')
      .select('id, log_date, words_written, chapters_worked')
      .eq('user_id', user!.id)
      .gte('log_date', thirtyDaysAgo.toISOString().split('T')[0])
      .order('log_date', { ascending: false })

    if (logData) {
      setLogs(logData)
    }

    setLoading(false)
  }

  async function saveGoal() {
    if (!user) return
    setSavingGoal(true)
    const supabase = createClient()
    const newGoal = parseInt(goalInput) || 0

    if (goal) {
      await supabase
        .from('author_writing_goals')
        .update({ daily_word_goal: newGoal, updated_at: new Date().toISOString() })
        .eq('id', goal.id)
      setGoal({ ...goal, daily_word_goal: newGoal })
    } else {
      const { data } = await supabase
        .from('author_writing_goals')
        .insert({ user_id: user.id, daily_word_goal: newGoal })
        .select('id, daily_word_goal')
        .single()
      if (data) setGoal(data)
    }
    setSavingGoal(false)
  }

  // Returns YYYY-MM-DD in the user's local timezone (not UTC)
  function localDateStr(date: Date): string {
    const y = date.getFullYear()
    const m = String(date.getMonth() + 1).padStart(2, '0')
    const d = String(date.getDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
  }

  // Compute stats
  const today = localDateStr(new Date())
  const todayLog = logs.find(l => l.log_date === today)
  const wordsToday = todayLog?.words_written || 0
  const dailyGoal = goal?.daily_word_goal || parseInt(goalInput) || 0

  // Words this week (Mon-Sun)
  const now = new Date()
  const dayOfWeek = now.getDay()
  const mondayOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1
  const monday = new Date(now)
  monday.setDate(now.getDate() - mondayOffset)
  const mondayStr = monday.toISOString().split('T')[0]
  const wordsThisWeek = logs
    .filter(l => l.log_date >= mondayStr && l.log_date <= today)
    .reduce((sum, l) => sum + l.words_written, 0)

  // Words this month
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
  const wordsThisMonth = logs
    .filter(l => l.log_date >= monthStart && l.log_date <= today)
    .reduce((sum, l) => sum + l.words_written, 0)

  // Streak calculation
  function calculateStreaks(logEntries: DailyLog[]) {
    const dateSet = new Set(logEntries.filter(l => l.words_written > 0).map(l => l.log_date))

    // Current streak: consecutive days going back from today (or yesterday)
    // Uses local date to avoid UTC boundary issues (e.g. 11 PM local = next day UTC)
    let currentStreak = 0
    const checkDate = new Date()
    // If no entry today, start from yesterday
    if (!dateSet.has(localDateStr(checkDate))) {
      checkDate.setDate(checkDate.getDate() - 1)
    }
    while (dateSet.has(localDateStr(checkDate))) {
      currentStreak++
      checkDate.setDate(checkDate.getDate() - 1)
    }

    // Longest streak from available data
    const sortedDates = Array.from(dateSet).sort()
    let longestStreak = 0
    let tempStreak = 0
    let prevDate: Date | null = null
    for (const dateStr of sortedDates) {
      const d = new Date(dateStr + 'T00:00:00')
      if (prevDate) {
        const diff = (d.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24)
        if (Math.round(diff) === 1) {
          tempStreak++
        } else {
          tempStreak = 1
        }
      } else {
        tempStreak = 1
      }
      if (tempStreak > longestStreak) longestStreak = tempStreak
      prevDate = d
    }

    return { currentStreak, longestStreak }
  }

  const { currentStreak, longestStreak } = calculateStreaks(logs)

  // Weekly chart data (last 28 days = 4 weeks)
  function getWeeklyChartData() {
    const weeks: { label: string; days: { date: string; dayLabel: string; words: number }[] }[] = []
    const logMap = new Map(logs.map(l => [l.log_date, l.words_written]))

    for (let w = 3; w >= 0; w--) {
      const weekStart = new Date(now)
      weekStart.setDate(now.getDate() - mondayOffset - w * 7)
      const days: { date: string; dayLabel: string; words: number }[] = []
      const dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

      for (let d = 0; d < 7; d++) {
        const date = new Date(weekStart)
        date.setDate(weekStart.getDate() + d)
        const dateStr = date.toISOString().split('T')[0]
        days.push({
          date: dateStr,
          dayLabel: dayLabels[d],
          words: logMap.get(dateStr) || 0,
        })
      }

      const weekLabel = weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      weeks.push({ label: weekLabel, days })
    }

    return weeks
  }

  const weeklyData = getWeeklyChartData()
  const maxWords = Math.max(1, ...weeklyData.flatMap(w => w.days.map(d => d.words)))

  // Progress percentage
  const progressPct = dailyGoal > 0 ? Math.min(100, Math.round((wordsToday / dailyGoal) * 100)) : 0

  // Recent 14 days for table
  const recentLogs = logs.slice(0, 14)

  if (userLoading || loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="animate-pulse space-y-8">
          <div className="h-8 bg-zinc-200 dark:bg-zinc-800 rounded w-48"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-40 bg-zinc-200 dark:bg-zinc-800 rounded-xl"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (!user) return null

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/author/dashboard">
            <Button variant="outline" size="sm" className="gap-2">
              <ArrowLeft className="w-4 h-4" />
              Dashboard
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">Writing Stats <HelpLink href="/guides/authors/analytics" label="Analytics guide" /></h1>
            <p className="text-zinc-500 mt-1">Track your writing progress and build consistency</p>
          </div>
        </div>
      </div>

      {/* Daily Goal & Streak Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Daily Goal Card */}
        <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
              <Target className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Daily Goal</h2>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Label htmlFor="daily-goal" className="text-sm text-zinc-500 whitespace-nowrap">Goal:</Label>
              <Input
                id="daily-goal"
                type="number"
                value={goalInput}
                onChange={(e) => setGoalInput(e.target.value)}
                className="w-28"
                min={0}
              />
              <span className="text-sm text-zinc-500">words/day</span>
              <Button size="sm" onClick={saveGoal} disabled={savingGoal}>
                {savingGoal ? 'Saving...' : 'Save'}
              </Button>
            </div>

            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-zinc-500">Today&apos;s progress</span>
                <span className="font-medium text-zinc-900 dark:text-zinc-100">
                  {wordsToday.toLocaleString()} / {dailyGoal.toLocaleString()} words
                </span>
              </div>
              <div className="w-full bg-zinc-200 dark:bg-zinc-700 rounded-full h-3">
                <div
                  className={`h-3 rounded-full transition-all ${
                    progressPct >= 100
                      ? 'bg-green-500'
                      : progressPct >= 50
                      ? 'bg-blue-500'
                      : 'bg-amber-500'
                  }`}
                  style={{ width: `${progressPct}%` }}
                />
              </div>
              <p className="text-xs text-zinc-400 mt-1">{progressPct}% complete</p>
            </div>
          </div>
        </div>

        {/* Streak Card */}
        <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-900/30">
              <Flame className="w-5 h-5 text-orange-600 dark:text-orange-400" />
            </div>
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Writing Streak</h2>
          </div>

          <div className="flex items-end gap-8">
            <div className="text-center">
              <div className="text-5xl font-bold text-zinc-900 dark:text-zinc-100">
                {currentStreak}
                <span className="ml-1">🔥</span>
              </div>
              <p className="text-sm text-zinc-500 mt-1">Current Streak</p>
            </div>
            <div className="text-center pb-1">
              <div className="text-2xl font-semibold text-zinc-600 dark:text-zinc-400">
                {longestStreak}
              </div>
              <p className="text-xs text-zinc-500 mt-1">Longest Streak</p>
            </div>
          </div>
          <p className="text-xs text-zinc-400 mt-4">Write every day to keep your streak alive!</p>
        </div>
      </div>

      {/* Stats Overview Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3 mb-2">
            <PenLine className="w-5 h-5 text-zinc-400" />
            <span className="text-sm text-zinc-500">Words Today</span>
          </div>
          <p className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">{wordsToday.toLocaleString()}</p>
        </div>

        <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3 mb-2">
            <Calendar className="w-5 h-5 text-zinc-400" />
            <span className="text-sm text-zinc-500">Words This Week</span>
          </div>
          <p className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">{wordsThisWeek.toLocaleString()}</p>
        </div>

        <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3 mb-2">
            <TrendingUp className="w-5 h-5 text-zinc-400" />
            <span className="text-sm text-zinc-500">Words This Month</span>
          </div>
          <p className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">{wordsThisMonth.toLocaleString()}</p>
        </div>
      </div>

      {/* Weekly Activity Chart */}
      <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-6">Weekly Activity (Last 4 Weeks)</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {weeklyData.map((week) => (
            <div key={week.label} className="space-y-2">
              <p className="text-xs text-zinc-500 text-center font-medium">{week.label}</p>
              <div className="flex items-end gap-1 h-32">
                {week.days.map((day) => {
                  const height = maxWords > 0 ? Math.max(4, (day.words / maxWords) * 100) : 4
                  const metGoal = dailyGoal > 0 && day.words >= dailyGoal
                  const hasWords = day.words > 0
                  const isFuture = day.date > today

                  return (
                    <div key={day.date} className="flex-1 flex flex-col items-center justify-end h-full">
                      {!isFuture && (
                        <div
                          className={`w-full rounded-t-sm transition-all ${
                            metGoal
                              ? 'bg-blue-500 dark:bg-blue-400'
                              : hasWords
                              ? 'bg-zinc-300 dark:bg-zinc-600'
                              : 'bg-zinc-100 dark:bg-zinc-800'
                          }`}
                          style={{ height: `${hasWords ? height : 4}%` }}
                          title={`${day.dayLabel}: ${day.words.toLocaleString()} words`}
                        />
                      )}
                    </div>
                  )
                })}
              </div>
              <div className="flex gap-1">
                {week.days.map((day) => (
                  <p key={day.date} className="flex-1 text-center text-[10px] text-zinc-400">
                    {day.dayLabel.charAt(0)}
                  </p>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-4 mt-4 text-xs text-zinc-500">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm bg-blue-500 dark:bg-blue-400" />
            <span>Goal met</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm bg-zinc-300 dark:bg-zinc-600" />
            <span>Under goal</span>
          </div>
        </div>
      </div>

      {/* Recent Activity Table */}
      <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-4">Recent Activity (Last 14 Days)</h2>
        {recentLogs.length === 0 ? (
          <p className="text-zinc-500 text-sm py-4 text-center">No writing activity logged yet. Start writing to see your stats!</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-zinc-800">
                  <th className="text-left py-3 px-2 text-zinc-500 font-medium">Date</th>
                  <th className="text-right py-3 px-2 text-zinc-500 font-medium">Words Written</th>
                  <th className="text-right py-3 px-2 text-zinc-500 font-medium">Chapters</th>
                  <th className="text-center py-3 px-2 text-zinc-500 font-medium">Goal Met</th>
                </tr>
              </thead>
              <tbody>
                {recentLogs.map((log) => {
                  const metGoal = dailyGoal > 0 && log.words_written >= dailyGoal
                  return (
                    <tr key={log.id} className="border-b border-zinc-100 dark:border-zinc-800/50 hover:bg-zinc-50 dark:hover:bg-zinc-800/30">
                      <td className="py-3 px-2 text-zinc-900 dark:text-zinc-100">
                        {new Date(log.log_date + 'T00:00:00').toLocaleDateString('en-US', {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </td>
                      <td className="py-3 px-2 text-right font-medium text-zinc-900 dark:text-zinc-100">
                        {log.words_written.toLocaleString()}
                      </td>
                      <td className="py-3 px-2 text-right text-zinc-600 dark:text-zinc-400">
                        {log.chapters_worked}
                      </td>
                      <td className="py-3 px-2 text-center text-lg">
                        {metGoal ? '\u2705' : '\u274C'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
