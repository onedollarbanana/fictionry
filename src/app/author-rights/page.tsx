import type { Metadata } from 'next'
import Link from 'next/link'
import { ShieldCheck } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Author Rights | Fictionry',
  description:
    'Plain-English: you own everything you write on Fictionry. No hidden licences, no exclusivity, no gotchas.',
}

export default function AuthorRightsPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      {/* Hero */}
      <div className="flex flex-col items-center text-center mb-12">
        <div className="rounded-full bg-violet-100 dark:bg-violet-900/30 p-4 mb-6">
          <ShieldCheck className="h-10 w-10 text-violet-600" />
        </div>
        <h1 className="text-4xl font-bold tracking-tight mb-4">Your words. Your rights.</h1>
        <p className="text-lg text-muted-foreground max-w-xl">
          A plain-English explanation of what you own when you publish on Fictionry. No legal
          jargon, no surprises.
        </p>
      </div>

      <div className="space-y-10">
        {/* Section 1 */}
        <section className="space-y-3">
          <h2 className="text-2xl font-semibold">You own your work. Full stop.</h2>
          <p className="text-muted-foreground leading-relaxed">
            You write it, you own it. The moment you type a word and hit publish, that story belongs
            to you — not to us. Fictionry never claims copyright over anything you create. There&apos;s
            no fine print hiding a rights grab, no clause that transfers ownership to us, and no
            gotchas buried in legalese. Your stories are yours, exactly as they were before you ever
            heard of Fictionry.
          </p>
        </section>

        {/* Section 2 */}
        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">What that means in practice</h2>
          <ul className="space-y-3">
            {[
              'You keep 100% of your copyright — always.',
              "We can't sell, license, or sublicense your work to anyone.",
              "We can't claim your stories as ours — not in marketing, not legally, not ever.",
              "You can publish your work anywhere else at the same time. We're non-exclusive.",
              'You can delete your stories whenever you want. They\'re gone — we don\'t keep copies.',
            ].map((item) => (
              <li key={item} className="flex items-start gap-3">
                <span className="mt-1 flex-shrink-0 h-5 w-5 rounded-full bg-violet-100 dark:bg-violet-900/40 flex items-center justify-center">
                  <span className="h-2 w-2 rounded-full bg-violet-600" />
                </span>
                <span className="text-muted-foreground leading-relaxed">{item}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* Section 3 */}
        <section className="space-y-3">
          <h2 className="text-2xl font-semibold">What Fictionry can do</h2>
          <p className="text-muted-foreground leading-relaxed">
            To actually run the platform, we need a narrow, limited licence to display your work.
            Concretely: we show your chapters to readers, generate short preview snippets for
            discovery, and create share images (like Open Graph previews) when someone links to your
            story. That&apos;s it. We only do what&apos;s needed to operate the site, and that licence ends
            the moment you delete your content.
          </p>
        </section>

        {/* Section 4 */}
        <section className="space-y-3">
          <h2 className="text-2xl font-semibold">Taking your work with you</h2>
          <p className="text-muted-foreground leading-relaxed">
            If you decide to leave Fictionry — for any reason, at any time — your words go with
            you. We have no claim on them. Delete your stories from your dashboard and they&apos;re gone.
            If Fictionry ever shut down, your copyright would be completely unaffected. We hold
            nothing over your work.
          </p>
        </section>

        {/* Section 5 */}
        <section className="space-y-3">
          <h2 className="text-2xl font-semibold">Your earnings are yours too</h2>
          <p className="text-muted-foreground leading-relaxed">
            When readers choose to support you directly, that money is yours. Fictionry takes a
            small platform fee (you can always see the exact percentage in your author dashboard) —
            the rest goes straight to you via Stripe. We take a platform fee for running the
            infrastructure, not a cut of your creative rights.
          </p>
        </section>

        {/* Divider */}
        <hr className="border-zinc-200 dark:border-zinc-800" />

        {/* Section 6 — Legal version */}
        <section className="space-y-3">
          <h2 className="text-xl font-semibold">The legal version</h2>
          <p className="text-muted-foreground leading-relaxed">
            If you want the formal language, the relevant section is{' '}
            <Link href="/terms" className="text-violet-600 hover:text-violet-700 underline underline-offset-2">
              Section 4 (User Content) of our Terms of Service
            </Link>
            . It says the same things — just in lawyer-speak.
          </p>
        </section>

        {/* CTA */}
        <section className="rounded-xl border bg-zinc-50 dark:bg-zinc-900 p-6 space-y-2">
          <p className="font-medium">Questions about your rights as an author?</p>
          <p className="text-sm text-muted-foreground">
            Email us at{' '}
            <a
              href="mailto:legal@fictionry.io"
              className="text-violet-600 hover:text-violet-700 underline underline-offset-2"
            >
              legal@fictionry.io
            </a>{' '}
            and we&apos;ll give you a straight answer.
          </p>
        </section>
      </div>
    </div>
  )
}
