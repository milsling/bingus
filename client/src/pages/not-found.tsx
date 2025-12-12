import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-background text-foreground p-4">
      <div className="flex flex-col items-center text-center space-y-6 max-w-md">
        <AlertTriangle className="h-24 w-24 text-primary animate-pulse" />
        
        <h1 className="text-6xl font-display font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-br from-primary to-green-600">
          404
        </h1>
        
        <div className="space-y-2">
          <h2 className="text-2xl font-bold font-display">Lost in the Sauce?</h2>
          <p className="text-muted-foreground font-mono">
            The bar you're looking for doesn't exist or has been deleted from the archives.
          </p>
        </div>

        <Link href="/">
          <Button size="lg" className="w-full font-bold">
            Return to the Cypher
          </Button>
        </Link>
      </div>
    </div>
  );
}
