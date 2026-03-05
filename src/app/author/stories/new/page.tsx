'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { createClient } from '@/lib/supabase/client'
import { showToast } from '@/components/ui/toast'
import { ArrowLeft, ArrowRight, Loader2, Check } from 'lucide-react'
import Link from 'next/link'
import { PrimaryGenreSelector } from '@/components/author/taxonomy/primary-genre-selector'
import { SubgenreSelector } from '@/components/author/taxonomy/subgenre-selector'
import { TagSelector } from '@/components/author/taxonomy/tag-selector'
import { ContentRatingSelector } from '@/components/author/taxonomy/content-rating-selector'
import { ContentWarningsSelector } from '@/components/author/taxonomy/content-warnings-selector'
import { FormatSelector } from '@/components/author/taxonomy/format-selector'
import { OriginTypeToggle } from '@/components/author/taxonomy/origin-type-toggle'
import { FandomPicker } from '@/components/author/taxonomy/fandom-picker'
import { getPrimaryGenreBySlug, PRIMARY_GENRES } from '@/lib/constants'
import { getMinimumRatingForWarnings, type ContentRatingValue } from '@/lib/content-warnings'

const STEPS = [
  { id: 1, label: 'Basics' },
  { id: 2, label: 'Genre' },
  { id: 3, label: 'Tags' },
  { id: 4, label: 'Rating' },
  { id: 5, label: 'Warnings' },
  { id: 6, label: 'Format' },
]

