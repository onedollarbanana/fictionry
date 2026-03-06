"use client";

import { useState } from "react";
import { Megaphone, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";

interface CreateAnnouncementFormProps {
  storyId: string;
  storyTitle: string;
}

export function CreateAnnouncementForm({ storyId, storyTitle }: CreateAnnouncementFormProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { showToast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;

    setIsSubmitting(true);

    const res = await fetch("/api/announcements", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        story_id: storyId,
        title: title.trim(),
        content: content.trim(),
        scope: "story",
      }),
    });

    if (!res.ok) {
      showToast("Failed to post announcement", "error");
    } else {
      showToast("Announcement posted!", "success");
      setTitle("");
      setContent("");
      setIsOpen(false);
    }

    setIsSubmitting(false);
  };

  if (!isOpen) {
    return (
      <Button
        variant="outline"
        className="gap-2"
        onClick={() => setIsOpen(true)}
      >
        <Megaphone className="h-4 w-4" />
        Post Announcement
      </Button>
    );
  }

  return (
    <Card className="p-4 border-amber-200 dark:border-amber-800">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold flex items-center gap-2">
            <Megaphone className="h-4 w-4 text-amber-600" />
            New Announcement
          </h3>
          <span className="text-sm text-muted-foreground">
            for "{storyTitle}"
          </span>
        </div>

        <div className="space-y-2">
          <Label htmlFor="announcement-title">Title</Label>
          <Input
            id="announcement-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g., Hiatus Update, Schedule Change"
            maxLength={100}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="announcement-content">Message</Label>
          <textarea
            id="announcement-content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Let your readers know what's happening..."
            className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            maxLength={2000}
          />
          <p className="text-xs text-muted-foreground text-right">
            {content.length}/2000
          </p>
        </div>

        <div className="flex gap-2 justify-end">
          <Button
            type="button"
            variant="ghost"
            onClick={() => setIsOpen(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting || !title.trim() || !content.trim()}
            className="gap-2"
          >
            {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
            Post Announcement
          </Button>
        </div>
      </form>
    </Card>
  );
}
