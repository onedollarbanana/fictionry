"use client"

import { useState, FormEvent } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { AlertTriangle, CheckCircle2 } from "lucide-react"

function extractContentId(url: string, contentType: string): string | null {
  const uuidPattern = "[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}"
  // Slug-shortId pattern: one or more slug segments followed by a short identifier
  const slugPattern = "[a-z0-9-]+"

  if (contentType === "chapter") {
    // Try legacy UUID format first
    const chapterUuidMatch = url.match(new RegExp(`/chapter/(${uuidPattern})`))
    if (chapterUuidMatch) return chapterUuidMatch[1]
    // Try new slug-shortId format (extract the full slug param)
    const chapterSlugMatch = url.match(/\/chapter\/([a-z0-9][a-z0-9-]*[a-z0-9])/)
    if (chapterSlugMatch) return chapterSlugMatch[1]
  }

  if (contentType === "story") {
    // Try legacy UUID format first
    const storyUuidMatch = url.match(new RegExp(`/story/(${uuidPattern})`))
    if (storyUuidMatch) return storyUuidMatch[1]
    // Try new slug-shortId format
    const storySlugMatch = url.match(/\/story\/([a-z0-9][a-z0-9-]*[a-z0-9])/)
    if (storySlugMatch) return storySlugMatch[1]
  }

  // Fallback: try to find any UUID in the URL
  const anyMatch = url.match(new RegExp(`(${uuidPattern})`))
  if (anyMatch) return anyMatch[1]

  return null
}

