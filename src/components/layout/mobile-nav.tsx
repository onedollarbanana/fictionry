'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { useUser } from '@/lib/hooks/useUser'
import { Menu, X, Home, BookOpen, Bell, Pen, LogIn, LogOut, UserPlus, Library, Settings, User, TrendingUp, Flame, Star, Award } from 'lucide-react'
import { getUnreadCount } from '@/lib/notifications'

interface MobileNavProps {
  onLogout: () => void
}

export function MobileNav({ onLogout }: MobileNavProps) {
  const [isOpen, setIsOpen] = useState(false)
  const { user, profile } = useUser()
  const pathname = usePathname()
  const menuRef = useRef<HTMLDivElement>(null)
  const [unreadCount, setUnreadCount] = useState(0)

  // Close nav when route changes
  useEffect(() => {
    setIsOpen(false)
  }, [pathname])

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])

  // Prevent body scroll when nav is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  // Fetch unread notification count
  useEffect(() => {
    if (user) {
      getUnreadCount().then(setUnreadCount).catch(() => {})
    }
  }, [user])

  return (
    <div className="relative md:hidden" ref={menuRef}>
      {/* Hamburger button */}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setIsOpen(!isOpen)}
        aria-label={isOpen ? "Close menu" : "Open menu"}
      >
        {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </Button>

      {/* Dropdown menu */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black/20 z-40" 
            onClick={() => setIsOpen(false)}
          />
          
          {/* Menu */}
          <div className="absolute top-full right-0 mt-2 w-64 bg-white dark:bg-zinc-900 border border-border rounded-lg shadow-xl z-50 overflow-hidden">
            {/* Nav links */}
            <nav className="p-2">
              <Link
                href="/"
                className="flex items-center gap-3 px-3 py-2.5 rounded-md hover:bg-muted transition-colors"
                onClick={() => setIsOpen(false)}
              >
                <Home className="h-5 w-5 text-muted-foreground" />
                <span>Home</span>
              </Link>
              <Link
                href="/browse"
                className="flex items-center gap-3 px-3 py-2.5 rounded-md hover:bg-muted transition-colors"
                onClick={() => setIsOpen(false)}
              >
                <BookOpen className="h-5 w-5 text-muted-foreground" />
                <span>Browse Stories</span>
              </Link>

              <div className="my-2 border-t" />
              <p className="px-3 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Discover</p>
              <Link
                href="/rising-stars"
                className="flex items-center gap-3 px-3 py-2.5 rounded-md hover:bg-muted transition-colors"
                onClick={() => setIsOpen(false)}
              >
                <TrendingUp className="h-5 w-5 text-muted-foreground" />
                <span>Rising Stars</span>
              </Link>
              <Link
                href="/popular"
                className="flex items-center gap-3 px-3 py-2.5 rounded-md hover:bg-muted transition-colors"
                onClick={() => setIsOpen(false)}
              >
                <Flame className="h-5 w-5 text-muted-foreground" />
                <span>Most Popular</span>
              </Link>
              <Link
                href="/new-releases"
                className="flex items-center gap-3 px-3 py-2.5 rounded-md hover:bg-muted transition-colors"
                onClick={() => setIsOpen(false)}
              >
                <Star className="h-5 w-5 text-muted-foreground" />
                <span>New Releases</span>
              </Link>
              <Link
                href="/community-picks"
                className="flex items-center gap-3 px-3 py-2.5 rounded-md hover:bg-muted transition-colors"
                onClick={() => setIsOpen(false)}
              >
                <Award className="h-5 w-5 text-muted-foreground" />
                <span>Community Picks</span>
              </Link>
              <Link
                href="/genres"
                className="flex items-center gap-3 px-3 py-2.5 rounded-md hover:bg-muted transition-colors"
                onClick={() => setIsOpen(false)}
              >
                <BookOpen className="h-5 w-5 text-muted-foreground" />
                <span>Genres</span>
              </Link>
              
              {user && (
                <>
                  <div className="my-2 border-t" />
                  <Link
                    href="/library"
                    className="flex items-center gap-3 px-3 py-2.5 rounded-md hover:bg-muted transition-colors"
                    onClick={() => setIsOpen(false)}
                  >
                    <Library className="h-5 w-5 text-muted-foreground" />
                    <span>My Library</span>
                  </Link>
                  {profile && (
                    <Link
                      href={`/profile/${profile.username}`}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-md hover:bg-muted transition-colors"
                      onClick={() => setIsOpen(false)}
                    >
                      <User className="h-5 w-5 text-muted-foreground" />
                      <span>My Profile</span>
                    </Link>
                  )}
                  <Link
                    href="/notifications"
                    className="flex items-center gap-3 px-3 py-2.5 rounded-md hover:bg-muted transition-colors"
                    onClick={() => setIsOpen(false)}
                  >
                    <Bell className="h-5 w-5 text-muted-foreground" />
                    <span>Notifications{unreadCount > 0 ? ` (${unreadCount})` : ''}</span>
                  </Link>
                  <Link
                    href="/author/dashboard"
                    className="flex items-center gap-3 px-3 py-2.5 rounded-md hover:bg-muted transition-colors"
                    onClick={() => setIsOpen(false)}
                  >
                    <Pen className="h-5 w-5 text-muted-foreground" />
                    <span>Author Dashboard</span>
                  </Link>
                  <Link
                    href="/settings/profile"
                    className="flex items-center gap-3 px-3 py-2.5 rounded-md hover:bg-muted transition-colors"
                    onClick={() => setIsOpen(false)}
                  >
                    <Settings className="h-5 w-5 text-muted-foreground" />
                    <span>Settings</span>
                  </Link>
                </>
              )}
            </nav>

            {/* Footer with auth actions */}
            <div className="p-2 border-t bg-muted/30">
              {user ? (
                <div className="space-y-2">
                  {profile && (
                    <p className="text-sm text-muted-foreground px-3 py-1">
                      Signed in as <span className="font-medium text-foreground">{profile.username}</span>
                    </p>
                  )}
                  <button
                    onClick={() => {
                      setIsOpen(false)
                      onLogout()
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md hover:bg-muted transition-colors text-left"
                  >
                    <LogOut className="h-5 w-5 text-muted-foreground" />
                    <span>Sign Out</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-1">
                  <Link 
                    href="/login" 
                    className="flex items-center gap-3 px-3 py-2.5 rounded-md hover:bg-muted transition-colors"
                    onClick={() => setIsOpen(false)}
                  >
                    <LogIn className="h-5 w-5 text-muted-foreground" />
                    <span>Sign In</span>
                  </Link>
                  <Link 
                    href="/signup" 
                    className="flex items-center gap-3 px-3 py-2.5 rounded-md hover:bg-muted transition-colors"
                    onClick={() => setIsOpen(false)}
                  >
                    <UserPlus className="h-5 w-5 text-muted-foreground" />
                    <span>Sign Up</span>
                  </Link>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
