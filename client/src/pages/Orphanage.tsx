import { useQuery } from "@tanstack/react-query";
import Navigation from "@/components/Navigation";
import BarCard from "@/components/BarCard";
import { BarSkeletonList } from "@/components/BarSkeleton";
import orphanageLogo from "@/assets/orphanage-logo.png";

export default function Orphanage() {
  const { data: adoptableBars = [], isLoading } = useQuery({
    queryKey: ['adoptable-bars'],
    queryFn: async () => {
      const res = await fetch('/api/bars/adoptable', { credentials: 'include' });
      return res.json();
    },
    staleTime: 30000,
    refetchOnWindowFocus: false,
  });

  return (
    <div className="min-h-screen bg-background pt-14 pb-20 md:pb-0 md:pt-16">
      <Navigation />
      
      <main className="max-w-3xl mx-auto">
        <div className="px-4 py-8">
          <div className="flex flex-col items-center mb-10">
            <img 
              src={orphanageLogo} 
              alt="The Orphanage" 
              className="h-48 md:h-56 w-auto mb-6 dark:invert dark:brightness-200"
              data-testid="img-orphanage-logo"
            />
            <p className="text-muted-foreground text-center text-base max-w-md">
              These bars are free to use for commercial purposes. Adopt one and make it your own.
            </p>
          </div>

          {isLoading ? (
            <BarSkeletonList count={3} />
          ) : adoptableBars.length === 0 ? (
            <div className="text-center py-20 text-muted-foreground">
              <div className="h-16 w-16 mx-auto mb-4 opacity-50 rounded-lg bg-muted flex items-center justify-center">
                <span className="text-3xl">🏠</span>
              </div>
              <p className="text-lg">The Orphanage is empty</p>
              <p className="text-sm mt-2">No bars are currently available for adoption</p>
            </div>
          ) : (
            <div className="space-y-6">
              {adoptableBars.map((bar: any) => (
                <BarCard key={bar.id} bar={bar} />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
