"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { checkRateLimit } from "@/lib/rate-limit";
import { showToast } from "@/components/ui/toast";

const MAX_CHARS = 2000;

interface CommentInputProps {
  chapterId: string;
  currentUserId: string | null;
  onCommentPosted: () => void;
  commenters?: { username: string }[];
}

export function CommentInput({ 
  chapterId, 
  currentUserId, 
  onCommentPosted,
  commenters = []
}: CommentInputProps) {
  const [content, setContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // @mention state
  const [showMentions, setShowMentions] = useState(false);
  const [mentionSearch, setMentionSearch] = useState("");
  const [mentionIndex, setMentionIndex] = useState(0);
  const [cursorPosition, setCursorPosition] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Filter commenters based on search
  const filteredCommenters = commenters.filter(c => 
    c.username.toLowerCase().includes(mentionSearch.toLowerCase())
  ).slice(0, 5);

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    const pos = e.target.selectionStart || 0;
    setContent(value);
    setCursorPosition(pos);

    // Check if we're typing an @mention
    const textBeforeCursor = value.slice(0, pos);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');
    
    if (lastAtIndex !== -1) {
      const textAfterAt = textBeforeCursor.slice(lastAtIndex + 1);
      // Only show dropdown if no space after @ (still typing username)
      if (!textAfterAt.includes(' ') && textAfterAt.length < 20) {
        setMentionSearch(textAfterAt);
        setShowMentions(true);
        setMentionIndex(0);
        return;
      }
    }
    
    setShowMentions(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (!showMentions || filteredCommenters.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setMentionIndex(prev => Math.min(prev + 1, filteredCommenters.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setMentionIndex(prev => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault();
      insertMention(filteredCommenters[mentionIndex].username);
    } else if (e.key === 'Escape') {
      setShowMentions(false);
    }
  };

  const insertMention = (username: string) => {
    const textBeforeCursor = content.slice(0, cursorPosition);
    const textAfterCursor = content.slice(cursorPosition);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');
    
    const newText = 
      textBeforeCursor.slice(0, lastAtIndex) + 
      `@${username} ` + 
      textAfterCursor;
    
    setContent(newText);
    setShowMentions(false);
    
    // Focus back on textarea
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        const newPos = lastAtIndex + username.length + 2;
        textareaRef.current.setSelectionRange(newPos, newPos);
      }
    }, 0);
  };

  const handleSubmit = async () => {
    if (!currentUserId || !content.trim()) return;
    
    setIsSubmitting(true);
    const supabase = createClient();

    const rateCheck = await checkRateLimit(supabase, currentUserId, 'comment');
    if (!rateCheck.allowed) {
      showToast(rateCheck.message || 'Rate limited', 'error');
      setIsSubmitting(false);
      return;
    }
    
    const { error } = await supabase.from("comments").insert({
      chapter_id: chapterId,
      user_id: currentUserId,
      content: content.trim(),
    });

    if (!error) {
      setContent("");
      onCommentPosted();
    }
    
    setIsSubmitting(false);
  };

  if (!currentUserId) {
    return (
      <div className="p-4 bg-muted/50 rounded-lg text-center text-sm text-muted-foreground">
        <a href="/login" className="text-primary hover:underline">Sign in</a> to leave a comment
      </div>
    );
  }

  return (
    <div className="relative">
      <textarea
        ref={textareaRef}
        value={content}
        onChange={handleInput}
        onKeyDown={handleKeyDown}
        placeholder="Write a comment... Use @username to mention someone, [spoiler]text[/spoiler] for spoilers"
        className="w-full p-3 border border-border rounded-lg resize-none bg-background text-foreground"
        rows={3}
        maxLength={MAX_CHARS}
      />
      
      {/* @mention dropdown */}
      {showMentions && filteredCommenters.length > 0 && (
        <div className="absolute left-0 right-0 mt-1 bg-white dark:bg-zinc-900 border rounded-md shadow-lg z-50 max-h-48 overflow-y-auto">
          {filteredCommenters.map((commenter, index) => (
            <button
              key={commenter.username}
              onClick={() => insertMention(commenter.username)}
              className={`w-full px-3 py-2 text-left text-sm hover:bg-muted flex items-center gap-2 ${
                index === mentionIndex ? 'bg-muted' : ''
              }`}
            >
              <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-medium">
                {commenter.username[0]?.toUpperCase()}
              </div>
              <span>@{commenter.username}</span>
            </button>
          ))}
        </div>
      )}
      
      <div className="flex justify-between items-center mt-2">
        <span className="text-xs text-muted-foreground">
          Tip: Use [spoiler]text[/spoiler] to hide spoilers
        </span>
        <div className="flex items-center gap-3">
          <span className={`text-xs ${content.length > MAX_CHARS * 0.9 ? 'text-amber-500' : 'text-muted-foreground'}`}>
            {content.length}/{MAX_CHARS}
          </span>
          <Button onClick={handleSubmit} disabled={isSubmitting || !content.trim() || content.length > MAX_CHARS}>
            {isSubmitting ? "Posting..." : "Post Comment"}
          </Button>
        </div>
      </div>
    </div>
  );
}
