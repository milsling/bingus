import { useQuery } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { api } from "@/lib/api";
import Navigation from "@/components/Navigation";
import BarCard from "@/components/BarCard";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2 } from "lucide-react";

export default function BarDetail() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();

  const { data: bar, isLoading, error } = useQuery({
    queryKey: ["bar", id],
    queryFn: () => api.getBar(id!),
    enabled: !!id,
    staleTime: 30000,
    refetchOnWindowFocus: false,
  });

  return (
    <div className="min-h-screen bg-background pt-14 pb-20 md:pb-4 md:pt-24">
      <Navigation />
      <main className="max-w-3xl lg:max-w-4xl xl:max-w-5xl mx-auto px-4 py-6">
        <Button
          variant="ghost"
          className="mb-4"
          onClick={() => setLocation("/")}
          data-testid="button-back-home"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Feed
        </Button>

        {isLoading && (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        )}

        {error && (
          <div className="text-center py-12">
            <p className="text-destructive" data-testid="text-bar-error">
              Bar not found or has been deleted.
            </p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => setLocation("/")}
            >
              Go to Feed
            </Button>
          </div>
        )}

        {bar && <BarCard bar={bar} />}
      </main>
    </div>
  );
}
