import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { BookText, Sparkles } from "lucide-react";
import { RhymeResults } from "./rhymeUtils";

interface SidebarRhymeProps {
  currentWord: string;
  rhymes: RhymeResults;
  isLoadingData: boolean;
  onUseRhyme: (word: string) => void;
  onOpenFullRhymes: () => void;
}

function RhymeSection({
  title,
  words,
  onUseRhyme,
}: {
  title: string;
  words: string[];
  onUseRhyme: (word: string) => void;
}) {
  return (
    <div className="space-y-2">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</h3>
      {words.length === 0 ? (
        <p className="text-xs text-muted-foreground">No suggestions yet.</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {words.map((word) => (
            <Badge
              key={`${title}-${word}`}
              variant="secondary"
              className="cursor-pointer rounded-full px-3 py-1 capitalize transition-colors hover:bg-primary hover:text-primary-foreground"
              onClick={() => onUseRhyme(word)}
            >
              {word}
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}

export default function SidebarRhyme({
  currentWord,
  rhymes,
  isLoadingData,
  onUseRhyme,
  onOpenFullRhymes,
}: SidebarRhymeProps) {
  return (
    <aside className="glass-surface flex h-full flex-col rounded-3xl border border-border/55 p-4">
      <div className="mb-3 flex items-center gap-2">
        <BookText className="h-5 w-5 text-primary" />
        <div>
          <h2 className="text-base font-semibold">Rhyme engine</h2>
          <p className="text-xs text-muted-foreground">Local and instant suggestions</p>
        </div>
      </div>

      <div className="mb-4 rounded-2xl border border-border/50 bg-background/50 p-3">
        <p className="text-xs text-muted-foreground">Current word</p>
        <p className="mt-1 text-lg font-semibold capitalize">
          {currentWord || "Type in the editor"}
        </p>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto pr-1">
        {isLoadingData ? (
          <p className="text-sm text-muted-foreground">Loading rhyme bank...</p>
        ) : (
          <>
            <RhymeSection title="Perfect" words={rhymes.perfect.slice(0, 10)} onUseRhyme={onUseRhyme} />
            <Separator />
            <RhymeSection title="Near" words={rhymes.near.slice(0, 10)} onUseRhyme={onUseRhyme} />
            <Separator />
            <RhymeSection title="Family" words={rhymes.family.slice(0, 10)} onUseRhyme={onUseRhyme} />
          </>
        )}
      </div>

      <Button
        className="mt-4 w-full gap-2 rounded-xl"
        variant="secondary"
        onClick={onOpenFullRhymes}
      >
        <Sparkles className="h-4 w-4" />
        Open full dictionary
      </Button>
      <p className="mt-2 text-center text-xs text-muted-foreground">
        Tap a word to copy it.
      </p>
    </aside>
  );
}
