import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

function generateUsername(name: string | null, email: string | null): string {
  // Try to create a username from the display name
  let base = ''
  if (name) {
    base = name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')
  }
  if (!base && email) {
    base = email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')
  }
  if (!base) {
    base = 'user'
  }
  // Truncate and add random suffix to avoid collisions
  const suffix = Math.random().toString(36).substring(2, 6)
  return `${base.substring(0, 20)}-${suffix}`
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const type = searchParams.get('type')
  const next = searchParams.get('next')

  if (code) {
    const cookieStore = cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
          set(name: string, value: string, options: CookieOptions) {
            cookieStore.set({ name, value, ...options })
          },
          remove(name: string, options: CookieOptions) {
            cookieStore.delete({ name, ...options })
          },
        },
      }
    )

    const { data: sessionData, error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error) {
      // If this is a password recovery flow, redirect to reset password page
      if (type === 'recovery') {
        return NextResponse.redirect(`${origin}/reset-password`)
      }

      // Check if user has a profile
      const { data: { user } } = await supabase.auth.getUser()
      
      if (user) {
        // Check if this is an OAuth user and populate profile data
        const provider = user.app_metadata?.provider
        const isOAuth = provider === 'google'

        const { data: profile } = await supabase
          .from('profiles')
          .select('id, onboarding_completed, display_name, avatar_url')
          .eq('id', user.id)
          .single()

        if (!profile) {
          // No profile yet — if OAuth, create one with Google data pre-populated
          if (isOAuth) {
            const displayName = user.user_metadata?.full_name || user.user_metadata?.name || null
            const avatarUrl = user.user_metadata?.avatar_url || null
            const username = generateUsername(displayName, user.email ?? null)

            await supabase
              .from('profiles')
              .insert({
                id: user.id,
                username,
                display_name: displayName,
                avatar_url: avatarUrl,
              })

            // New OAuth user still needs onboarding (genre picker)
            return NextResponse.redirect(`${origin}/onboarding/genres`)
          }

          return NextResponse.redirect(`${origin}/create-profile`)
        }

        // Profile exists — if OAuth and missing display_name/avatar, update from Google data
        if (isOAuth) {
          const updates: Record<string, string> = {}
          
          if (!profile.display_name) {
            const displayName = user.user_metadata?.full_name || user.user_metadata?.name
            if (displayName) updates.display_name = displayName
          }
          if (!profile.avatar_url) {
            const avatarUrl = user.user_metadata?.avatar_url
            if (avatarUrl) updates.avatar_url = avatarUrl
          }

          if (Object.keys(updates).length > 0) {
            await supabase
              .from('profiles')
              .update(updates)
              .eq('id', user.id)
          }
        }

        // If user has an explicit next destination, respect it
        if (next) {
          return NextResponse.redirect(`${origin}${next}`)
        }

        // New users who haven't completed onboarding go to genre picker
        if (!profile.onboarding_completed) {
          return NextResponse.redirect(`${origin}/onboarding/genres`)
        }

        // Returning users go to library
        return NextResponse.redirect(`${origin}/library`)
      }

      // Fallback: if next is set use it, otherwise go to library
      return NextResponse.redirect(`${origin}${next || '/library'}`)
    }
  }

  // Return to login on error
  return NextResponse.redirect(`${origin}/login?error=auth_callback_error`)
}
