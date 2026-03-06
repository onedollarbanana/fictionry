import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { rateLimit, getRateLimitConfig } from '@/lib/rate-limit-server'

export async function middleware(request: NextRequest) {
  // Skip if env vars not configured (prevents crash)
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return NextResponse.next()
  }

  // --- Rate limiting for API routes ---
  if (request.nextUrl.pathname.startsWith('/api')) {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
    const config = getRateLimitConfig(request.nextUrl.pathname)
    const result = rateLimit(
      `${ip}:${request.nextUrl.pathname.split('/').slice(0, 3).join('/')}`,
      config.limit,
      config.windowMs
    )

    if (!result.success) {
      return new NextResponse(JSON.stringify({ error: 'Too many requests' }), {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': String(Math.ceil((result.reset - Date.now()) / 1000)),
          'X-RateLimit-Limit': String(config.limit),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': String(result.reset),
        },
      })
    }
  }

  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({ name, value, ...options })
          response = NextResponse.next({
            request: { headers: request.headers },
          })
          response.cookies.set({ name, value, ...options })
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({ name, value: '', ...options })
          response = NextResponse.next({
            request: { headers: request.headers },
          })
          response.cookies.set({ name, value: '', ...options })
        },
      },
    }
  )

  try {
    const { data: { user } } = await supabase.auth.getUser()

    // Check if user is suspended or banned
    if (user && !request.nextUrl.pathname.startsWith('/suspended') && !request.nextUrl.pathname.startsWith('/api') && !request.nextUrl.pathname.startsWith('/auth')) {
      const { data: modAction } = await supabase
        .from('user_moderation')
        .select('action, reason, expires_at')
        .eq('user_id', user.id)
        .in('action', ['ban', 'suspension_1d', 'suspension_3d', 'suspension_7d', 'suspension_30d'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (modAction) {
        const isBan = modAction.action === 'ban';
        const isSuspensionActive = modAction.expires_at && new Date(modAction.expires_at) > new Date();

        if (isBan || isSuspensionActive) {
          const params = new URLSearchParams({
            reason: modAction.reason || 'Policy violation',
            ...(modAction.expires_at ? { until: modAction.expires_at } : {}),
            type: isBan ? 'ban' : 'suspension',
          });
          return NextResponse.redirect(new URL(`/suspended?${params.toString()}`, request.url));
        }
      }
    }

    // Admin route protection — block before page renders
    if (request.nextUrl.pathname.startsWith('/admin')) {
      if (!user) {
        return NextResponse.redirect(new URL('/login', request.url))
      }

      const { data: adminProfile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      if (!adminProfile || !['admin', 'moderator'].includes(adminProfile.role)) {
        return NextResponse.redirect(new URL('/', request.url))
      }
    }

    // Protected routes - require auth
    if (request.nextUrl.pathname.startsWith('/author/') || request.nextUrl.pathname === '/author') {
      if (!user) {
        return NextResponse.redirect(new URL('/login', request.url))
      }

      // Check if user has profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', user.id)
        .single()

      if (!profile && !request.nextUrl.pathname.startsWith('/create-profile')) {
        return NextResponse.redirect(new URL('/create-profile', request.url))
      }
    }

    // Protect onboarding route - require auth
    if (request.nextUrl.pathname.startsWith('/onboarding')) {
      if (!user) {
        return NextResponse.redirect(new URL('/login?redirect=/onboarding/genres', request.url))
      }
    }

    // Protect library route - require auth
    if (request.nextUrl.pathname === '/library' || request.nextUrl.pathname.startsWith('/library/')) {
      if (!user) {
        return NextResponse.redirect(new URL('/login?redirect=/library', request.url))
      }
    }

    // Redirect logged-in users away from auth pages
    if (user && (request.nextUrl.pathname === '/login' || request.nextUrl.pathname === '/signup')) {
      return NextResponse.redirect(new URL('/library', request.url))
    }
  } catch (error) {
    // If auth check fails, allow request to continue
    console.error('Middleware auth error:', error)
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
