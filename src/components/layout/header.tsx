'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/lib/hooks/useUser'
import { ThemeToggle } from '@/components/theme-toggle'
import { MobileNav } from '@/components/layout/mobile-nav'
import { Pen, Settings, LogOut, Loader2, User } from 'lucide-react'
import { NotificationBell } from '@/components/notifications/notification-bell'
import { DiscoverDropdown } from '@/components/layout/discover-dropdown'

export function Header() {
  const { user, profile, loading } = useUser()
  const router = useRouter()

  const handleLogout = async () => {
    if (!confirm('Are you sure you want to sign out?')) return
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 flex h-14 items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/" className="text-xl font-bold text-primary">
            Fictionry
          </Link>
          <nav className="hidden md:flex items-center gap-4">
            <Link href="/browse" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Browse
            </Link>
            <Link href="/library" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Library
            </Link>
            <DiscoverDropdown />
          </nav>
        </div>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          
          {/* Desktop auth buttons */}
          <div className="hidden md:flex items-center gap-2">
            {loading ? (
              // Show subtle loader during auth check
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            ) : user ? (
              <>
                {profile && (
                  <Link
                    href={`/profile/${profile.username}`}
                    className="p-2 text-muted-foreground hover:text-foreground transition-colors"
                    title="My Profile"
                  >
                    <User className="h-5 w-5" />
                  </Link>
                )}
                <NotificationBell />
                <Link
                  href="/author/dashboard"
                  className="p-2 text-muted-foreground hover:text-foreground transition-colors"
                  title="Author Dashboard"
                >
                  <Pen className="h-5 w-5" />
                </Link>
                <Link
                  href="/settings"
                  className="p-2 text-muted-foreground hover:text-foreground transition-colors"
                  title="Settings"
                >
                  <Settings className="h-5 w-5" />
                </Link>
                <button
                  onClick={handleLogout}
                  className="p-2 text-muted-foreground hover:text-foreground transition-colors"
                  title="Logout"
                >
                  <LogOut className="h-5 w-5" />
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors px-3 py-2"
                >
                  Sign In
                </Link>
                <Link
                  href="/signup"
                  className="text-sm bg-primary text-primary-foreground hover:bg-primary/90 px-3 py-2 rounded-md transition-colors"
                >
                  Sign Up
                </Link>
              </>
            )
          }
          </div>

          {/* Mobile navigation */}
          <MobileNav onLogout={handleLogout} />
        </div>
      </div>
    </header>
  )
}
