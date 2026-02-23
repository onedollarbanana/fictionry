'use client'

import { useState } from 'react'
import { Lock, Crown, Sparkles, Star, LogIn, BookCheck } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { PLATFORM_CONFIG, type TierName } from '@/lib/platform-config'
import Link from 'next/link'

interface ChapterLockedOverlayProps {
  storyId: string
  chapterId: string
  authorId: string
  authorName: string
  requiredTier: TierName
  availableTiers: Array<{
    tier_name: TierName
    enabled: boolean
    description: string | null
  }>
  isLoggedIn: boolean
}

const TIER_HIERARCHY: Record<string, number> = {
  supporter: 1,
  enthusiast: 2,
  patron: 3,
}

const TIER_ICONS: Record<string, React.ReactNode> = {
  supporter: <Star className="h-5 w-5" />,
  enthusiast: <Crown className="h-5 w-5" />,
  patron: <Sparkles className="h-5 w-5" />,
}

const TIER_COLORS: Record<string, string> = {
  supporter: 'from-blue-500/20 to-blue-600/20 border-blue-500/30',
  enthusiast: 'from-purple-500/20 to-purple-600/20 border-purple-500/30',
  patron: 'from-amber-500/20 to-amber-600/20 border-amber-500/30',
}

export function ChapterLockedOverlay({
  storyId,
  chapterId,
  authorId,
  authorName,
  requiredTier,
  availableTiers,
  isLoggedIn,
}: ChapterLockedOverlayProps) {
  const [loadingTier, setLoadingTier] = useState<string | null>(null)
  const [markedRead, setMarkedRead] = useState(false)
  const [markingRead, setMarkingRead] = useState(false)

  const handleMarkAsRead = async () => {
    setMarkingRead(true)
    try {
      const supabase = createClient()
      await supabase.from('chapter_reads').upsert({
        chapter_id: chapterId,
        story_id: storyId,
        user_id: (await supabase.auth.getUser()).data.user?.id,
      }, { onConflict: 'user_id,chapter_id' })
      setMarkedRead(true)
    } catch (err) {
      console.error('Error marking as read:', err)
    } finally {
      setMarkingRead(false)
    }
  }

  const handleSubscribe = async (tierName: TierName) => {
    setLoadingTier(tierName)
    try {
      const res = await fetch('/api/stripe/author-subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ authorId, tierName }),
      })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      } else {
        console.error('No checkout URL returned')
        setLoadingTier(null)
      }
    } catch (err) {
      console.error('Subscribe error:', err)
      setLoadingTier(null)
    }
  }

  // Sort tiers by hierarchy
  const sortedTiers = [...availableTiers]
    .filter(t => TIER_HIERARCHY[t.tier_name] >= TIER_HIERARCHY[requiredTier])
    .sort((a, b) => TIER_HIERARCHY[a.tier_name] - TIER_HIERARCHY[b.tier_name])

  return (
    <div className="relative">
      {/* Blurred content placeholder */}
      <div className="select-none pointer-events-none" aria-hidden="true">
        <div className="blur-lg opacity-30 space-y-4 py-8">
          <div className="h-4 bg-muted-foreground/20 rounded w-full" />
          <div className="h-4 bg-muted-foreground/20 rounded w-11/12" />
          <div className="h-4 bg-muted-foreground/20 rounded w-full" />
          <div className="h-4 bg-muted-foreground/20 rounded w-9/12" />
          <div className="h-4 bg-muted-foreground/20 rounded w-full" />
          <div className="h-4 bg-muted-foreground/20 rounded w-10/12" />
          <div className="h-4 bg-muted-foreground/20 rounded w-full" />
          <div className="h-4 bg-muted-foreground/20 rounded w-8/12" />
        </div>
      </div>

      {/* Lock overlay */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="max-w-lg w-full mx-4 text-center space-y-6">
          {/* Lock icon */}
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-amber-500/10 border-2 border-amber-500/30">
            <Lock className="h-8 w-8 text-amber-500" />
          </div>

          <div className="space-y-2">
            <h3 className="text-xl font-bold">Advance Chapter</h3>
            <p className="text-muted-foreground">
              This chapter requires a{' '}
              <span className="font-semibold text-foreground">
                {PLATFORM_CONFIG.TIER_NAMES[requiredTier]}
              </span>{' '}
              subscription or higher to {authorName}
            </p>
          </div>

          {isLoggedIn && (
            <div>
              {markedRead ? (
                <p className="text-sm text-green-600 dark:text-green-400 flex items-center justify-center gap-1.5">
                  <BookCheck className="h-4 w-4" />
                  Marked as read
                </p>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleMarkAsRead}
                  disabled={markingRead}
                  className="text-muted-foreground"
                >
                  <BookCheck className="h-4 w-4 mr-1.5" />
                  {markingRead ? 'Marking...' : 'Mark as read'}
                </Button>
              )}
            </div>
          )}

          {!isLoggedIn ? (
            <Button asChild size="lg">
              <Link href="/login" className="gap-2">
                <LogIn className="h-4 w-4" />
                Sign in to subscribe
              </Link>
            </Button>
          ) : (
            <div className="space-y-3">
              {sortedTiers.map((tier) => {
                const price = PLATFORM_CONFIG.TIER_PRICES[tier.tier_name]
                const isRequired = tier.tier_name === requiredTier
                const isHigher = TIER_HIERARCHY[tier.tier_name] > TIER_HIERARCHY[requiredTier]
                const colorClass = TIER_COLORS[tier.tier_name] || ''

                return (
                  <Card
                    key={tier.tier_name}
                    className={`bg-gradient-to-r ${colorClass} border ${
                      isRequired ? 'ring-2 ring-primary' : ''
                    }`}
                  >
                    <CardContent className="py-4 px-5">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3 text-left">
                          <div className="text-amber-500">
                            {TIER_ICONS[tier.tier_name]}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold">
                                {PLATFORM_CONFIG.TIER_NAMES[tier.tier_name]}
                              </span>
                              {isRequired && (
                                <Badge variant="secondary" className="text-xs">
                                  Required
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground">
                              ${(price / 100).toFixed(0)}/month
                              {isHigher && ' · Includes access to this chapter'}
                            </p>
                            {tier.description && (
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {tier.description}
                              </p>
                            )}
                          </div>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => handleSubscribe(tier.tier_name)}
                          disabled={loadingTier !== null}
                        >
                          {loadingTier === tier.tier_name ? 'Loading...' : 'Subscribe'}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
