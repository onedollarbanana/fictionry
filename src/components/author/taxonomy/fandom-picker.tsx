'use client'

import { useState } from 'react'
import { X, Plus } from 'lucide-react'
import { Input } from '@/components/ui/input'

// Seed list of common fandoms — extends via free-text entry
const COMMON_FANDOMS = [
  'Harry Potter', 'The Lord of the Rings', 'Marvel Cinematic Universe', 'DC Comics',
  'Star Wars', 'Star Trek', 'Doctor Who', 'Sherlock Holmes',
  'Game of Thrones / ASOIAF', 'The Witcher', 'Naruto', 'One Piece',
  'Attack on Titan', 'My Hero Academia', 'Demon Slayer', 'Dragon Ball',
  'Fullmetal Alchemist', 'Death Note', 'Bleach', 'Sword Art Online',
  'Undertale', 'Homestuck', 'Critical Role', 'Dimension 20',
  'Taylor Swift', 'BTS', 'Stray Kids', 'BLACKPINK',
  'Supernatural', 'Hannibal', 'Good Omens', 'The Magnus Archives',
  'Stranger Things', 'The Umbrella Academy', 'Shadow and Bone',
  'Twilight', 'The Hunger Games', 'Percy Jackson', 'Divergent',
  'Avatar: The Last Airbender', 'She-Ra', 'Steven Universe', 'Gravity Falls',
  'Minecraft', 'The Elder Scrolls', 'Final Fantasy', 'Pokémon',
  'Genshin Impact', 'Hades', 'Baldur\'s Gate 3', 'Mass Effect',
]

const MAX_FANDOMS = 3

interface FandomPickerProps {
  value: string[]
  onChange: (fandoms: string[]) => void
}

export function FandomPicker({ value, onChange }: FandomPickerProps) {
  const [query, setQuery] = useState('')

  const filtered = query.trim().length > 0
    ? COMMON_FANDOMS.filter(f =>
        f.toLowerCase().includes(query.toLowerCase()) && !value.includes(f)
      ).slice(0, 8)
    : []

  const addFandom = (fandom: string) => {
    const trimmed = fandom.trim()
    if (!trimmed || value.includes(trimmed) || value.length >= MAX_FANDOMS) return
    onChange([...value, trimmed])
    setQuery('')
  }

  const removeFandom = (fandom: string) => {
    onChange(value.filter(f => f !== fandom))
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      if (filtered.length > 0) {
        addFandom(filtered[0])
      } else if (query.trim()) {
        addFandom(query)
      }
    }
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        Add up to {MAX_FANDOMS} source fandoms. Type to search or enter a custom fandom name.
      </p>

      {value.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {value.map(fandom => (
            <span
              key={fandom}
              className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-500/15 text-amber-700 dark:text-amber-300 rounded-full text-sm"
            >
              {fandom}
              <button
                type="button"
                onClick={() => removeFandom(fandom)}
                className="hover:text-amber-900 dark:hover:text-amber-100 transition-colors"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      {value.length < MAX_FANDOMS && (
        <div className="relative">
          <Input
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search fandoms or type a custom name..."
          />
          {filtered.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-md shadow-xl z-50 overflow-hidden">
              {filtered.map(fandom => (
                <button
                  key={fandom}
                  type="button"
                  onClick={() => addFandom(fandom)}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-muted transition-colors"
                >
                  <Plus className="h-3 w-3 text-muted-foreground" />
                  {fandom}
                </button>
              ))}
            </div>
          )}
          {query.trim() && !COMMON_FANDOMS.some(f => f.toLowerCase() === query.toLowerCase().trim()) && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-md shadow-xl z-50 overflow-hidden">
              <button
                type="button"
                onClick={() => addFandom(query)}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-muted transition-colors"
              >
                <Plus className="h-3 w-3 text-muted-foreground" />
                Add &quot;{query.trim()}&quot;
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
