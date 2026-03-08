"use client"

import { useState, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { X, ChevronUp, ChevronDown, AlertTriangle } from "lucide-react"
import { htmlToTiptapJSON } from "@/lib/html-to-tiptap"
import { countWordsFromJSON } from "@/components/editor/tiptap-editor"

export interface ParsedChapter {
  title: string
  html: string
}

interface ChapterPreviewProps {
  chapters: ParsedChapter[]
  onChaptersChange: (chapters: ParsedChapter[]) => void
  onImport: () => void
  importing: boolean
  storyId: string
  publishOnImport?: boolean
}

/**
 * Sanitize HTML to remove dangerous elements (scripts, event handlers, etc.)
 * Uses the browser's built-in DOMParser — no external dependency needed.
 */
function sanitizeHtml(html: string): string {
  if (typeof window === 'undefined') return html

  const parser = new DOMParser()
  const doc = parser.parseFromString(html, 'text/html')

  // Remove script tags
  doc.querySelectorAll('script').forEach((el) => el.remove())
  // Remove style tags (CSS injection vector)
  doc.querySelectorAll('style').forEach((el) => el.remove())

  // Remove dangerous elements and event handler attributes
  const allElements = doc.body.querySelectorAll('*')
  allElements.forEach((el) => {
    // Remove dangerous tags entirely
    if (['iframe', 'object', 'embed', 'form', 'input', 'textarea', 'base', 'meta', 'link'].includes(el.tagName.toLowerCase())) {
      el.remove()
      return
    }
    // Remove event handlers and javascript: URLs
    const attrs = Array.from(el.attributes)
    attrs.forEach((attr) => {
      if (attr.name.startsWith('on') || attr.value.startsWith('javascript:')) {
        el.removeAttribute(attr.name)
      }
    })
  })

  return doc.body.innerHTML
}

export function ChapterPreview({
  chapters,
  onChaptersChange,
  onImport,
  importing,
  publishOnImport = false,
}: ChapterPreviewProps) {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null)

  const wordCounts = useMemo(() => {
    return chapters.map((ch) => {
      try {
        const json = htmlToTiptapJSON(ch.html)
        return countWordsFromJSON(json)
      } catch {
        return 0
      }
    })
  }, [chapters])

  const totalWords = useMemo(
    () => wordCounts.reduce((sum, c) => sum + c, 0),
    [wordCounts]
  )

  function updateTitle(index: number, newTitle: string) {
    const updated = [...chapters]
    updated[index] = { ...updated[index], title: newTitle }
    onChaptersChange(updated)
  }

  function removeChapter(index: number) {
    onChaptersChange(chapters.filter((_, i) => i !== index))
  }

  function moveChapter(index: number, direction: -1 | 1) {
    const newIndex = index + direction
    if (newIndex < 0 || newIndex >= chapters.length) return
    const updated = [...chapters]
    const temp = updated[index]
    updated[index] = updated[newIndex]
    updated[newIndex] = temp
    onChaptersChange(updated)
    if (expandedIndex === index) setExpandedIndex(newIndex)
    else if (expandedIndex === newIndex) setExpandedIndex(index)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">
          {chapters.length} chapter{chapters.length !== 1 ? "s" : ""} detected
        </h3>
        <span className="text-sm text-muted-foreground">
          {totalWords.toLocaleString()} total words
        </span>
      </div>

      <div className="space-y-2">
        {chapters.map((chapter, i) => (
          <div key={i} className="border rounded-lg bg-card overflow-hidden">
            <div className="flex items-center gap-2 p-3">
              <span className="text-sm text-muted-foreground font-mono w-8 shrink-0">
                {i + 1}.
              </span>
              <Input
                value={chapter.title}
                onChange={(e) => updateTitle(i, e.target.value)}
                className="h-8 text-sm flex-1"
              />
              <span className="text-xs text-muted-foreground whitespace-nowrap">
                {wordCounts[i].toLocaleString()} words
              </span>
              {wordCounts[i] < 50 && (
                <AlertTriangle className="w-4 h-4 text-yellow-500 shrink-0" />
              )}
              <div className="flex gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => moveChapter(i, -1)}
                  disabled={i === 0}
                  className="p-1 hover:bg-muted rounded disabled:opacity-30"
                  title="Move up"
                >
                  <ChevronUp className="w-3 h-3" />
                </button>
                <button
                  type="button"
                  onClick={() => moveChapter(i, 1)}
                  disabled={i === chapters.length - 1}
                  className="p-1 hover:bg-muted rounded disabled:opacity-30"
                  title="Move down"
                >
                  <ChevronDown className="w-3 h-3" />
                </button>
              </div>
              <button
                type="button"
                onClick={() =>
                  setExpandedIndex(expandedIndex === i ? null : i)
                }
                className="p-1 hover:bg-muted rounded text-xs text-muted-foreground"
              >
                {expandedIndex === i ? "Hide" : "Preview"}
              </button>
              <button
                type="button"
                onClick={() => removeChapter(i)}
                className="p-1 hover:bg-muted rounded text-destructive"
                title="Remove chapter"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
            {expandedIndex === i && (
              <div
                className="border-t p-4 text-sm prose prose-sm dark:prose-invert max-w-none max-h-64 overflow-y-auto"
                dangerouslySetInnerHTML={{ __html: sanitizeHtml(chapter.html) }}
              />
            )}
          </div>
        ))}
      </div>

      {chapters.some((_, i) => wordCounts[i] < 50) && (
        <p className="text-sm text-yellow-500 flex items-center gap-1">
          <AlertTriangle className="w-4 h-4" />
          Some chapters have very low word counts (&lt;50 words). These may be
          cover pages or table of contents — consider removing them.
        </p>
      )}

      <Button
        onClick={onImport}
        disabled={importing || chapters.length === 0}
        className="w-full"
        size="lg"
      >
        {importing
          ? `Importing ${chapters.length} chapters...`
          : `Import All ${chapters.length} Chapters${publishOnImport ? " (Published)" : " as Drafts"}`}
      </Button>
    </div>
  )
}
