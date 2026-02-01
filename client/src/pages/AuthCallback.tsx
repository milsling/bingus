import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { getSupabase } from "@/lib/supabase";
import { Loader2, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import iconUrl from "@/assets/icon.png";

export default function AuthCallback() {
  const [, setLocation] = useLocation();
  const [error, setError] = useState<string | null>(null);
  const [needsUsername, setNeedsUsername] = useState(false);
  const [username, setUsername] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    async function handleCallback() {
      try {
        const supabase = await getSupabase();
        if (!supabase) {
          setError("Authentication service unavailable");
          return;
        }

        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) {
          setError(sessionError.message);
          return;
        }

        if (session) {
          const response = await fetch('/api/auth/supabase/oauth-callback', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({
              email: session.user.email,
              provider: session.user.app_metadata?.provider || 'oauth',
            }),
          });

          if (!response.ok) {
            const errorData = await response.json();
            setError(errorData.message || 'Failed to complete sign in');
            return;
          }

          const data = await response.json();
          if (data.needsUsername) {
            setNeedsUsername(true);
          } else {
            setLocation("/");
          }
        } else {
          setError("No session found");
        }
      } catch (err: any) {
        setError(err.message || "Something went wrong");
      }
    }

    handleCallback();
  }, [setLocation]);

  const handleSubmitUsername = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const supabase = await getSupabase();
      if (!supabase) {
        setError("Authentication service unavailable");
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError("Session expired. Please try again.");
        return;
      }

      const response = await fetch('/api/auth/supabase/complete-signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ username }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        setError(errorData.message || 'Failed to create account');
        return;
      }

      setLocation("/");
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center p-4 relative overflow-hidden">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-primary/8 rounded-full blur-[150px]" />
        <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-purple-500/8 rounded-full blur-[120px]" />
      </div>

      <div className="relative z-10 flex flex-col items-center gap-6">
        <div className="flex items-center gap-2">
          <img src={iconUrl} alt="Orphan Bars" className="h-12 w-12" />
          <span className="font-logo text-3xl text-white">ORPHAN BARS</span>
        </div>

        {needsUsername ? (
          <div className="w-full max-w-sm">
            <div className="glass-card p-6 rounded-2xl space-y-6">
              <div className="text-center space-y-2">
                <div className="mx-auto w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                  <User className="h-6 w-6 text-primary" />
                </div>
                <h2 className="text-xl font-semibold text-white">Choose Your Username</h2>
                <p className="text-sm text-white/60">Pick a name to represent you on Orphan Bars</p>
              </div>

              <form onSubmit={handleSubmitUsername} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="username" className="text-white/80">Username</Label>
                  <Input
                    id="username"
                    type="text"
                    placeholder="YourRapName"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="glass-input"
                    minLength={3}
                    maxLength={30}
                    pattern="[a-zA-Z0-9_]+"
                    required
                    data-testid="input-oauth-username"
                  />
                  <p className="text-xs text-white/50">Letters, numbers, and underscores only</p>
                </div>

                {error && (
                  <p className="text-red-400 text-sm text-center">{error}</p>
                )}

                <Button
                  type="submit"
                  className="w-full rounded-full"
                  disabled={isSubmitting || username.length < 3}
                  data-testid="button-complete-signup"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Creating Account...
                    </>
                  ) : (
                    "Create Account"
                  )}
                </Button>
              </form>
            </div>
          </div>
        ) : error ? (
          <div className="text-center space-y-4">
            <p className="text-red-400">{error}</p>
            <button
              onClick={() => setLocation("/auth")}
              className="text-primary hover:underline"
            >
              Back to login
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-white/60">Completing sign in...</p>
          </div>
        )}
      </div>
    </div>
  );
}