export default function DMCAPage() {
  const [claimantName, setClaimantName] = useState("")
  const [claimantEmail, setClaimantEmail] = useState("")
  const [claimantAddress, setClaimantAddress] = useState("")
  const [contentType, setContentType] = useState("")
  const [contentUrl, setContentUrl] = useState("")
  const [originalWorkDescription, setOriginalWorkDescription] = useState("")
  const [originalWorkUrl, setOriginalWorkUrl] = useState("")
  const [statementOfOwnership, setStatementOfOwnership] = useState("")
  const [perjuryAcknowledged, setPerjuryAcknowledged] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isFormValid =
    claimantName.trim() !== "" &&
    claimantEmail.trim() !== "" &&
    contentType !== "" &&
    contentUrl.trim() !== "" &&
    originalWorkDescription.trim() !== "" &&
    statementOfOwnership.trim() !== "" &&
    perjuryAcknowledged

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)

    const contentId = extractContentId(contentUrl, contentType)
    if (!contentId) {
      setError(
        "Could not extract a valid content ID from the provided URL. Please ensure you paste a valid Fictionry story or chapter URL (e.g. /story/{id} or /story/{id}/chapter/{id})."
      )
      return
    }

    setSubmitting(true)

    try {
      const supabase = createClient()

      const { error: insertError } = await supabase
        .from("dmca_claims")
        .insert({
          claimant_name: claimantName.trim(),
          claimant_email: claimantEmail.trim(),
          claimant_address: claimantAddress.trim() || null,
          content_type: contentType,
          content_id: contentId,
          original_work_description: originalWorkDescription.trim(),
          original_work_url: originalWorkUrl.trim() || null,
          statement_of_ownership: statementOfOwnership.trim(),
        })

      if (insertError) {
        throw insertError
      }

      setSubmitted(true)
    } catch (err) {
      console.error("DMCA submission error:", err)
      setError("Failed to submit your DMCA claim. Please try again or contact support.")
    } finally {
      setSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <div className="max-w-2xl mx-auto py-8 px-4">
        <div className="rounded-lg border bg-green-50 dark:bg-green-950/30 p-8 text-center space-y-4">
          <CheckCircle2 className="h-12 w-12 text-green-600 mx-auto" />
          <h1 className="text-2xl font-bold">DMCA Claim Submitted</h1>
          <p className="text-muted-foreground">
            Your DMCA claim has been submitted. We will review it within 48 hours and
            contact you at <strong>{claimantEmail}</strong>.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      <div className="space-y-2 mb-8">
        <h1 className="text-3xl font-bold">DMCA Takedown Request</h1>
        <p className="text-muted-foreground">
          This form is for copyright holders to report content on Fictionry that
          infringes on their copyrighted work. Please provide accurate and complete
          information to help us process your request.
        </p>
        <div className="flex items-start gap-2 rounded-md bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 p-3 mt-4">
          <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          <p className="text-sm text-amber-800 dark:text-amber-200 font-medium">
            Filing a false DMCA takedown is a violation of federal law.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Claimant Name */}
        <div className="space-y-2">
          <Label htmlFor="claimant-name">
            Full Legal Name <span className="text-red-500">*</span>
          </Label>
          <Input
            id="claimant-name"
            placeholder="Your full legal name"
            value={claimantName}
            onChange={(e) => setClaimantName(e.target.value)}
            required
          />
        </div>

        {/* Claimant Email */}
        <div className="space-y-2">
          <Label htmlFor="claimant-email">
            Contact Email <span className="text-red-500">*</span>
          </Label>
          <Input
            id="claimant-email"
            type="email"
            placeholder="your@email.com"
            value={claimantEmail}
            onChange={(e) => setClaimantEmail(e.target.value)}
            required
          />
        </div>

        {/* Claimant Address */}
        <div className="space-y-2">
          <Label htmlFor="claimant-address">Mailing Address</Label>
          <Input
            id="claimant-address"
            placeholder="Optional mailing address"
            value={claimantAddress}
            onChange={(e) => setClaimantAddress(e.target.value)}
          />
        </div>

        {/* Content Type */}
        <div className="space-y-2">
          <Label htmlFor="content-type">
            Content Type <span className="text-red-500">*</span>
          </Label>
          <Select value={contentType} onValueChange={setContentType}>
            <SelectTrigger id="content-type">
              <SelectValue placeholder="Select content type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="story">Story</SelectItem>
              <SelectItem value="chapter">Chapter</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Content URL */}
        <div className="space-y-2">
          <Label htmlFor="content-url">
            Fictionry Content URL <span className="text-red-500">*</span>
          </Label>
          <Input
            id="content-url"
            placeholder="https://fictionry.com/story/..."
            value={contentUrl}
            onChange={(e) => setContentUrl(e.target.value)}
            required
          />
          <p className="text-xs text-muted-foreground">
            Paste the full URL of the allegedly infringing content on Fictionry.
          </p>
        </div>

        {/* Original Work Description */}
        <div className="space-y-2">
          <Label htmlFor="original-work-description">
            Original Work Description <span className="text-red-500">*</span>
          </Label>
          <Textarea
            id="original-work-description"
            placeholder="Describe your original copyrighted work..."
            value={originalWorkDescription}
            onChange={(e) => setOriginalWorkDescription(e.target.value)}
            rows={4}
            required
          />
        </div>

        {/* Original Work URL */}
        <div className="space-y-2">
          <Label htmlFor="original-work-url">Original Work URL</Label>
          <Input
            id="original-work-url"
            placeholder="https://example.com/your-original-work"
            value={originalWorkUrl}
            onChange={(e) => setOriginalWorkUrl(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Where your original work can be found online (optional).
          </p>
        </div>

        {/* Statement of Ownership */}
        <div className="space-y-2">
          <Label htmlFor="statement-of-ownership">
            Statement of Ownership <span className="text-red-500">*</span>
          </Label>
          <Textarea
            id="statement-of-ownership"
            placeholder="Describe your relationship to the copyrighted material..."
            value={statementOfOwnership}
            onChange={(e) => setStatementOfOwnership(e.target.value)}
            rows={3}
            required
          />
        </div>

        {/* Perjury Declaration */}
        <div className="rounded-md border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30 p-4">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={perjuryAcknowledged}
              onChange={(e) => setPerjuryAcknowledged(e.target.checked)}
              className="mt-1 h-4 w-4 rounded border-gray-300"
            />
            <span className="text-sm text-red-800 dark:text-red-200 font-medium">
              I declare under penalty of perjury that the information in this notification
              is accurate and that I am the copyright owner, or authorized to act on
              behalf of the owner.
            </span>
          </label>
        </div>

        {/* Error display */}
        {error && (
          <div className="rounded-md bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 p-3">
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        {/* Submit */}
        <Button type="submit" disabled={!isFormValid || submitting} className="w-full">
          {submitting ? "Submitting..." : "Submit DMCA Takedown Request"}
        </Button>
      </form>
    </div>
  )
}
