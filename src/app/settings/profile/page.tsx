"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AvatarUpload } from "@/components/profile/avatar-upload";
import { useToast } from "@/components/ui/toast";
import { Loader2 } from "lucide-react";

const GENRES = [
  { name: "Action", emoji: "⚔️", description: "High-octane thrills and combat" },
  { name: "Adventure", emoji: "🗺️", description: "Epic journeys and exploration" },
  { name: "Contemporary", emoji: "🏙️", description: "Modern-day stories and drama" },
  { name: "Cyberpunk", emoji: "🤖", description: "Neon-lit dystopian futures" },
  { name: "Fantasy", emoji: "🧙", description: "Magic, myths, and otherworldly realms" },
  { name: "Historical", emoji: "📜", description: "Stories from ages past" },
  { name: "Horror", emoji: "👻", description: "Terrifying tales and dark mysteries" },
  { name: "LitRPG", emoji: "🎮", description: "Game mechanics meet storytelling" },
  { name: "Mystery", emoji: "🔍", description: "Puzzles, clues, and whodunits" },
  { name: "Romance", emoji: "💕", description: "Love stories and heartfelt connections" },
  { name: "Sci-Fi", emoji: "🚀", description: "Space, technology, and the future" },
  { name: "Thriller", emoji: "🎯", description: "Suspense and edge-of-your-seat tension" },
  { name: "Urban Fantasy", emoji: "🌃", description: "Magic hidden in the modern world" },
];

interface ProfileData {
  username: string;
  display_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  genre_preferences: string[];
}

export default function EditProfilePage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<ProfileData>({
    username: "",
    display_name: null,
    bio: null,
    avatar_url: null,
    genre_preferences: [],
  });
  const [originalUsername, setOriginalUsername] = useState("");

  useEffect(() => {
    async function loadProfile() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("username, display_name, bio, avatar_url, genre_preferences")
        .eq("id", user.id)
        .single();

      if (error) {
        showToast("Failed to load profile", "error");
        return;
      }

      if (data) {
        setProfile({
          ...data,
          genre_preferences: data.genre_preferences || [],
        });
        setOriginalUsername(data.username);
      }
      setLoading(false);
    }

    loadProfile();
  }, [router, showToast]);

  const toggleGenre = (genre: string) => {
    setProfile((prev) => ({
      ...prev,
      genre_preferences: prev.genre_preferences.includes(genre)
        ? prev.genre_preferences.filter((g) => g !== genre)
        : [...prev.genre_preferences, genre],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (profile.genre_preferences.length > 0 && profile.genre_preferences.length < 3) {
      showToast("Please select at least 3 genres (or clear all)", "error");
      return;
    }

    setSaving(true);

    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        showToast("You must be logged in", "error");
        return;
      }

      // Validate username
      if (!profile.username || profile.username.length < 3) {
        showToast("Username must be at least 3 characters", "error");
        return;
      }

      if (!/^[a-zA-Z0-9_-]+$/.test(profile.username)) {
        showToast("Username can only contain letters, numbers, underscores, and hyphens", "error");
        return;
      }

      // Check if username is taken (if changed)
      if (profile.username !== originalUsername) {
        const { data: existing } = await supabase
          .from("profiles")
          .select("id")
          .eq("username", profile.username)
          .neq("id", user.id)
          .single();

        if (existing) {
          showToast("Username is already taken", "error");
          return;
        }
      }

      const { error } = await supabase
        .from("profiles")
        .update({
          username: profile.username,
          display_name: profile.display_name || null,
          bio: profile.bio || null,
          avatar_url: profile.avatar_url,
          genre_preferences: profile.genre_preferences,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id);

      if (error) {
        throw error;
      }

      showToast("Profile updated!", "success");
      setOriginalUsername(profile.username);
      router.refresh();
    } catch (error) {
      console.error("Error updating profile:", error);
      showToast("Failed to update profile", "error");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="max-w-xl">
      <h2 className="text-xl font-semibold mb-6">Edit Profile</h2>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Avatar */}
        <div>
          <Label className="mb-2 block">Profile Picture</Label>
          <AvatarUpload
            currentAvatarUrl={profile.avatar_url}
            onUpload={(url) => setProfile({ ...profile, avatar_url: url })}
          />
        </div>

        {/* Username */}
        <div className="space-y-2">
          <Label htmlFor="username">Username *</Label>
          <Input
            id="username"
            value={profile.username}
            onChange={(e) => setProfile({ ...profile, username: e.target.value })}
            placeholder="your_username"
            required
            minLength={3}
            maxLength={30}
          />
          <p className="text-xs text-muted-foreground">
            3-30 characters. Letters, numbers, underscores, hyphens only.
          </p>
        </div>

        {/* Display Name */}
        <div className="space-y-2">
          <Label htmlFor="display_name">Display Name</Label>
          <Input
            id="display_name"
            value={profile.display_name || ""}
            onChange={(e) => setProfile({ ...profile, display_name: e.target.value || null })}
            placeholder="Your Name"
            maxLength={50}
          />
          <p className="text-xs text-muted-foreground">
            This is shown publicly instead of your username (optional).
          </p>
        </div>

        {/* Bio */}
        <div className="space-y-2">
          <Label htmlFor="bio">Bio</Label>
          <Textarea
            id="bio"
            value={profile.bio || ""}
            onChange={(e) => setProfile({ ...profile, bio: e.target.value || null })}
            placeholder="Tell readers about yourself..."
            rows={4}
            maxLength={500}
          />
          <p className="text-xs text-muted-foreground">
            {(profile.bio || "").length}/500 characters
          </p>
        </div>

        {/* Genre Preferences */}
        <div className="space-y-3 pt-2 border-t">
          <div>
            <Label className="text-base font-semibold">Reading Preferences</Label>
            <p className="text-xs text-muted-foreground mt-1">
              Select at least 3 genres to personalise your recommendations.{" "}
              {profile.genre_preferences.length > 0 && (
                <span className="font-medium text-foreground">
                  {profile.genre_preferences.length} selected
                </span>
              )}
            </p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {GENRES.map((genre) => {
              const isSelected = profile.genre_preferences.includes(genre.name);
              return (
                <button
                  key={genre.name}
                  type="button"
                  onClick={() => toggleGenre(genre.name)}
                  className={`relative flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all duration-200 hover:scale-[1.02] text-left ${
                    isSelected
                      ? "border-amber-500 bg-amber-500/10 shadow-sm shadow-amber-500/20"
                      : "border-border bg-card hover:border-amber-500/50"
                  }`}
                >
                  {isSelected && (
                    <div className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-amber-500 flex items-center justify-center">
                      <svg
                        className="w-2.5 h-2.5 text-white"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={3}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    </div>
                  )}
                  <span className="text-2xl">{genre.emoji}</span>
                  <span className="font-medium text-xs text-center">{genre.name}</span>
                </button>
              );
            })}
          </div>
          {profile.genre_preferences.length > 0 && profile.genre_preferences.length < 3 && (
            <p className="text-xs text-amber-500">
              Pick {3 - profile.genre_preferences.length} more genre{3 - profile.genre_preferences.length === 1 ? "" : "s"} to save preferences
            </p>
          )}
        </div>

        {/* Submit */}
        <div className="flex gap-3">
          <Button type="submit" disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Changes
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
          >
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
