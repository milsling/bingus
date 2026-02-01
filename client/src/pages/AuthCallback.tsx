import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { getSupabase } from "@/lib/supabase";
import { Loader2 } from "lucide-react";
import iconUrl from "@/assets/icon.png";

export default function AuthCallback() {
  const [, setLocation] = useLocation();
  const [error, setError] = useState<string | null>(null);

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

          setLocation("/");
        } else {
          setError("No session found");
        }
      } catch (err: any) {
        setError(err.message || "Something went wrong");
      }
    }

    handleCallback();
  }, [setLocation]);

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

        {error ? (
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
