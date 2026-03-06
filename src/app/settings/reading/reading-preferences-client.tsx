'use client';

import { useState } from 'react';
import { X, Plus, Tag, UserX } from 'lucide-react';

interface BlockedAuthor {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
}

interface Props {
  initialMutedTags: string[];
  initialBlockedAuthors: BlockedAuthor[];
}

async function callReaderControls(body: object) {
  const res = await fetch('/api/reader-controls', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await res.text());
}

export function ReadingPreferencesClient({ initialMutedTags, initialBlockedAuthors }: Props) {
  const [mutedTags, setMutedTags] = useState<string[]>(initialMutedTags);
  const [blockedAuthors, setBlockedAuthors] = useState<BlockedAuthor[]>(initialBlockedAuthors);
  const [tagInput, setTagInput] = useState('');
  const [tagError, setTagError] = useState('');
  const [tagLoading, setTagLoading] = useState(false);

  async function addTag() {
    const tag = tagInput.trim().toLowerCase();
    if (!tag) return;
    if (mutedTags.includes(tag)) { setTagError('Already muted'); return; }
    setTagError('');
    setTagLoading(true);
    try {
      await callReaderControls({ action: 'mute_tag', tag });
      setMutedTags((prev) => [tag, ...prev]);
      setTagInput('');
    } catch {
      setTagError('Failed to mute tag');
    } finally {
      setTagLoading(false);
    }
  }

  async function removeTag(tag: string) {
    try {
      await callReaderControls({ action: 'unmute_tag', tag });
      setMutedTags((prev) => prev.filter((t) => t !== tag));
    } catch {
      // silent
    }
  }

  async function unblockAuthor(authorId: string) {
    try {
      await callReaderControls({ action: 'unblock_author', author_id: authorId });
      setBlockedAuthors((prev) => prev.filter((a) => a.id !== authorId));
    } catch {
      // silent
    }
  }

  return (
    <div className="space-y-10">
      <div>
        <h2 className="text-xl font-semibold mb-1">Reading Preferences</h2>
        <p className="text-sm text-muted-foreground">
          Control what appears in your personalised feed and discovery surfaces.
        </p>
      </div>

      {/* Muted Tags */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <Tag className="h-4 w-4 text-muted-foreground" />
          <h3 className="font-medium">Muted Tags</h3>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          Stories tagged with these will be hidden from your For You feed.
        </p>

        {/* Add tag */}
        <div className="flex gap-2 mb-4">
          <input
            type="text"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addTag()}
            placeholder="e.g. harem, grimdark, slow-burn…"
            className="flex-1 rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <button
            onClick={addTag}
            disabled={tagLoading || !tagInput.trim()}
            className="flex items-center gap-1 px-3 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50 hover:opacity-90 transition-opacity"
          >
            <Plus className="h-4 w-4" />
            Mute
          </button>
        </div>
        {tagError && <p className="text-sm text-destructive mb-3">{tagError}</p>}

        {mutedTags.length === 0 ? (
          <p className="text-sm text-muted-foreground">No muted tags yet.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {mutedTags.map((tag) => (
              <span
                key={tag}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted text-sm"
              >
                {tag}
                <button
                  onClick={() => removeTag(tag)}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                  title="Unmute"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </span>
            ))}
          </div>
        )}
      </section>

      {/* Blocked Authors */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <UserX className="h-4 w-4 text-muted-foreground" />
          <h3 className="font-medium">Blocked Authors</h3>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          Stories by blocked authors are hidden from your For You feed. You can still visit their profiles directly.
          To block an author, visit their profile page.
        </p>

        {blockedAuthors.length === 0 ? (
          <p className="text-sm text-muted-foreground">No blocked authors.</p>
        ) : (
          <ul className="space-y-2">
            {blockedAuthors.map((author) => (
              <li key={author.id} className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <p className="font-medium text-sm">{author.display_name || author.username}</p>
                  <p className="text-xs text-muted-foreground">@{author.username}</p>
                </div>
                <button
                  onClick={() => unblockAuthor(author.id)}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Unblock
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
