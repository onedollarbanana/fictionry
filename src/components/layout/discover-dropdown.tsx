'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { ChevronDown, TrendingUp, Flame, Star, Clock, Users, Award, BookOpen, Tag, Sparkles } from 'lucide-react'

const discoverLinks = [
  { href: '/for-you', label: 'For You', icon: Sparkles, desc: 'Stories matched to your taste' },
  { href: '/rising-stars', label: 'Rising Stars', icon: TrendingUp, desc: 'New stories gaining traction' },
  { href: '/popular', label: 'Rising Across Fictionry', icon: Flame, desc: 'Best rising stories every genre' },
  { href: '/most-followed', label: 'Most Followed', icon: Users, desc: 'Stories with the most fans' },
  { href: '/new-releases', label: 'New Releases', icon: Star, desc: 'Fresh stories just published' },
  { href: '/recently-updated', label: 'Recently Updated', icon: Clock, desc: 'Latest chapter drops' },
  { href: '/community-picks', label: 'Community Picks', icon: Award, desc: 'Reader-voted favorites' },
  { href: '/genres', label: 'Genres', icon: BookOpen, desc: 'Browse by genre' },
  { href: '/tags', label: 'Tags', icon: Tag, desc: 'Explore story tags' },
]

export function DiscoverDropdown() {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        Discover
        <ChevronDown className={`h-3.5 w-3.5 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-72 bg-background border border-border rounded-lg shadow-xl z-50 py-2">
          {discoverLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted transition-colors"
              onClick={() => setIsOpen(false)}
            >
              <link.icon className="h-4 w-4 text-muted-foreground shrink-0" />
              <div>
                <p className="text-sm font-medium">{link.label}</p>
                <p className="text-xs text-muted-foreground">{link.desc}</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
