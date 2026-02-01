import { useQuery } from "@tanstack/react-query";
import Navigation from "@/components/Navigation";
import BarCard from "@/components/BarCard";
import { BarSkeletonList } from "@/components/BarSkeleton";
import { Bookmark } from "lucide-react";
import { useBars } from "@/context/BarContext";
import { useLocation } from "wouter";
import { useEffect } from "react";

export default function Saved() {
  const { currentUser, isLoadingUser } = useBars();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!isLoadingUser && !currentUser) {
      setLocation("/auth");
    }
  }, [currentUser, isLoadingUser, setLocation]);

  const { data: bookmarks = [], isLoading } = useQuery({
    queryKey: ['bookmarks'],
    queryFn: async () => {
      const res = await fetch('/api/bookmarks', { credentials: 'include' });
      return res.json();
    },
    enabled: !!currentUser,
    staleTime: 30000,
    refetchOnWindowFocus: false,
  });

  if (isLoadingUser) {
    return (
      <div className="min-h-screen bg-background pt-14 pb-20 md:pb-4 md:pt-24">
        <Navigation />
        <div className="max-w-3xl lg:max-w-4xl xl:max-w-5xl mx-auto px-4 py-8">
          <BarSkeletonList count={3} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pt-14 pb-20 md:pb-4 md:pt-24">
      <Navigation />
      
      <main className="max-w-3xl lg:max-w-4xl xl:max-w-5xl mx-auto">
        <div className="px-4 py-8">
          <div className="flex items-center gap-3 mb-6">
            <Bookmark className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold">Saved Bars</h1>
          </div>

          {isLoading ? (
            <BarSkeletonList count={3} />
          ) : bookmarks.length === 0 ? (
            <div className="text-center py-20 text-muted-foreground">
              <Bookmark className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg">No saved bars yet</p>
              <p className="text-sm mt-2">Tap the bookmark icon on any bar to save it here</p>
            </div>
          ) : (
            <div className="space-y-6">
              {bookmarks.map((bar: any) => (
                <BarCard key={bar.id} bar={bar} />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
