import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { BookText, Search, ArrowLeft, Loader2, Copy, Volume2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface RhymeWord {
  word: string;
  score?: number;
  numSyllables?: number;
}

type SearchType = 'rhyme' | 'near' | 'sounds' | 'related' | 'synonym';

const searchTypes: { id: SearchType; label: string; endpoint: string; description: string }[] = [
  { id: 'rhyme', label: 'Perfect', endpoint: 'rel_rhy', description: 'Perfect rhymes' },
  { id: 'near', label: 'Near', endpoint: 'rel_nry', description: 'Near rhymes' },
  { id: 'sounds', label: 'Sounds Like', endpoint: 'sl', description: 'Words that sound similar' },
  { id: 'related', label: 'Related', endpoint: 'ml', description: 'Related meanings' },
  { id: 'synonym', label: 'Synonyms', endpoint: 'rel_syn', description: 'Similar words' },
];

export default function RhymeDictionary() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  
  const [query, setQuery] = useState("");
  const [searchType, setSearchType] = useState<SearchType>('rhyme');
  const [results, setResults] = useState<RhymeWord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = async () => {
    if (!query.trim()) return;
    
    setIsLoading(true);
    setHasSearched(true);
    
    try {
      const typeConfig = searchTypes.find(t => t.id === searchType);
      if (!typeConfig) return;
      
      const response = await fetch(
        `https://api.datamuse.com/words?${typeConfig.endpoint}=${encodeURIComponent(query.trim())}&max=100`
      );
      
      if (!response.ok) throw new Error('Failed to fetch rhymes');
      
      const data = await response.json();
      setResults(data);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to search. Please try again.",
        variant: "destructive",
      });
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const copyWord = (word: string) => {
    navigator.clipboard.writeText(word);
    toast({ title: "Copied!", description: word });
  };

  const speakWord = (word: string) => {
    const utterance = new SpeechSynthesisUtterance(word);
    speechSynthesis.speak(utterance);
  };

  const groupBySyllables = (words: RhymeWord[]) => {
    const groups: Record<number, RhymeWord[]> = {};
    words.forEach(word => {
      const syllables = word.numSyllables || 0;
      if (!groups[syllables]) groups[syllables] = [];
      groups[syllables].push(word);
    });
    return Object.entries(groups)
      .sort(([a], [b]) => Number(a) - Number(b))
      .filter(([syllables]) => Number(syllables) > 0);
  };

  const syllableGroups = groupBySyllables(results);

  return (
    <div className="min-h-screen bg-background pt-14 pb-20 md:pb-4 md:pt-24">
      <div className="w-full max-w-4xl xl:max-w-6xl mx-auto p-4 md:p-6">
        <div className="flex items-center gap-3 mb-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/apps')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <BookText className="h-6 w-6 text-purple-500" />
          <h1 className="text-xl font-bold" style={{ fontFamily: 'var(--font-logo)' }}>Rhyme Dictionary</h1>
        </div>

        <Card className="mb-4">
          <CardContent className="pt-4">
            <div className="flex gap-2">
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Enter a word..."
                className="text-lg"
                data-testid="input-rhyme-search"
              />
              <Button 
                onClick={handleSearch} 
                disabled={isLoading || !query.trim()}
                data-testid="button-search-rhymes"
              >
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              </Button>
            </div>

            <Tabs value={searchType} onValueChange={(v) => setSearchType(v as SearchType)} className="mt-4">
              <TabsList className="w-full grid grid-cols-5">
                {searchTypes.map(type => (
                  <TabsTrigger key={type.id} value={type.id} className="text-xs">
                    {type.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
            
            <p className="text-xs text-muted-foreground mt-2 text-center">
              {searchTypes.find(t => t.id === searchType)?.description}
            </p>
          </CardContent>
        </Card>

        <AnimatePresence mode="wait">
          {isLoading ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex justify-center py-12"
            >
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </motion.div>
          ) : hasSearched && results.length === 0 ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <Card>
                <CardContent className="py-12 text-center">
                  <p className="text-muted-foreground">No results found for "{query}"</p>
                  <p className="text-xs text-muted-foreground mt-1">Try a different word or search type</p>
                </CardContent>
              </Card>
            </motion.div>
          ) : results.length > 0 ? (
            <motion.div
              key="results"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              {syllableGroups.length > 0 ? (
                <div className="space-y-4">
                  {syllableGroups.map(([syllables, words]) => (
                    <Card key={syllables}>
                      <CardHeader className="py-3">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                          <Badge variant="outline">{syllables} syllable{syllables !== '1' ? 's' : ''}</Badge>
                          <span className="text-muted-foreground text-xs">({words.length} words)</span>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="flex flex-wrap gap-2">
                          {words.map((result, index) => (
                            <motion.div
                              key={result.word}
                              initial={{ opacity: 0, scale: 0.9 }}
                              animate={{ opacity: 1, scale: 1 }}
                              transition={{ delay: index * 0.01 }}
                            >
                              <Badge
                                variant="secondary"
                                className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors py-1.5 px-3 text-sm group"
                                onClick={() => copyWord(result.word)}
                                data-testid={`rhyme-word-${result.word}`}
                              >
                                {result.word}
                                <div className="hidden group-hover:flex items-center gap-1 ml-2">
                                  <Copy className="h-3 w-3" />
                                  <Volume2 
                                    className="h-3 w-3" 
                                    onClick={(e) => { e.stopPropagation(); speakWord(result.word); }}
                                  />
                                </div>
                              </Badge>
                            </motion.div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card>
                  <CardContent className="pt-4">
                    <div className="flex flex-wrap gap-2">
                      {results.map((result, index) => (
                        <motion.div
                          key={result.word}
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: index * 0.01 }}
                        >
                          <Badge
                            variant="secondary"
                            className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors py-1.5 px-3 text-sm"
                            onClick={() => copyWord(result.word)}
                            data-testid={`rhyme-word-${result.word}`}
                          >
                            {result.word}
                          </Badge>
                        </motion.div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              <p className="text-xs text-muted-foreground text-center mt-4">
                Click any word to copy • Powered by Datamuse API
              </p>
            </motion.div>
          ) : (
            <motion.div
              key="initial"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <Card>
                <CardContent className="py-12 text-center">
                  <BookText className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <p className="text-muted-foreground">Enter a word to find rhymes</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Search for perfect rhymes, near rhymes, similar sounds, and more
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
