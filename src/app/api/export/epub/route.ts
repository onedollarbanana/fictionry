import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

// Simple in-memory rate limit for epub export
const rateLimitMap = new Map<string, { count: number; resetAt: number }>()

function checkRateLimit(ip: string): boolean {
  const now = Date.now()
  const windowMs = 60 * 1000 // 1 minute
  const maxRequests = 5

  const entry = rateLimitMap.get(ip)
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + windowMs })
    return true
  }
  if (entry.count >= maxRequests) {
    return false
  }
  entry.count++
  return true
}

export async function GET(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  if (!checkRateLimit(ip)) {
    return NextResponse.json(
      { error: 'Too many export requests. Please try again in a minute.' },
      { status: 429, headers: { 'Retry-After': '60' } }
    )
  }

  const storyId = request.nextUrl.searchParams.get('storyId')
  if (!storyId) {
    return NextResponse.json({ error: 'storyId is required' }, { status: 400 })
  }

  const includeNotes = request.nextUrl.searchParams.get('includeNotes') === '1'

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }

  // Fetch story — must be owned by user
  const { data: story, error: storyError } = await supabase
    .from('stories')
    .select('id, title, blurb, cover_url, author_id')
    .eq('id', storyId)
    .single()

  if (storyError || !story) {
    return NextResponse.json({ error: 'Story not found' }, { status: 404 })
  }

  if (story.author_id !== user.id) {
    return NextResponse.json({ error: 'You can only export your own stories' }, { status: 403 })
  }

  // Fetch author display name
  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name, username')
    .eq('id', user.id)
    .single()

  const authorName = profile?.display_name || profile?.username || 'Unknown Author'

  // Fetch all published chapters in order
  const { data: chapters, error: chaptersError } = await supabase
    .from('chapters')
    .select('title, chapter_number, content_html, author_note_before, author_note_after')
    .eq('story_id', storyId)
    .eq('is_published', true)
    .order('chapter_number', { ascending: true })

  if (chaptersError) {
    return NextResponse.json({ error: 'Failed to fetch chapters' }, { status: 500 })
  }

  if (!chapters || chapters.length === 0) {
    return NextResponse.json({ error: 'No published chapters to export' }, { status: 400 })
  }

  // Build EPUB content using a simple EPUB structure
  // We'll generate the EPUB manually without external dependencies
  try {
    const epub = await generateEpub({
      title: story.title,
      author: authorName,
      description: story.blurb || '',
      coverUrl: story.cover_url,
      chapters: chapters.map((ch) => ({
        title: ch.title,
        chapterNumber: ch.chapter_number,
        html: buildChapterHtml(ch.title, ch.content_html, ch.author_note_before, ch.author_note_after, includeNotes),
      })),
    })

    const filename = story.title
      .replace(/[^a-zA-Z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .toLowerCase()

    return new NextResponse(new Uint8Array(epub), {
      status: 200,
      headers: {
        'Content-Type': 'application/epub+zip',
        'Content-Disposition': `attachment; filename="${filename}.epub"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (err) {
    console.error('EPUB generation error:', err)
    return NextResponse.json({ error: 'Failed to generate EPUB' }, { status: 500 })
  }
}

function buildChapterHtml(
  title: string,
  contentHtml: string | null,
  noteBefore: string | null,
  noteAfter: string | null,
  includeNotes: boolean
): string {
  let html = ''
  
  if (includeNotes && noteBefore) {
    html += `<div style="background:#f5f5f5;padding:12px;margin-bottom:16px;border-radius:4px;font-style:italic;"><p><strong>Author&apos;s Note:</strong></p>${noteBefore}</div>`
  }
  
  html += contentHtml || '<p>No content</p>'
  
  if (includeNotes && noteAfter) {
    html += `<div style="background:#f5f5f5;padding:12px;margin-top:16px;border-radius:4px;font-style:italic;"><p><strong>Author&apos;s Note:</strong></p>${noteAfter}</div>`
  }
  
  return html
}

// ============================================================
// Minimal EPUB 3.0 Generator (no external dependencies)
// ============================================================

interface EpubInput {
  title: string
  author: string
  description: string
  coverUrl: string | null
  chapters: { title: string; chapterNumber: number; html: string }[]
}

async function generateEpub(input: EpubInput): Promise<Buffer> {
  // We need to create a ZIP file with EPUB structure
  // EPUB is just a ZIP with specific structure

  const JSZip = (await import('jszip')).default
  const zip = new JSZip()

  const bookId = `fictionry-${Date.now()}`
  const now = new Date().toISOString()

  // 1. mimetype (must be first, uncompressed)
  zip.file('mimetype', 'application/epub+zip', { compression: 'STORE' })

  // 2. META-INF/container.xml
  zip.file('META-INF/container.xml', `<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`)

  // 3. Stylesheet
  const css = `
body { font-family: Georgia, serif; line-height: 1.6; margin: 1em; }
h1 { font-size: 1.5em; margin-bottom: 0.5em; }
h2 { font-size: 1.3em; margin-bottom: 0.3em; }
p { margin-bottom: 0.8em; text-indent: 1.5em; }
p:first-child, h1 + p, h2 + p { text-indent: 0; }
.author-note { background: #f5f5f5; padding: 12px; margin: 16px 0; border-radius: 4px; font-style: italic; }
`
  zip.file('OEBPS/style.css', css)

  // 4. Cover image (if available)
  let coverMediaType = ''
  let hasCover = false
  if (input.coverUrl) {
    try {
      const coverResponse = await fetch(input.coverUrl)
      if (coverResponse.ok) {
        const coverBuffer = Buffer.from(await coverResponse.arrayBuffer())
        const contentType = coverResponse.headers.get('content-type') || 'image/jpeg'
        const ext = contentType.includes('png') ? 'png' : contentType.includes('webp') ? 'webp' : 'jpg'
        coverMediaType = contentType.includes('png') ? 'image/png' : contentType.includes('webp') ? 'image/webp' : 'image/jpeg'
        zip.file(`OEBPS/cover.${ext}`, coverBuffer)
        hasCover = true

        // Cover XHTML page
        zip.file('OEBPS/cover.xhtml', `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml">
<head><title>Cover</title></head>
<body style="text-align:center;margin:0;padding:0;">
  <img src="cover.${ext}" alt="Cover" style="max-width:100%;max-height:100vh;"/>
</body>
</html>`)
      }
    } catch {
      // Skip cover if fetch fails
    }
  }

  // 5. Title page
  zip.file('OEBPS/title.xhtml', `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml">
<head><title>${escapeXml(input.title)}</title><link rel="stylesheet" type="text/css" href="style.css"/></head>
<body>
  <div style="text-align:center;margin-top:30%;">
    <h1>${escapeXml(input.title)}</h1>
    <p style="font-size:1.2em;text-indent:0;">by ${escapeXml(input.author)}</p>
    ${input.description ? `<p style="margin-top:2em;font-style:italic;text-indent:0;">${escapeXml(input.description)}</p>` : ''}
    <p style="margin-top:3em;font-size:0.8em;text-indent:0;">Generated by Fictionry</p>
  </div>
</body>
</html>`)

  // 6. Chapter XHTML files
  for (const chapter of input.chapters) {
    const filename = `chapter-${chapter.chapterNumber.toString().padStart(3, '0')}.xhtml`
    zip.file(`OEBPS/${filename}`, `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml">
<head><title>${escapeXml(chapter.title)}</title><link rel="stylesheet" type="text/css" href="style.css"/></head>
<body>
  <h1>${escapeXml(chapter.title)}</h1>
  ${chapter.html}
</body>
</html>`)
  }

  // 7. content.opf (package document)
  const coverExt = coverMediaType.includes('png') ? 'png' : coverMediaType.includes('webp') ? 'webp' : 'jpg'
  
  let manifestItems = `
    <item id="style" href="style.css" media-type="text/css"/>
    <item id="title" href="title.xhtml" media-type="application/xhtml+xml"/>
    <item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>`

  let spineItems = `<itemref idref="title"/>`

  if (hasCover) {
    manifestItems += `
    <item id="cover-image" href="cover.${coverExt}" media-type="${coverMediaType}" properties="cover-image"/>
    <item id="cover" href="cover.xhtml" media-type="application/xhtml+xml"/>`
    spineItems = `<itemref idref="cover"/>${spineItems}`
  }

  for (const chapter of input.chapters) {
    const num = chapter.chapterNumber.toString().padStart(3, '0')
    manifestItems += `
    <item id="ch-${num}" href="chapter-${num}.xhtml" media-type="application/xhtml+xml"/>`
    spineItems += `<itemref idref="ch-${num}"/>`
  }

  zip.file('OEBPS/content.opf', `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="bookid">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:identifier id="bookid">${bookId}</dc:identifier>
    <dc:title>${escapeXml(input.title)}</dc:title>
    <dc:creator>${escapeXml(input.author)}</dc:creator>
    <dc:language>en</dc:language>
    <dc:description>${escapeXml(input.description)}</dc:description>
    <dc:publisher>Fictionry</dc:publisher>
    <meta property="dcterms:modified">${now.replace(/\.\d+Z$/, 'Z')}</meta>
  </metadata>
  <manifest>${manifestItems}
  </manifest>
  <spine>${spineItems}
  </spine>
</package>`)

  // 8. Navigation document (EPUB 3 nav)
  let navItems = ''
  if (hasCover) {
    navItems += `<li><a href="cover.xhtml">Cover</a></li>\n`
  }
  navItems += `<li><a href="title.xhtml">Title Page</a></li>\n`
  for (const chapter of input.chapters) {
    const num = chapter.chapterNumber.toString().padStart(3, '0')
    navItems += `      <li><a href="chapter-${num}.xhtml">${escapeXml(chapter.title)}</a></li>\n`
  }

  zip.file('OEBPS/nav.xhtml', `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops">
<head><title>Table of Contents</title></head>
<body>
  <nav epub:type="toc">
    <h1>Table of Contents</h1>
    <ol>
      ${navItems}
    </ol>
  </nav>
</body>
</html>`)

  // Generate ZIP buffer
  const buffer = await zip.generateAsync({
    type: 'nodebuffer',
    mimeType: 'application/epub+zip',
    compression: 'DEFLATE',
    compressionOptions: { level: 9 },
  })

  return buffer
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}
