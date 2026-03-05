"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function CreateProfilePage() {
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(
    null
  );
  const router = useRouter();
  const supabase = createClient();

  // Debounced username availability check
  useEffect(() => {
    if (username.length < 3) {
      setUsernameAvailable(null);
      return;
    }

    const timer = setTimeout(async () => {
      setCheckingUsername(true);
      const { data } = await supabase
        .from("profiles")
        .select("username")
        .eq("username", username.toLowerCase())
        .single();

      setUsernameAvailable(!data);
      setCheckingUsername(false);
    }, 500);

    return () => clearTimeout(timer);
  }, [username, supabase]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setError("You must be logged in to create a profile");
      setLoading(false);
      return;
    }

    const { error } = await supabase
      .from("profiles")
      .update({
        username: username.toLowerCase(),
        display_name: displayName || username,
      })
      .eq("id", user.id);

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    // Redirect to onboarding genres instead of dashboard
    router.push("/onboarding/genres");
    router.refresh();
  };

  const isValidUsername = /^[a-z0-9_]{3,20}$/.test(username.toLowerCase());

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-md p-8 space-y-6 bg-card rounded-lg border">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Create your profile</h1>
          <p className="text-muted-foreground">Choose a username to get started</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 text-sm text-red-500 bg-red-50 dark:bg-red-950 rounded">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="username">Username *</Label>
            <Input
              id="username"
              type="text"
              placeholder="your_username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              minLength={3}
              maxLength={20}
            />
            <div className="text-xs">
              {checkingUsername && (
                <span className="text-muted-foreground">Checking...</span>
              )}
              {!checkingUsername && usernameAvailable === true && (
                <span className="text-green-600">✓ Username available</span>
              )}
              {!checkingUsername && usernameAvailable === false && (
                <span className="text-red-500">✗ Username taken</span>
              )}
              {!checkingUsername && usernameAvailable === null && username.length > 0 && (
                <span className="text-muted-foreground">
                  {isValidUsername
                    ? "✓ 3-20 characters, lowercase letters, numbers, underscores only"
                    : "3-20 characters, lowercase letters, numbers, underscores only"}
                </span>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="displayName">Display Name (optional)</Label>
            <Input
              id="displayName"
              type="text"
              placeholder="Your Display Name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              maxLength={50}
            />
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={loading || !isValidUsername || usernameAvailable === false}
          >
            {loading ? "Creating..." : "Create Profile"}
          </Button>
        </form>
      </div>
    </div>
  );
}