export default function NewStoryPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Step 1: Basics
  const [title, setTitle] = useState('')
  const [tagline, setTagline] = useState('')
  const [blurb, setBlurb] = useState('')

  // Step 2: Genre
  const [primaryGenre, setPrimaryGenre] = useState<string | null>(null)
  const [subgenres, setSubgenres] = useState<string[]>([])
  const [originType, setOriginType] = useState<'original' | 'fan_fiction'>('original')
  const [fandoms, setFandoms] = useState<string[]>([])
  const [secondaryGenre, setSecondaryGenre] = useState<string | null>(null)

  // Step 3: Tags
  const [tags, setTags] = useState<string[]>([])

  // Step 4: Content Rating
  const [contentRating, setContentRating] = useState<ContentRatingValue | null>(null)

  // Step 5: Content Warnings
  const [contentWarnings, setContentWarnings] = useState<string[]>([])

  // Step 6: Format
  const [format, setFormat] = useState<string | null>(null)

  const minimumRating = getMinimumRatingForWarnings(contentWarnings)

  const canProceed = (): boolean => {
    switch (step) {
      case 1: return title.trim().length > 0
      case 2: return primaryGenre !== null && (originType === 'original' || fandoms.length > 0)
      case 3: return true // tags are optional
      case 4: return contentRating !== null
      case 5: return true // warnings are optional
      case 6: return format !== null
      default: return false
    }
  }

  const next = () => {
    if (step < STEPS.length && canProceed()) {
      setStep(s => s + 1)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  const back = () => {
    if (step > 1) setStep(s => s - 1)
  }

  const handleSubmit = async () => {
    if (!title.trim() || !primaryGenre || !contentRating || !format) {
      showToast('Please complete all required fields', 'error')
      return
    }

    setIsSubmitting(true)

    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        showToast('Please log in to create a story', 'error')
        router.push('/login')
        return
      }

      const { data, error } = await supabase
        .from('stories')
        .insert({
          title: title.trim(),
          tagline: tagline.trim() || null,
          blurb: blurb.trim() || null,
          author_id: user.id,
          // Taxonomy v3
          primary_genre: primaryGenre,
          subgenres,
          origin_type: originType,
          fandoms: originType === 'fan_fiction' ? fandoms : [],
          secondary_genre: originType === 'fan_fiction' ? secondaryGenre : null,
          tags,
          content_rating: contentRating,
          content_warnings: contentWarnings,
          format,
          // Legacy field — store primary genre here for backward compat
          genres: primaryGenre ? [primaryGenre] : [],
          status: 'ongoing',
          visibility: 'draft',
          word_count: 0,
        })
        .select()
        .single()

      if (error) throw error

      showToast('Story created! Now add your first chapter.', 'success')
      router.push(`/author/stories/${data.id}`)
    } catch (err) {
      console.error('Error creating story:', err)
      showToast('Failed to create story', 'error')
    } finally {
      setIsSubmitting(false)
    }
  }

  const selectedGenreData = primaryGenre ? getPrimaryGenreBySlug(primaryGenre) : null

  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      <Link
        href="/author/dashboard"
        className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-6"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Dashboard
      </Link>

      <h1 className="text-3xl font-bold mb-2">Create New Story</h1>
      <p className="text-muted-foreground mb-6 text-sm">Target: 60–90 seconds to complete</p>

      {/* Step progress */}
      <div className="flex items-center gap-1 mb-8">
        {STEPS.map((s, i) => (
          <div key={s.id} className="flex items-center gap-1 flex-1">
            <button
              type="button"
              onClick={() => step > s.id && setStep(s.id)}
              className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-medium transition-all flex-shrink-0 ${
                step === s.id
                  ? 'bg-amber-500 text-white'
                  : step > s.id
                  ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400 cursor-pointer hover:bg-amber-500/30'
                  : 'bg-muted text-muted-foreground'
              }`}
            >
              {step > s.id ? <Check className="h-3.5 w-3.5" /> : s.id}
            </button>
            <span className={`text-xs hidden sm:block ${step === s.id ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
              {s.label}
            </span>
            {i < STEPS.length - 1 && (
              <div className={`h-px flex-1 mx-1 ${step > s.id ? 'bg-amber-500/40' : 'bg-border'}`} />
            )}
          </div>
        ))}
      </div>

      <div className="space-y-6">
        {/* Step 1: Basics */}
        {step === 1 && (
          <div className="space-y-5">
            <div>
              <h2 className="text-xl font-semibold mb-4">Tell us about your story</h2>
            </div>
            <div className="space-y-2">
              <Label htmlFor="title">
                Title <span className="text-destructive">*</span>
              </Label>
              <Input
                id="title"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="Enter your story title..."
                maxLength={200}
                autoFocus
              />
              <p className="text-xs text-muted-foreground">{title.length}/200</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="tagline">Tagline <span className="text-muted-foreground text-xs font-normal">(optional)</span></Label>
              <Input
                id="tagline"
                value={tagline}
                onChange={e => setTagline(e.target.value)}
                placeholder="e.g., A sword, a secret, and the end of everything"
                maxLength={80}
              />
              <p className="text-xs text-muted-foreground">A punchy one-liner that sells your story — {tagline.length}/80</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="blurb">Blurb / Description <span className="text-muted-foreground text-xs font-normal">(optional)</span></Label>
              <Textarea
                id="blurb"
                value={blurb}
                onChange={e => setBlurb(e.target.value)}
                placeholder="A short description of your story..."
                rows={4}
                maxLength={2000}
              />
              <p className="text-xs text-muted-foreground">{blurb.length}/2000</p>
            </div>
          </div>
        )}

        {/* Step 2: Genre */}
        {step === 2 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold mb-1">What kind of story is this?</h2>
              <p className="text-sm text-muted-foreground">Choose the genre that best answers: what experience is the reader primarily here for?</p>
            </div>

            <div className="space-y-2">
              <Label>Origin <span className="text-destructive">*</span></Label>
              <OriginTypeToggle value={originType} onChange={v => {
                setOriginType(v)
                if (v === 'original') {
                  setFandoms([])
                  setSecondaryGenre(null)
                }
              }} />
            </div>

            {originType === 'fan_fiction' && (
              <div className="space-y-2">
                <Label>Fandom <span className="text-destructive">*</span></Label>
                <FandomPicker value={fandoms} onChange={setFandoms} />
              </div>
            )}

            <div className="space-y-2">
              <Label>Primary Genre <span className="text-destructive">*</span></Label>
              <PrimaryGenreSelector value={primaryGenre} onChange={v => {
                setPrimaryGenre(v)
                setSubgenres([]) // reset subgenres when genre changes
              }} />
            </div>

            {originType === 'fan_fiction' && primaryGenre === 'fan-fiction' && (
              <div className="space-y-2">
                <Label>Secondary Genre <span className="text-muted-foreground text-xs font-normal">(optional — helps cross-genre discovery)</span></Label>
                <div className="flex flex-wrap gap-2">
                  {PRIMARY_GENRES.filter(g => g.slug !== 'fan-fiction').map(g => (
                    <button
                      key={g.slug}
                      type="button"
                      onClick={() => setSecondaryGenre(secondaryGenre === g.slug ? null : g.slug)}
                      className={`px-3 py-1 rounded-full text-sm transition-colors ${
                        secondaryGenre === g.slug
                          ? 'bg-amber-500 text-white'
                          : 'bg-muted hover:bg-muted/70'
                      }`}
                    >
                      {g.emoji} {g.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label>Subgenres <span className="text-muted-foreground text-xs font-normal">(optional, up to 3)</span></Label>
              <SubgenreSelector
                primaryGenreSlug={primaryGenre}
                value={subgenres}
                onChange={setSubgenres}
              />
            </div>
          </div>
        )}

        {/* Step 3: Tags */}
        {step === 3 && (
          <div className="space-y-4">
            <div>
              <h2 className="text-xl font-semibold mb-1">Help readers find you</h2>
              <p className="text-sm text-muted-foreground">
                Tags describe your story&apos;s content, mood, and structure. Up to 12 discovery tags — Tone &amp; Mood and Representation are unlimited.
              </p>
            </div>
            <TagSelector value={tags} onChange={setTags} />
          </div>
        )}

        {/* Step 4: Content Rating */}
        {step === 4 && (
          <div className="space-y-4">
            <div>
              <h2 className="text-xl font-semibold mb-1">Content rating <span className="text-destructive">*</span></h2>
              <p className="text-sm text-muted-foreground">Be honest — this routes your story to the right audience and protects you as an author.</p>
            </div>
            <ContentRatingSelector
              value={contentRating}
              onChange={v => setContentRating(v)}
              minimumRequired={minimumRating === 'everyone' ? null : minimumRating}
            />
          </div>
        )}

        {/* Step 5: Content Warnings */}
        {step === 5 && (
          <div className="space-y-4">
            <div>
              <h2 className="text-xl font-semibold mb-1">Content warnings</h2>
              <p className="text-sm text-muted-foreground">
                Optional but strongly encouraged. Readers can filter out content they want to avoid.
              </p>
            </div>
            <ContentWarningsSelector value={contentWarnings} onChange={v => {
              setContentWarnings(v)
              // Auto-bump rating if warnings require it
              const minRating = getMinimumRatingForWarnings(v)
              const ratingOrder = ['everyone', 'teen', 'mature', 'adult_18']
              if (contentRating && ratingOrder.indexOf(minRating) > ratingOrder.indexOf(contentRating)) {
                setContentRating(minRating as ContentRatingValue)
              }
            }} />
          </div>
        )}

        {/* Step 6: Format */}
        {step === 6 && (
          <div className="space-y-4">
            <div>
              <h2 className="text-xl font-semibold mb-1">How is this published? <span className="text-destructive">*</span></h2>
              <p className="text-sm text-muted-foreground">Format affects how your story is displayed and how readers experience it.</p>
            </div>
            <FormatSelector value={format} onChange={setFormat} />
          </div>
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between pt-4 border-t">
          {step > 1 ? (
            <Button type="button" variant="outline" onClick={back}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
          ) : (
            <Button type="button" variant="outline" onClick={() => router.back()}>
              Cancel
            </Button>
          )}

          {step < STEPS.length ? (
            <Button
              type="button"
              onClick={next}
              disabled={!canProceed()}
            >
              {step === 2 && selectedGenreData ? (
                <>Next: Tags <ArrowRight className="ml-2 h-4 w-4" /></>
              ) : (
                <>Next <ArrowRight className="ml-2 h-4 w-4" /></>
              )}
            </Button>
          ) : (
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting || !canProceed()}
            >
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Story
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
