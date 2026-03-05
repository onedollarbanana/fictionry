'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/lib/hooks/useUser'
import { useToast } from '@/components/ui/toast'
import { Card, CardContent } from '@/components/ui/card'
import { BookOpen, MessageSquare, MessageCircle, Star, Trophy, Megaphone, Loader2 } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

interface NotificationType {
  key: string
  label: string
  description: string
  icon: LucideIcon
  emailSupported?: boolean
}

interface NotificationSection {
  title: string
  types: NotificationType[]
}

const NOTIFICATION_SECTIONS: NotificationSection[] = [
  {
    title: 'Stories',
    types: [
      {
        key: 'new_chapter',
        label: 'New Chapters',
        description: 'When a story you follow publishes a new chapter',
        icon: BookOpen,
        emailSupported: true,
      },
    ],
  },
  {
    title: 'Comments & Reviews',
    types: [
      {
        key: 'comment_reply',
        label: 'Comment Replies',
        description: 'When someone replies to your comment',
        icon: MessageSquare,
        emailSupported: true,
      },
      {
        key: 'new_comment',
        label: 'Chapter Comments',
        description: 'When someone comments on one of your chapters',
        icon: MessageCircle,
      },
      {
        key: 'new_review',
        label: 'New Reviews',
        description: 'When someone reviews your story',
        icon: Star,
        emailSupported: true,
      },
    ],
  },
  {
    title: 'Other',
    types: [
      {
        key: 'achievement',
        label: 'Achievements',
        description: 'When you earn a new badge or achievement',
        icon: Trophy,
      },
      {
        key: 'announcement',
        label: 'Announcements',
        description: 'Important site updates and news',
        icon: Megaphone,
        emailSupported: true,
      },
    ],
  },
]

// Notification types that support email
const EMAIL_SUPPORTED_TYPES = NOTIFICATION_SECTIONS.flatMap((s) =>
  s.types.filter((t) => t.emailSupported).map((t) => t.key)
)

