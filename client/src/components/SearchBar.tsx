import { useState, useEffect, useRef } from "react";
import { Search, X, User, FileText, Hash, TrendingUp } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

interface SearchResult {
  type: "bar" | "user" | "tag";
  id: string;
  title: string;
  subtitle: string;
  avatarUrl?: string | null;
}

const TRENDING_TAGS = ["wordplay", "punchline", "metaphor", "freestyle", "storytelling"];

function stripHtml(html: string): string {
  const div = document.createElement('div');
  div.innerHTML = html;
  return div.textContent || div.innerText || '';
}

export function SearchBar({ className }: { className?: string }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [, setLocation] = useLocation();
  const containerRef = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsLoading(true);
      try {
        const [barsRes, usersRes, tagsRes] = await Promise.all([
          fetch(`/api/search/bars?q=${encodeURIComponent(query)}&limit=5`, { credentials: "include" }),
          fetch(`/api/search/users?q=${encodeURIComponent(query)}&limit=5`, { credentials: "include" }),
          fetch(`/api/search/tags?q=${encodeURIComponent(query)}&limit=5`, { credentials: "include" }),
        ]);
        
        const barsData = await barsRes.json();
        const usersData = await usersRes.json();
        const tagsData = await tagsRes.json().catch(() => []);

        const combined: SearchResult[] = [
          ...tagsData.map((tag: string) => ({
            type: "tag" as const,
            id: tag,
            title: `#${tag}`,
            subtitle: "Search by tag",
          })),
          ...usersData.map((u: any) => ({
            type: "user" as const,
            id: u.username,
            title: u.username,
            subtitle: u.bio?.slice(0, 50) || "Lyricist",
            avatarUrl: u.avatarUrl,
          })),
          ...barsData.slice(0, 5).map((b: any) => ({
            type: "bar" as const,
            id: b.id,
            title: stripHtml(b.content).slice(0, 60) + (b.content.length > 60 ? "..." : ""),
            subtitle: `by @${b.user?.username || "unknown"}`,
          })),
        ];
        setResults(combined);
      } catch (error) {
        console.error("Search error:", error);
      }
      setIsLoading(false);
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  const handleSelect = (result: SearchResult) => {
    if (result.type === "user") {
      setLocation(`/u/${result.id}`);
    } else if (result.type === "tag") {
      setLocation(`/?tag=${encodeURIComponent(result.id)}`);
    } else {
      setLocation(`/bars/${result.id}`);
    }
    setQuery("");
    setIsOpen(false);
  };

  const handleTagClick = (tag: string) => {
    setLocation(`/?tag=${encodeURIComponent(tag)}`);
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Search schemes, bars, or users..."
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          className="pl-9 pr-8 rounded-full glass-input"
          data-testid="input-search"
        />
        {query && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6"
            onClick={() => {
              setQuery("");
              setResults([]);
            }}
            data-testid="button-clear-search"
          >
            <X className="h-3 w-3" />
          </Button>
        )}
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={reduceMotion ? false : { opacity: 0, y: 8, scale: 0.98 }}
            animate={reduceMotion ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 4, scale: 0.98 }}
            transition={{ duration: 0.16, ease: "easeOut" }}
            className="absolute top-full left-0 right-0 z-[1300] mt-1 overflow-hidden rounded-2xl border border-white/10 bg-[linear-gradient(160deg,rgba(16,16,24,0.96),rgba(16,16,24,0.9))] shadow-[0_18px_30px_rgba(2,6,23,0.5)] backdrop-blur-xl"
          >
            {query.length < 2 ? (
              <div className="p-3">
                <div className="mb-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                  <TrendingUp className="h-3 w-3" />
                  <span>Trending Tags</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {TRENDING_TAGS.map((tag) => (
                    <Badge
                      key={tag}
                      variant="secondary"
                      className="cursor-pointer border border-white/10 bg-black/20 text-xs hover:bg-primary/20 hover:text-primary transition-colors"
                      onClick={() => handleTagClick(tag)}
                      data-testid={`trending-tag-${tag}`}
                    >
                      #{tag}
                    </Badge>
                  ))}
                </div>
              </div>
            ) : isLoading ? (
              <div className="p-4 text-center text-sm text-muted-foreground">Searching...</div>
            ) : results.length === 0 ? (
              <div className="p-4 text-center text-sm text-muted-foreground">No results found</div>
            ) : (
              <div className="max-h-80 overflow-y-auto">
                {results.map((result, index) => (
                  <button
                    key={`${result.type}-${result.id}`}
                    className="w-full text-left flex items-center gap-3 p-3 transition-colors hover:bg-white/[0.05]"
                    onClick={() => handleSelect(result)}
                    data-testid={`search-result-${index}`}
                  >
                    <div className="flex-shrink-0">
                      {result.type === "tag" ? (
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/20">
                          <Hash className="h-4 w-4 text-primary" />
                        </div>
                      ) : result.type === "user" ? (
                        result.avatarUrl ? (
                          <img src={result.avatarUrl} alt="" className="h-8 w-8 rounded-full object-cover" />
                        ) : (
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/20">
                            <User className="h-4 w-4 text-primary" />
                          </div>
                        )
                      ) : (
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="truncate text-sm font-medium">{result.title}</p>
                      <p className="truncate text-xs text-muted-foreground">{result.subtitle}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
