'use client'

import { useState } from 'react'
import { Crown, Loader2, Check } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PLATFORM_CONFIG, type TierName } from '@/lib/platform-config'

interface TierData {
  tier_name: string
  description: string | null
}

interface SubscriptionData {
  tier_name: string
  status: string
}

interface ProfileTierSectionProps {
  authorId: string
  authorUsername: string
  tiers: TierData[]
  currentSubscription: SubscriptionData | null
  isOwnProfile: boolean
}

const tierColors: Record<string, string> = {
  supporter: 'border-emerald-500/50 bg-emerald-500/5',
  enthusiast: 'border-blue-500/50 bg-blue-500/5',
  patron: 'border-purple-500/50 bg-purple-500/5',
}

const tierAccents: Record<string, string> = {
  supporter: 'text-emerald-500',
  enthusiast: 'text-blue-500',
  patron: 'text-purple-500',
}

export function ProfileTierSection({ 
  authorId, 
  authorUsername,
  tiers, 
  currentSubscription,
  isOwnProfile 
}: ProfileTierSectionProps) {
  const [loading, setLoading] = useState<string | null>(null)

  if (tiers.length === 0) return null
  if (isOwnProfile) return null

  const handleSubscribe = async (tierName: string) => {
    setLoading(tierName)
    try {
      const res = await fetch('/api/stripe/author-subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ authorId, tierName }),
      })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      }
    } catch {
      // Handle error
    } finally {
      setLoading(null)
    }
  }

  const isSubscribed = currentSubscription?.status === 'active'
  const currentTier = currentSubscription?.tier_name

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Crown className="h-5 w-5 text-yellow-500" />
          Support {authorUsername}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isSubscribed && currentTier && (
          <div className="mb-4 p-3 rounded-lg bg-primary/5 border border-primary/20">
            <p className="text-sm font-medium">
              You&apos;re subscribed as{' '}
              <span className="capitalize">{currentTier}</span>
            </p>
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-3">
          {tiers.map((tier) => {
            const isCurrentTier = currentTier === tier.tier_name
            const price = PLATFORM_CONFIG.TIER_PRICES[tier.tier_name as TierName]
            return (
              <div
                key={tier.tier_name}
                className={`p-4 rounded-lg border-2 transition-colors ${
                  isCurrentTier 
                    ? tierColors[tier.tier_name] || 'border-primary/50 bg-primary/5'
                    : 'border-border hover:border-muted-foreground/30'
                }`}
              >
                <h4 className={`font-semibold capitalize ${tierAccents[tier.tier_name] || 'text-primary'}`}>
                  {tier.tier_name}
                </h4>
                {price && (
                  <p className="text-2xl font-bold mt-1">
                    ${(price / 100).toFixed(0)}
                    <span className="text-sm font-normal text-muted-foreground">/mo</span>
                  </p>
                )}
                {tier.description && (
                  <p className="text-xs text-muted-foreground mt-2">{tier.description}</p>
                )}
                {isCurrentTier ? (
                  <div className="mt-3 flex items-center gap-1.5 text-sm font-medium text-primary">
                    <Check className="h-4 w-4" />
                    Current tier
                  </div>
                ) : (
                  <button
                    onClick={() => handleSubscribe(tier.tier_name)}
                    disabled={loading !== null}
                    className="mt-3 w-full py-2 px-3 rounded-md text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {loading === tier.tier_name && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                    {isSubscribed ? 'Switch' : 'Subscribe'}
                  </button>
                )}
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