export default function NotificationPreferencesPage() {
  const { user, loading: userLoading } = useUser()
  const { showToast } = useToast()
  const [inAppPrefs, setInAppPrefs] = useState<Record<string, boolean>>({})
  const [emailPrefs, setEmailPrefs] = useState<Record<string, boolean>>({})
  const [loading, setLoading] = useState(true)
  const [savingKey, setSavingKey] = useState<string | null>(null)

  const loadPreferences = useCallback(async () => {
    if (!user) return
    const supabase = createClient()
    const { data, error } = await supabase
      .from('notification_preferences')
      .select('notification_type, channel, enabled')
      .in('channel', ['in_app', 'email'])

    if (error) {
      showToast('Failed to load preferences', 'error')
      setLoading(false)
      return
    }

    const inApp: Record<string, boolean> = {}
    const email: Record<string, boolean> = {}

    // Default all to true
    NOTIFICATION_SECTIONS.forEach((section) =>
      section.types.forEach((t) => {
        inApp[t.key] = true
        if (t.emailSupported) email[t.key] = true
      })
    )

    // Override with saved values
    if (data) {
      data.forEach((row: { notification_type: string; channel: string; enabled: boolean }) => {
        if (row.channel === 'in_app') inApp[row.notification_type] = row.enabled
        if (row.channel === 'email') email[row.notification_type] = row.enabled
      })
    }

    // Seed default email prefs for email-supported types that have no row yet
    const existingEmailTypes = new Set(
      (data || []).filter((r) => r.channel === 'email').map((r) => r.notification_type)
    )
    const missingTypes = EMAIL_SUPPORTED_TYPES.filter((t) => !existingEmailTypes.has(t))
    if (missingTypes.length > 0) {
      await supabase.from('notification_preferences').upsert(
        missingTypes.map((t) => ({
          user_id: user.id,
          notification_type: t,
          channel: 'email',
          enabled: true,
          updated_at: new Date().toISOString(),
        })),
        { onConflict: 'user_id,notification_type,channel', ignoreDuplicates: true }
      )
    }

    setInAppPrefs(inApp)
    setEmailPrefs(email)
    setLoading(false)
  }, [user, showToast])

  useEffect(() => {
    if (!userLoading && user) {
      loadPreferences()
    } else if (!userLoading && !user) {
      setLoading(false)
    }
  }, [userLoading, user, loadPreferences])

  async function togglePreference(type: string, channel: 'in_app' | 'email') {
    if (!user || savingKey) return
    const currentValue = channel === 'in_app' ? (inAppPrefs[type] ?? true) : (emailPrefs[type] ?? true)
    const newValue = !currentValue
    const saveKey = `${type}_${channel}`

    // Optimistic update
    if (channel === 'in_app') {
      setInAppPrefs((prev) => ({ ...prev, [type]: newValue }))
    } else {
      setEmailPrefs((prev) => ({ ...prev, [type]: newValue }))
    }
    setSavingKey(saveKey)

    const supabase = createClient()
    const { error } = await supabase.from('notification_preferences').upsert(
      {
        user_id: user.id,
        notification_type: type,
        channel,
        enabled: newValue,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,notification_type,channel' }
    )

    if (error) {
      // Revert on error
      if (channel === 'in_app') {
        setInAppPrefs((prev) => ({ ...prev, [type]: currentValue }))
      } else {
        setEmailPrefs((prev) => ({ ...prev, [type]: currentValue }))
      }
      showToast('Failed to save preference', 'error')
    } else {
      showToast('Preference saved', 'success')
    }
    setSavingKey(null)
  }

  if (loading || userLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!user) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        Please sign in to manage notification preferences.
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Notification Preferences</h2>
        <p className="text-muted-foreground mt-1">
          Choose which notifications you&apos;d like to receive.
        </p>
      </div>

      {/* Column headers */}
      <div className="flex items-center justify-end gap-8 pr-4 text-xs text-muted-foreground font-medium uppercase tracking-wide">
        <span className="w-11 text-center">In-app</span>
        <span className="w-11 text-center">Email</span>
      </div>

      {NOTIFICATION_SECTIONS.map((section) => (
        <div key={section.title} className="space-y-3">
          <h3 className="text-lg font-semibold border-b pb-2">{section.title}</h3>
          <div className="space-y-2">
            {section.types.map((type) => {
              const Icon = type.icon
              const inAppEnabled = inAppPrefs[type.key] ?? true
              const emailEnabled = emailPrefs[type.key] ?? true
              const isSavingInApp = savingKey === `${type.key}_in_app`
              const isSavingEmail = savingKey === `${type.key}_email`

              return (
                <Card key={type.key}>
                  <CardContent className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="shrink-0 rounded-md bg-muted p-2">
                        <Icon className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-sm">{type.label}</p>
                        <p className="text-xs text-muted-foreground">{type.description}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-6 shrink-0 ml-4">
                      {/* In-App toggle */}
                      <button
                        type="button"
                        role="switch"
                        aria-checked={inAppEnabled}
                        aria-label={`${type.label} in-app notifications`}
                        disabled={isSavingInApp}
                        onClick={() => togglePreference(type.key, 'in_app')}
                        className={`
                          relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full
                          border-2 border-transparent transition-colors duration-200 ease-in-out
                          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2
                          disabled:cursor-not-allowed disabled:opacity-50
                          ${inAppEnabled ? 'bg-primary' : 'bg-muted'}
                        `}
                      >
                        <span
                          className={`
                            pointer-events-none inline-block h-5 w-5 transform rounded-full
                            bg-background shadow-lg ring-0 transition duration-200 ease-in-out
                            ${inAppEnabled ? 'translate-x-5' : 'translate-x-0'}
                          `}
                        />
                      </button>

                      {/* Email toggle */}
                      {type.emailSupported ? (
                        <button
                          type="button"
                          role="switch"
                          aria-checked={emailEnabled}
                          aria-label={`${type.label} email notifications`}
                          disabled={isSavingEmail}
                          onClick={() => togglePreference(type.key, 'email')}
                          className={`
                            relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full
                            border-2 border-transparent transition-colors duration-200 ease-in-out
                            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2
                            disabled:cursor-not-allowed disabled:opacity-50
                            ${emailEnabled ? 'bg-primary' : 'bg-muted'}
                          `}
                        >
                          <span
                            className={`
                              pointer-events-none inline-block h-5 w-5 transform rounded-full
                              bg-background shadow-lg ring-0 transition duration-200 ease-in-out
                              ${emailEnabled ? 'translate-x-5' : 'translate-x-0'}
                            `}
                          />
                        </button>
                      ) : (
                        <div className="relative group w-11">
                          <div className="flex items-center justify-center opacity-30 cursor-not-allowed">
                            <div className="relative inline-flex h-6 w-11 shrink-0 rounded-full bg-muted border-2 border-transparent">
                              <span className="pointer-events-none inline-block h-5 w-5 transform rounded-full bg-background shadow-lg ring-0 translate-x-0" />
                            </div>
                          </div>
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-popover text-popover-foreground text-xs rounded shadow-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap border">
                            Not available
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
