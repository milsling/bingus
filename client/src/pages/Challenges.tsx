import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Flame, Swords, PenLine } from "lucide-react";
import { Link } from "wouter";

export default function Challenges() {
  return (
    <div className="min-h-screen bg-background pt-14 pb-20 md:pb-4 md:pt-24">
      <main className="max-w-3xl lg:max-w-4xl xl:max-w-5xl mx-auto px-4 py-6 space-y-6">
        <div className="glass-panel p-5">
          <Badge className="bg-primary/15 text-primary border border-primary/25 hover:bg-primary/15">
            <Swords className="h-3.5 w-3.5 mr-1" />
            Challenges
          </Badge>
          <h1 className="mt-3 text-3xl font-display font-black tracking-tight text-foreground">
            Call-and-response battles are landing soon.
          </h1>
          <p className="text-muted-foreground mt-3">
            The goal: one writer marks a bar as a challenge, and others respond with their own bars—threaded beneath.
          </p>
          <div className="flex items-center gap-3 mt-5">
            <Link href="/post">
              <Button className="gap-2" data-testid="button-drop-challenge">
                <Flame className="h-4 w-4" />
                Drop a bar
              </Button>
            </Link>
            <Link href="/">
              <Button variant="outline" className="gap-2">
                <PenLine className="h-4 w-4" />
                Browse latest
              </Button>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}

