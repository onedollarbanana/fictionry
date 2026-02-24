import Link from 'next/link'
import { BookOpen, Twitter, Github, Mail } from 'lucide-react'

export function Footer() {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="border-t bg-zinc-50 dark:bg-zinc-900">
      <div className="max-w-6xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="space-y-4">
            <Link href="/" className="flex items-center gap-2 text-xl font-bold">
              <BookOpen className="h-6 w-6 text-violet-600" />
              <span>Fictionry</span>
            </Link>
            <p className="text-sm text-muted-foreground">
              Where stories come alive. A modern platform for web fiction authors and readers.
            </p>
          </div>

          {/* Explore */}
          <div className="space-y-4">
            <h3 className="font-semibold">Explore</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/browse" className="text-muted-foreground hover:text-foreground transition-colors">
                  Browse Stories
                </Link>
              </li>
              <li>
                <Link href="/genres" className="text-muted-foreground hover:text-foreground transition-colors">
                  All Genres
                </Link>
              </li>
              <li>
                <Link href="/browse?sort=rising" className="text-muted-foreground hover:text-foreground transition-colors">
                  Rising Stars
                </Link>
              </li>
              <li>
                <Link href="/browse?sort=popular" className="text-muted-foreground hover:text-foreground transition-colors">
                  Popular This Week
                </Link>
              </li>
              <li>
                <Link href="/browse?sort=rating" className="text-muted-foreground hover:text-foreground transition-colors">
                  Best Rated
                </Link>
              </li>
            </ul>
          </div>

          {/* Authors */}
          <div className="space-y-4">
            <h3 className="font-semibold">For Authors</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/author/dashboard" className="text-muted-foreground hover:text-foreground transition-colors">
                  Author Dashboard
                </Link>
              </li>
              <li>
                <Link href="/author/stories/new" className="text-muted-foreground hover:text-foreground transition-colors">
                  Start Writing
                </Link>
              </li>
              <li>
                <Link href="/about" className="text-muted-foreground hover:text-foreground transition-colors">
                  Why Fictionry?
                </Link>
              </li>
            </ul>
          </div>

          {/* Connect */}
          <div className="space-y-4">
            <h3 className="font-semibold">Connect</h3>
            <ul className="space-y-2 text-sm mb-3">
              <li>
                <Link href="/support" className="text-muted-foreground hover:text-foreground transition-colors">
                  Support Center
                </Link>
              </li>
            </ul>
            <div className="flex gap-4">
              <a
                href="https://twitter.com/fictionry"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Twitter"
              >
                <Twitter className="h-5 w-5" />
              </a>
              <a
                href="https://github.com/fictionry"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground transition-colors"
                aria-label="GitHub"
              >
                <Github className="h-5 w-5" />
              </a>
              <a
                href="mailto:hello@fictionry.io"
                className="text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Email"
              >
                <Mail className="h-5 w-5" />
              </a>
            </div>
            <p className="text-sm text-muted-foreground">
              Questions? Reach out anytime.
            </p>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-12 pt-8 border-t flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-muted-foreground">
            © {currentYear} Fictionry. All rights reserved.
          </p>
          <div className="flex flex-wrap justify-center gap-6 text-sm">
            <Link href="/about" className="text-muted-foreground hover:text-foreground transition-colors">
              About
            </Link>
            <Link href="/privacy" className="text-muted-foreground hover:text-foreground transition-colors">
              Privacy Policy
            </Link>
            <Link href="/terms" className="text-muted-foreground hover:text-foreground transition-colors">
              Terms of Service
            </Link>
            <Link href="/payment-terms" className="text-muted-foreground hover:text-foreground transition-colors">
              Payment Terms
            </Link>
            <Link href="/dmca" className="text-muted-foreground hover:text-foreground transition-colors">
              DMCA
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
