'use client'

import { useState } from 'react'
import { Crown, Sparkles, Star, BookOpen, LogIn, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { PLATFORM_CONFIG, type TierName } from '@/lib/platform-config'
import Link from 'next/link'

interface AuthorTierCardsProps {
  authorId: string
  authorName: string
  tiers: Array<{
    tier_name: TierName
    description: string | null
    advance_chapter_count: number
  }>
  currentSubscription?: {
    tier_name: TierName
    status: string
  } | null
  isLoggedIn: boolean
  advanceChapterCount?: number
}

const TIER_ICONS: Record<string, React.ReactNode> = {
  supporter: <Star className="h-6 w-6" />,
  enthusiast: <Crown className="h-6 w-6" />,
  patron: <Sparkles className="h-6 w-6" />,
}

const TIER_COLORS: Record<string, string> = {
  supporter: 'from-blue-500/10 to-blue-600/10 border-blue-500/20 hover:border-blue-500/40',
  enthusiast: 'from-purple-500/10 to-purple-600/10 border-purple-500/20 hover:border-purple-500/40',
  patron: 'from-amber-500/10 to-amber-600/10 border-amber-500/20 hover:border-amber-500/40',
}

const TIER_ICON_COLORS: Record<string, string> = {
  supporter: 'text-blue-500',
  enthusiast: 'text-purple-500',
  patron: 'text-amber-500',
}

const TIER_HIERARCHY: Record<string, number> = {
  supporter: 1,
  enthusiast: 2,
  patron: 3,
}

export function AuthorTierCards({
  authorId,
  authorName,
  tiers,
  currentSubscription,
  isLoggedIn,
}: AuthorTierCardsProps) {
  const [loadingTier, setLoadingTier] = useState<string | null>(null)

  const sortedTiers = [...tiers].sort(
    (a, b) => TIER_HIERARCHY[a.tier_name] - TIER_HIERARCHY[b.tier_name]
  )

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

  const isCurrentTier = (tierName: TierName) =>
    currentSubscription?.tier_name === tierName && currentSubscription?.status === 'active'

  const hasHigherTier = (tierName: TierName) =>
    currentSubscription?.status === 'active' &&
    TIER_HIERARCHY[currentSubscription.tier_name] > TIER_HIERARCHY[tierName]

  return (
    <div>
      <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
        <BookOpen className="h-5 w-5" />
        Support {authorName}
      </h2>
      {currentSubscription?.status === 'active' && (
        <div className="mb-4 p-3 bg-primary/5 border border-primary/20 rounded-lg flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-primary" />
            <span className="text-sm">
              You&apos;re subscribed as <strong>{PLATFORM_CONFIG.TIER_NAMES[currentSubscription.tier_name]}</strong>
            </span>
          </div>
          <Link href="/settings/billing" className="text-sm text-primary hover:underline">
            Manage
          </Link>
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {sortedTiers.map((tier) => {
          const price = PLATFORM_CONFIG.TIER_PRICES[tier.tier_name]
          const isCurrent = isCurrentTier(tier.tier_name)
          const hasHigher = hasHigherTier(tier.tier_name)
          const colorClass = TIER_COLORS[tier.tier_name] || ''
          const iconColor = TIER_ICON_COLORS[tier.tier_name] || 'text-muted-foreground'

          return (
            <Card
              key={tier.tier_name}
              className={`bg-gradient-to-b ${colorClass} transition-colors ${
                isCurrent ? 'ring-2 ring-primary' : ''
              }`}
            >
              <CardContent className="pt-6 pb-5 px-5 flex flex-col items-center text-center space-y-3">
                <div className={iconColor}>
                  {TIER_ICONS[tier.tier_name]}
                </div>
                <div>
                  <div className="flex items-center justify-center gap-2">
                    <h3 className="font-semibold text-lg">
                      {PLATFORM_CONFIG.TIER_NAMES[tier.tier_name]}
                    </h3>
                    {isCurrent && (
                      <Badge variant="secondary" className="text-xs">Current Plan</Badge>
                    )}
                  </div>
                  <p className="text-2xl font-bold mt-1">
                    ${(price / 100).toFixed(0)}
                    <span className="text-sm font-normal text-muted-foreground">/month</span>
                  </p>
                </div>
                {tier.advance_chapter_count > 0 && (
                  <p className="text-sm text-muted-foreground">
                    {tier.advance_chapter_count} advance chapter{tier.advance_chapter_count !== 1 ? 's' : ''}
                  </p>
                )}
                {tier.description && (
                  <p className="text-sm text-muted-foreground">{tier.description}</p>
                )}
                {!isLoggedIn ? (
                  <Button asChild variant="outline" size="sm" className="w-full">
                    <Link href="/login" className="gap-1">
                      <LogIn className="h-3.5 w-3.5" />
                      Sign in to subscribe
                    </Link>
                  </Button>
                ) : isCurrent ? (
                  <Button variant="outline" size="sm" className="w-full" disabled>
                    Current Plan
                  </Button>
                ) : hasHigher ? (
                  <Button variant="outline" size="sm" className="w-full" disabled>
                    Included in your plan
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    className="w-full"
                    onClick={() => handleSubscribe(tier.tier_name)}
                    disabled={loadingTier !== null}
                  >
                    {loadingTier === tier.tier_name ? 'Loading...' : 'Subscribe'}
                  </Button>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
