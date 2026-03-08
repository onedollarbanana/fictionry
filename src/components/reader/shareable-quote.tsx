'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { Twitter, Copy, Share2, Check } from 'lucide-react';

interface ShareableQuoteProps {
  storyTitle: string;
  storyUrl: string;
}

export function ShareableQuote({ storyTitle, storyUrl }: ShareableQuoteProps) {
  const [selectedText, setSelectedText] = useState('');
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isVisible, setIsVisible] = useState(false);
  const [copied, setCopied] = useState(false);
  const popupRef = useRef<HTMLDivElement>(null);
  const [canShare, setCanShare] = useState(false);

  // Check for native share support on mount (client-side only)
  useEffect(() => {
    setCanShare(typeof navigator !== 'undefined' && 'share' in navigator);
  }, []);

  const handleSelection = useCallback(() => {
    const selection = window.getSelection();
    const text = selection?.toString().trim() || '';

    // Only show for reasonable quote lengths (10-280 chars like a tweet)
    if (text.length >= 10 && text.length <= 280) {
      const range = selection?.getRangeAt(0);
      if (range) {
        const rect = range.getBoundingClientRect();
        setSelectedText(text);
        setPosition({
          x: rect.left + rect.width / 2,
          y: rect.top - 10,
        });
        setIsVisible(true);
        setCopied(false);
      }
    } else {
      setIsVisible(false);
    }
  }, []);

  const handleClickOutside = useCallback((e: MouseEvent | TouchEvent) => {
    if (popupRef.current && !popupRef.current.contains(e.target as Node)) {
      setIsVisible(false);
    }
  }, []);

  useEffect(() => {
    document.addEventListener('mouseup', handleSelection);
    document.addEventListener('touchend', handleSelection);
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);

    return () => {
      document.removeEventListener('mouseup', handleSelection);
      document.removeEventListener('touchend', handleSelection);
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [handleSelection, handleClickOutside]);

  const getQuoteText = () => `"${selectedText}" — ${storyTitle}`;

  const shareToTwitter = () => {
    const text = encodeURIComponent(getQuoteText());
    const url = encodeURIComponent(storyUrl);
    window.open(
      `https://twitter.com/intent/tweet?text=${text}&url=${url}`,
      '_blank',
      'width=550,height=420'
    );
    setIsVisible(false);
  };

  const copyQuote = async () => {
    const fullQuote = `${getQuoteText()}\n\n${storyUrl}`;
    await navigator.clipboard.writeText(fullQuote);
    setCopied(true);
    setTimeout(() => setIsVisible(false), 1000);
  };

  const shareNative = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: storyTitle,
          text: getQuoteText(),
          url: storyUrl,
        });
      } catch (err) {
        // User cancelled or error
      }
    }
    setIsVisible(false);
  };

  if (!isVisible) return null;

  // Calculate position to keep popup on screen
  const popupWidth = 140;
  const adjustedX = Math.max(
    popupWidth / 2 + 10,
    Math.min(position.x, window.innerWidth - popupWidth / 2 - 10)
  );

  return (
    <div
      ref={popupRef}
      className="fixed z-50 flex items-center gap-1 px-2 py-1.5 bg-zinc-800 dark:bg-zinc-200 rounded-lg shadow-lg transform -translate-x-1/2 -translate-y-full"
      style={{
        left: adjustedX,
        top: position.y,
      }}
    >
      {/* Arrow */}
      <div 
        className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] border-t-zinc-800 dark:border-t-zinc-200"
      />

      <button
        onClick={shareToTwitter}
        className="p-2 rounded-md hover:bg-zinc-700 dark:hover:bg-zinc-300 transition-colors"
        aria-label="Share to Twitter"
      >
        <Twitter className="w-4 h-4 text-white dark:text-zinc-800" />
      </button>

      <button
        onClick={copyQuote}
        className="p-2 rounded-md hover:bg-zinc-700 dark:hover:bg-zinc-300 transition-colors"
        aria-label="Copy quote"
      >
        {copied ? (
          <Check className="w-4 h-4 text-green-400" />
        ) : (
          <Copy className="w-4 h-4 text-white dark:text-zinc-800" />
        )}
      </button>

      {canShare && (
        <button
          onClick={shareNative}
          className="p-2 rounded-md hover:bg-zinc-700 dark:hover:bg-zinc-300 transition-colors"
          aria-label="Share"
        >
          <Share2 className="w-4 h-4 text-white dark:text-zinc-800" />
        </button>
      )}
    </div>
  );
}
