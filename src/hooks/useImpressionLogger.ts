'use client';

import { useEffect, useRef } from 'react';

// Module-level state — shared across all card instances for the lifetime of the page
const sessionBuffer = new Set<string>(); // `${storyId}:${surface}` keys seen this session
const queue: Array<{ story_id: string; surface: string; session_id: string }> = [];
let initialized = false;

function getSessionId(): string {
  if (typeof window === 'undefined') return '';
  try {
    const key = '__fry_sid';
    let id = sessionStorage.getItem(key);
    if (!id) {
      id = Math.random().toString(36).substring(2, 10);
      sessionStorage.setItem(key, id);
    }
    return id;
  } catch {
    return '';
  }
}

function flush(): void {
  if (queue.length === 0) return;
  const batch = queue.splice(0, Math.min(50, queue.length));
  fetch('/api/impressions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ events: batch }),
    keepalive: true,
  }).catch(() => {}); // fire-and-forget — failures silently ignored
}

function init(): void {
  if (initialized || typeof window === 'undefined') return;
  initialized = true;
  setInterval(flush, 10_000);
  window.addEventListener('pagehide', flush, { passive: true });
  document.addEventListener(
    'visibilitychange',
    () => { if (document.visibilityState === 'hidden') flush(); },
    { passive: true },
  );
}

/**
 * Tracks when a story card is ≥50% visible for ≥1 second.
 * Each story+surface combination is only counted once per browser session.
 * Batches events and flushes to /api/impressions every 10s or on page hide.
 *
 * @param storyId - The story UUID
 * @param surface - Discovery surface name (e.g. 'homepage', 'browse', 'genre')
 * @returns A ref to attach to the card's root element
 */
export function useImpressionLogger(
  storyId: string,
  surface: string,
): React.RefObject<HTMLElement> {
  const ref = useRef<HTMLElement>(null);
  const loggedRef = useRef(false);

  useEffect(() => {
    init();
    if (loggedRef.current || !storyId || !surface) return;

    const el = ref.current;
    if (!el) return;

    let timer: ReturnType<typeof setTimeout>;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
          timer = setTimeout(() => {
            const key = `${storyId}:${surface}`;
            if (!sessionBuffer.has(key)) {
              sessionBuffer.add(key);
              queue.push({ story_id: storyId, surface, session_id: getSessionId() });
              loggedRef.current = true;
            }
          }, 1000);
        } else {
          clearTimeout(timer);
        }
      },
      { threshold: 0.5 },
    );

    observer.observe(el);

    return () => {
      observer.disconnect();
      clearTimeout(timer);
    };
  }, [storyId, surface]);

  return ref;
}
