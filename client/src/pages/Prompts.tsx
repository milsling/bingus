import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PenLine, Sparkles } from "lucide-react";
import { Link } from "wouter";

const CURRENT_PROMPT = {
  id: "neon-nightmares",
  title: "Neon nightmares",
  cadence: "Weekly prompt",
  description: "Write a bar that feels like city lights, late nights, and bad decisions.",
};

export default function Prompts() {
  return (
    <div className="min-h-screen bg-background pt-14 pb-20 md:pb-4 md:pt-24">
      <main className="max-w-3xl lg:max-w-4xl xl:max-w-5xl mx-auto px-4 py-6 space-y-6">
        <div className="glass-panel p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <Badge className="bg-primary/15 text-primary border border-primary/25 hover:bg-primary/15">
                <Sparkles className="h-3.5 w-3.5 mr-1" />
                Current prompt
              </Badge>
              <h1 className="mt-3 text-3xl font-display font-black tracking-tight text-foreground">
                “{CURRENT_PROMPT.title}”
              </h1>
              <p className="text-sm text-muted-foreground mt-1">{CURRENT_PROMPT.cadence}</p>
              <p className="text-muted-foreground mt-3 max-w-2xl">
                {CURRENT_PROMPT.description}
              </p>
            </div>
            <Link href={`/post?prompt=${encodeURIComponent(CURRENT_PROMPT.id)}`}>
              <Button className="gap-2 shrink-0" data-testid="button-write-to-prompt">
                <PenLine className="h-4 w-4" />
                Write to this prompt
              </Button>
            </Link>
          </div>
        </div>

        <div className="glass-panel p-5">
          <h2 className="text-lg font-semibold text-foreground">More prompts</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Prompts are rolling out. Soon you’ll be able to browse past prompts and see every bar written to them.
          </p>
        </div>
      </main>
    </div>
  );
}

