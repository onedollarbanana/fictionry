"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter, useParams } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { showToast } from "@/components/ui/toast"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Upload } from "lucide-react"
import { HelpLink } from '@/components/ui/help-link'
import { htmlToTiptapJSON } from "@/lib/html-to-tiptap"
import { countWordsFromJSON } from "@/components/editor/tiptap-editor"
import { parseEpub } from "@/components/author/import/epub-parser"
import { parseDocx } from "@/components/author/import/docx-parser"
import { parsePastedText } from "@/components/author/import/paste-parser"
import { ChapterPreview, type ParsedChapter } from "@/components/author/import/chapter-preview"
import { PlatformGuides } from "@/components/author/import/platform-guides"

export default function ImportChaptersPage() {
  const params = useParams()
  const storyId = params.id as string
  const router = useRouter()
  const [storyTitle, setStoryTitle] = useState("")
  const [chapters, setChapters] = useState<ParsedChapter[]>([])
  const [importing, setImporting] = useState(false)
  const [parsing, setParsing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pasteText, setPasteText] = useState("")

  useEffect(() => {
    async function loadStory() {
      const supabase = createClient()
      const { data } = await supabase
        .from("stories")
        .select("title")
        .eq("id", storyId)
        .single()
      if (data) setStoryTitle(data.title)
    }
    if (storyId) loadStory()
  }, [storyId])

  const handleFileUpload = useCallback(
    async (file: File, type: "epub" | "docx") => {
      setError(null)
      setParsing(true)
      setChapters([])
      try {
        let parsed: ParsedChapter[]
        if (type === "epub") {
          parsed = await parseEpub(file)
        } else {
          parsed = await parseDocx(file)
        }
        setChapters(parsed)
        showToast(`Found ${parsed.length} chapter${parsed.length !== 1 ? "s" : ""}`, "success")
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Failed to parse file"
        setError(msg)
        showToast(msg, "error")
      } finally {
        setParsing(false)
      }
    },
    []
  )

  function handleParse() {
    setError(null)
    if (!pasteText.trim()) {
      setError("Please paste some text first")
      return
    }
    const parsed = parsePastedText(pasteText)
    setChapters(parsed)
    showToast(`Found ${parsed.length} chapter${parsed.length !== 1 ? "s" : ""}`, "success")
  }

  async function handleImport() {
    if (chapters.length === 0) return
    setImporting(true)
    setError(null)

    try {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) throw new Error("You must be logged in")

      // Get current max chapter_number
      const { data: existingChapters } = await supabase
        .from("chapters")
        .select("chapter_number")
        .eq("story_id", storyId)
        .order("chapter_number", { ascending: false })
        .limit(1)

      let nextNumber =
        existingChapters && existingChapters.length > 0
          ? existingChapters[0].chapter_number + 1
          : 1

      // Prepare all chapters for insert
      const inserts = chapters.map((ch) => {
        const json = htmlToTiptapJSON(ch.html)
        const wordCount = countWordsFromJSON(json)
        const row = {
          story_id: storyId,
          title: ch.title,
          content: json,
          word_count: wordCount,
          chapter_number: nextNumber++,
          is_published: false,
          published_at: null,
        }
        return row
      })

      // Batch insert
      const { error: insertError } = await supabase
        .from("chapters")
        .insert(inserts)

      if (insertError) throw new Error(insertError.message)

      // Update story totals
      const { data: allChapters } = await supabase
        .from("chapters")
        .select("word_count, is_published")
        .eq("story_id", storyId)

      const totalChapters = (allChapters || []).filter((c) => c.is_published).length
      const totalWords = (allChapters || [])
        .filter((c) => c.is_published)
        .reduce((sum, c) => sum + (c.word_count || 0), 0)

      await supabase
        .from("stories")
        .update({
          chapter_count: totalChapters,
          total_word_count: totalWords,
          updated_at: new Date().toISOString(),
        })
        .eq("id", storyId)

      showToast(
        `Successfully imported ${chapters.length} chapters as drafts!`,
        "success"
      )
      router.push(`/author/stories/${storyId}`)
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Import failed"
      setError(msg)
      showToast(msg, "error")
    } finally {
      setImporting(false)
    }
  }

  function FileDropZone({
    accept,
    type,
  }: {
    accept: string
    type: "epub" | "docx"
  }) {
    const [dragOver, setDragOver] = useState(false)

    return (
      <div
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          dragOver ? "border-primary bg-primary/5" : "border-muted-foreground/25"
        }`}
        onDragOver={(e) => {
          e.preventDefault()
          setDragOver(true)
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragOver(false)
          const file = e.dataTransfer.files[0]
          if (file) handleFileUpload(file, type)
        }}
      >
        <Upload className="w-8 h-8 mx-auto mb-3 text-muted-foreground" />
        <p className="text-sm text-muted-foreground mb-3">
          Drag & drop your .{type} file here, or
        </p>
        <label>
          <input
            type="file"
            accept={accept}
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) handleFileUpload(file, type)
            }}
          />
          <Button type="button" variant="outline" asChild>
            <span>Choose File</span>
          </Button>
        </label>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-4">
        <Link
          href={`/author/stories/${storyId}`}
          className="text-muted-foreground hover:text-foreground"
        >
          ← Back to {storyTitle || "Story"}
        </Link>
      </div>

      <h1 className="text-3xl font-bold mb-6 flex items-center gap-2">Import Chapters <HelpLink href="/guides/authors/importing" label="Import guide" /></h1>

      <PlatformGuides />

      {error && (
        <div className="p-3 text-sm text-red-500 bg-red-50 dark:bg-red-950 rounded mb-4">
          {error}
        </div>
      )}

      <Tabs defaultValue="epub" className="mb-8">
        <TabsList className="mb-4">
          <TabsTrigger value="epub">EPUB</TabsTrigger>
          <TabsTrigger value="docx">DOCX</TabsTrigger>
          <TabsTrigger value="paste">Paste</TabsTrigger>
        </TabsList>

        <TabsContent value="epub">
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Upload an EPUB file to import chapters. Great for books exported
              from Royal Road, AO3, Calibre, and other platforms.
            </p>
            {parsing ? (
              <div className="text-center py-8 text-muted-foreground">
                Parsing EPUB file...
              </div>
            ) : (
              <FileDropZone accept=".epub" type="epub" />
            )}
          </div>
        </TabsContent>

        <TabsContent value="docx">
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Upload a Word document (.docx). Chapters are split on Heading 1 /
              Heading 2 styles, or you can use ---CHAPTER--- markers.
            </p>
            {parsing ? (
              <div className="text-center py-8 text-muted-foreground">
                Parsing DOCX file...
              </div>
            ) : (
              <FileDropZone accept=".docx" type="docx" />
            )}
          </div>
        </TabsContent>

        <TabsContent value="paste">
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Paste your chapter text below. Separate chapters with{" "}
              <code className="px-1 py-0.5 bg-muted rounded text-xs">
                ---CHAPTER---
              </code>{" "}
              on its own line.
            </p>
            <textarea
              className="w-full min-h-[300px] p-3 border rounded-lg bg-background text-sm font-mono resize-y focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder={`Chapter 1: The Beginning\nOnce upon a time...\n\n---CHAPTER---\n\nChapter 2: The Journey\nThe hero set out on their quest...`}
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
            />
            <Button onClick={handleParse} disabled={!pasteText.trim()}>
              Parse Chapters
            </Button>
          </div>
        </TabsContent>
      </Tabs>

      {chapters.length > 0 && (
        <ChapterPreview
          chapters={chapters}
          onChaptersChange={setChapters}
          onImport={handleImport}
          importing={importing}
          storyId={storyId}
        />
      )}
    </div>
  )
}
