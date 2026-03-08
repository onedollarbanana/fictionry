'use client'

import { BookOpen, X } from 'lucide-react'

interface ResumeToastProps {
  show: boolean
  onDismiss?: () => void
}

export function ResumeToast({ show, onDismiss }: ResumeToastProps) {
  if (!show) return null

  return (
    <div className="fixed bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="flex items-center gap-2 bg-primary text-primary-foreground pl-4 pr-2 py-2 rounded-full shadow-lg text-sm font-medium">
        <BookOpen className="h-4 w-4 shrink-0" />
        <span>Resuming where you left off</span>
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="ml-1 p-0.5 rounded-full hover:bg-primary-foreground/20 transition-colors"
            aria-label="Dismiss"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  )
}
