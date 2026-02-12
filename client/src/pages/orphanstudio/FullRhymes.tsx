import { useMemo, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Search, Copy } from "lucide-react";
import { RhymeData, RhymeResults, searchRhymeWords } from "./rhymeUtils";

interface FullRhymesProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentWord: string;
  rhymes: RhymeResults;
  rhymeData: RhymeData | null;
  onUseRhyme: (word: string) => void;
}

function RhymeChip({ word, onUseRhyme }: { word: string; onUseRhyme: (word: string) => void }) {
  return (
    <Badge
      variant="secondary"
      className="cursor-pointer rounded-full px-3 py-1 text-sm capitalize transition-colors hover:bg-primary hover:text-primary-foreground"
      onClick={() => onUseRhyme(word)}
    >
      <Copy className="mr-1 h-3 w-3" />
      {word}
    </Badge>
  );
}

export default function FullRhymes({
  open,
  onOpenChange,
  currentWord,
  rhymes,
  rhymeData,
  onUseRhyme,
}: FullRhymesProps) {
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (open) {
      setQuery(currentWord);
    }
  }, [open, currentWord]);

  const dictionaryMatches = useMemo(
    () => searchRhymeWords(query, rhymeData, 140),
    [query, rhymeData],
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Full rhyme dictionary</DialogTitle>
          <DialogDescription>
            Click a word to copy it. Suggestions are generated locally from OrphanStudio data.
          </DialogDescription>
        </DialogHeader>

        <div className="mb-1 flex items-center gap-2">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search a word or ending..."
            className="glass-field"
          />
        </div>

        <Tabs defaultValue="perfect" className="space-y-3">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="perfect">Perfect</TabsTrigger>
            <TabsTrigger value="near">Near</TabsTrigger>
            <TabsTrigger value="family">Family</TabsTrigger>
            <TabsTrigger value="explore">Explore</TabsTrigger>
          </TabsList>

          <TabsContent value="perfect" className="min-h-[14rem] rounded-2xl border border-border/60 p-3">
            {rhymes.perfect.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No perfect rhymes yet. Type a word in the editor to generate suggestions.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {rhymes.perfect.map((word) => (
                  <RhymeChip key={`perfect-${word}`} word={word} onUseRhyme={onUseRhyme} />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="near" className="min-h-[14rem] rounded-2xl border border-border/60 p-3">
            {rhymes.near.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No near rhymes yet. Try another word or open Explore for full lookup.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {rhymes.near.map((word) => (
                  <RhymeChip key={`near-${word}`} word={word} onUseRhyme={onUseRhyme} />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="family" className="min-h-[14rem] rounded-2xl border border-border/60 p-3">
            {rhymes.family.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No family words yet. These usually include phrases and tonal cousins.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {rhymes.family.map((word) => (
                  <RhymeChip key={`family-${word}`} word={word} onUseRhyme={onUseRhyme} />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="explore" className="min-h-[14rem] rounded-2xl border border-border/60 p-3">
            {dictionaryMatches.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Search to browse the local rhyme bank.
              </p>
            ) : (
              <div className="flex max-h-[16rem] flex-wrap gap-2 overflow-y-auto pr-1">
                {dictionaryMatches.map((word) => (
                  <RhymeChip key={`explore-${word}`} word={word} onUseRhyme={onUseRhyme} />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        <div className="flex justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close dictionary
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
