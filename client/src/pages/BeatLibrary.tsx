import { useState, useMemo, useCallback, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Search,
  Upload,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
  Music,
  Loader2,
} from "lucide-react";
import { BeatCard } from "@/components/BeatCard";
import { BeatUploadModal } from "@/components/BeatUploadModal";
import { useBars } from "@/context/BarContext";
import { apiRequest } from "@/lib/queryClient";
import type { BeatWithProducer } from "@shared/schema";

const GENRES = [
  { value: "trap", label: "Trap" },
  { value: "boom_bap", label: "Boom Bap" },
  { value: "drill", label: "Drill" },
  { value: "lo_fi", label: "Lo-Fi" },
  { value: "west_coast", label: "West Coast" },
  { value: "east_coast", label: "East Coast" },
  { value: "melodic", label: "Melodic" },
  { value: "dark", label: "Dark" },
  { value: "experimental", label: "Experimental" },
  { value: "other", label: "Other" },
];

const KEYS = [
  "C major", "C minor", "C# major", "C# minor",
  "D major", "D minor", "Eb major", "Eb minor",
  "E major", "E minor", "F major", "F minor",
  "F# major", "F# minor", "G major", "G minor",
  "Ab major", "Ab minor", "A major", "A minor",
  "Bb major", "Bb minor", "B major", "B minor",
];

const SORT_OPTIONS = [
  { value: "newest", label: "Newest" },
  { value: "most_played", label: "Most Played" },
  { value: "most_favorited", label: "Most Favorited" },
];

const PAGE_LIMIT = 20;

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

export default function BeatLibrary() {
  const queryClient = useQueryClient();
  const { currentUser } = useBars();
  const canUploadBeats = Boolean(
    currentUser?.isOwner ||
    currentUser?.isProducer ||
    currentUser?.userRole === "producer" ||
    currentUser?.userRole === "both",
  );
  // Upload modal
  const [uploadOpen, setUploadOpen] = useState(false);

  // Filters
  const [searchInput, setSearchInput] = useState("");
  const debouncedSearch = useDebounce(searchInput, 300);
  const [bpmMin, setBpmMin] = useState("");
  const [bpmMax, setBpmMax] = useState("");
  const [selectedKey, setSelectedKey] = useState("");
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [sort, setSort] = useState("newest");
  const [page, setPage] = useState(1);
  const [filtersOpen, setFiltersOpen] = useState(false);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, bpmMin, bpmMax, selectedKey, selectedGenres, sort]);

  // Build query string
  const queryParams = useMemo(() => {
    const params = new URLSearchParams();
    if (debouncedSearch) params.set("search", debouncedSearch);
    if (bpmMin) params.set("bpm_min", bpmMin);
    if (bpmMax) params.set("bpm_max", bpmMax);
    if (selectedKey) params.set("key", selectedKey);
    if (selectedGenres.length > 0) params.set("genre", selectedGenres.join(","));
    if (sort) params.set("sort", sort);
    params.set("page", String(page));
    params.set("limit", String(PAGE_LIMIT));
    return params.toString();
  }, [debouncedSearch, bpmMin, bpmMax, selectedKey, selectedGenres, sort, page]);

  // Fetch beats
  const {
    data,
    isLoading,
    isFetching,
  } = useQuery<{ beats: BeatWithProducer[]; total: number }>({
    queryKey: ["/api/beats", queryParams],
    queryFn: async () => {
      const res = await fetch(`/api/beats?${queryParams}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch beats");
      return res.json();
    },
    staleTime: 30000,
  });

  const beats = data?.beats ?? [];
  const total = data?.total ?? 0;
  const hasMore = beats.length > 0 && page * PAGE_LIMIT < total;

  // Accumulated beats for "load more" pagination
  const [accumulatedBeats, setAccumulatedBeats] = useState<BeatWithProducer[]>([]);

  useEffect(() => {
    if (beats.length > 0) {
      if (page === 1) {
        setAccumulatedBeats(beats);
      } else {
        setAccumulatedBeats((prev) => {
          const existingIds = new Set(prev.map((b) => b.id));
          const newBeats = beats.filter((b) => !existingIds.has(b.id));
          return [...prev, ...newBeats];
        });
      }
    } else if (page === 1) {
      setAccumulatedBeats([]);
    }
  }, [beats, page]);

  // Reset accumulated beats when filters change
  useEffect(() => {
    setAccumulatedBeats([]);
  }, [debouncedSearch, bpmMin, bpmMax, selectedKey, selectedGenres, sort]);

  // Favorite mutation
  const favoriteMutation = useMutation({
    mutationFn: async (beatId: string) => {
      const res = await apiRequest("POST", `/api/beats/${beatId}/favorite`);
      return res.json() as Promise<{ isFavorited: boolean }>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/beats"] });
    },
  });

  const handleFavorite = useCallback(
    (beatId: string) => {
      favoriteMutation.mutate(beatId);
    },
    [favoriteMutation],
  );

  const toggleGenre = useCallback((genre: string) => {
    setSelectedGenres((prev) =>
      prev.includes(genre) ? prev.filter((g) => g !== genre) : [...prev, genre],
    );
  }, []);

  const clearFilters = useCallback(() => {
    setSearchInput("");
    setBpmMin("");
    setBpmMax("");
    setSelectedKey("");
    setSelectedGenres([]);
    setSort("newest");
  }, []);

  const hasActiveFilters =
    debouncedSearch || bpmMin || bpmMax || selectedKey || selectedGenres.length > 0 || sort !== "newest";

  return (
    <div className="min-h-screen bg-background pt-14 pb-24 md:pb-4 md:pt-24">
      <div className="container mx-auto max-w-7xl p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Music className="h-7 w-7 text-accent" />
            <h1 className="text-2xl font-bold text-foreground">Beat Library</h1>
          </div>
          {currentUser && canUploadBeats && (
            <button
              onClick={() => setUploadOpen(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-accent/20 hover:bg-accent/30 text-accent text-sm font-medium border border-accent/30 transition-colors"
            >
              <Upload size={16} />
              Upload Beat
            </button>
          )}
        </div>

        {/* Search + Filter bar */}
        <div className="glass-surface rounded-2xl border border-border/30 mb-6 overflow-hidden">
          {/* Search row - always visible */}
          <div className="p-3 flex items-center gap-3">
            <div className="relative flex-1">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
              />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search beats by title, tags, or producer..."
                className="glass-field w-full rounded-xl pl-9 pr-3 py-2 text-sm text-foreground border border-border/30 focus:border-accent/50 outline-none"
              />
            </div>

            {/* Sort dropdown */}
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="glass-field rounded-xl px-3 py-2 text-sm text-foreground border border-border/30 focus:border-accent/50 outline-none bg-transparent hidden sm:block"
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>

            {/* Toggle filters button */}
            <button
              onClick={() => setFiltersOpen(!filtersOpen)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm border transition-colors ${
                filtersOpen || hasActiveFilters
                  ? "bg-accent/15 border-accent/30 text-accent"
                  : "glass-field border-border/30 text-muted-foreground hover:text-foreground"
              }`}
            >
              <SlidersHorizontal size={14} />
              <span className="hidden sm:inline">Filters</span>
              {hasActiveFilters && !filtersOpen && (
                <span className="w-1.5 h-1.5 rounded-full bg-accent" />
              )}
              {filtersOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
          </div>

          {/* Expanded filters */}
          {filtersOpen && (
            <div className="px-3 pb-3 space-y-3 border-t border-border/20 pt-3">
              {/* Mobile sort */}
              <div className="sm:hidden">
                <label className="text-xs text-muted-foreground mb-1 block">Sort by</label>
                <select
                  value={sort}
                  onChange={(e) => setSort(e.target.value)}
                  className="glass-field w-full rounded-xl px-3 py-2 text-sm text-foreground border border-border/30 focus:border-accent/50 outline-none bg-transparent"
                >
                  {SORT_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* BPM range + Key */}
              <div className="flex flex-wrap gap-3">
                <div className="flex items-center gap-2">
                  <label className="text-xs text-muted-foreground whitespace-nowrap">BPM</label>
                  <input
                    type="number"
                    value={bpmMin}
                    onChange={(e) => setBpmMin(e.target.value)}
                    placeholder="Min"
                    min="30"
                    max="300"
                    className="glass-field w-20 rounded-lg px-2 py-1.5 text-sm text-foreground border border-border/30 focus:border-accent/50 outline-none"
                  />
                  <span className="text-xs text-muted-foreground">-</span>
                  <input
                    type="number"
                    value={bpmMax}
                    onChange={(e) => setBpmMax(e.target.value)}
                    placeholder="Max"
                    min="30"
                    max="300"
                    className="glass-field w-20 rounded-lg px-2 py-1.5 text-sm text-foreground border border-border/30 focus:border-accent/50 outline-none"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <label className="text-xs text-muted-foreground whitespace-nowrap">Key</label>
                  <select
                    value={selectedKey}
                    onChange={(e) => setSelectedKey(e.target.value)}
                    className="glass-field rounded-lg px-2 py-1.5 text-sm text-foreground border border-border/30 focus:border-accent/50 outline-none bg-transparent"
                  >
                    <option value="">Any key</option>
                    {KEYS.map((k) => (
                      <option key={k} value={k}>
                        {k}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Genres */}
              <div>
                <label className="text-xs text-muted-foreground mb-1.5 block">Genre</label>
                <div className="flex flex-wrap gap-1.5">
                  {GENRES.map((g) => (
                    <button
                      key={g.value}
                      onClick={() => toggleGenre(g.value)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors ${
                        selectedGenres.includes(g.value)
                          ? "bg-accent/20 border-accent/40 text-accent"
                          : "glass-field border-border/30 text-muted-foreground hover:text-foreground hover:border-border/50"
                      }`}
                    >
                      {g.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Clear filters */}
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="text-xs text-accent hover:text-accent/80 transition-colors"
                >
                  Clear all filters
                </button>
              )}
            </div>
          )}
        </div>

        {/* Results count */}
        {!isLoading && (
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-muted-foreground">
              {total === 0
                ? "No beats found"
                : total === 1
                  ? "1 beat found"
                  : `${total} beats found`}
            </p>
            {isFetching && !isLoading && (
              <Loader2 size={14} className="animate-spin text-muted-foreground" />
            )}
          </div>
        )}

        {/* Loading state */}
        {isLoading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="glass-card rounded-2xl border border-border/30 overflow-hidden animate-pulse"
              >
                <div className="h-24 bg-white/5" />
                <div className="p-3 space-y-2">
                  <div className="h-4 bg-white/5 rounded w-3/4" />
                  <div className="h-3 bg-white/5 rounded w-1/2" />
                  <div className="flex gap-1.5">
                    <div className="h-4 bg-white/5 rounded w-14" />
                    <div className="h-4 bg-white/5 rounded w-12" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Beat grid */}
        {!isLoading && accumulatedBeats.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {accumulatedBeats.map((beat) => (
              <BeatCard
                key={beat.id}
                beat={beat}
                onFavorite={currentUser ? handleFavorite : undefined}
                showActions
              />
            ))}
          </div>
        )}

        {/* Empty state */}
        {!isLoading && accumulatedBeats.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mb-4">
              <Music size={32} className="text-muted-foreground/50" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-1">No beats found</h3>
            <p className="text-sm text-muted-foreground max-w-sm">
              {hasActiveFilters
                ? "Try adjusting your filters or search terms to find what you're looking for."
                : "Be the first to upload a beat and share it with the community."}
            </p>
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="mt-4 px-4 py-2 rounded-xl bg-accent/15 hover:bg-accent/25 text-accent text-sm font-medium border border-accent/30 transition-colors"
              >
                Clear filters
              </button>
            )}
            {!hasActiveFilters && currentUser && canUploadBeats && (
              <button
                onClick={() => setUploadOpen(true)}
                className="mt-4 flex items-center gap-2 px-4 py-2 rounded-xl bg-accent/15 hover:bg-accent/25 text-accent text-sm font-medium border border-accent/30 transition-colors"
              >
                <Upload size={16} />
                Upload a beat
              </button>
            )}
            {!hasActiveFilters && currentUser && !canUploadBeats && (
              <p className="mt-4 text-xs text-muted-foreground">
                Beat uploads are available for producer accounts.
              </p>
            )}
          </div>
        )}

        {/* Load more */}
        {!isLoading && hasMore && (
          <div className="flex justify-center mt-8">
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={isFetching}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl glass-field border border-border/30 hover:border-accent/30 text-sm font-medium text-foreground transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isFetching ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  Loading...
                </>
              ) : (
                "Load More"
              )}
            </button>
          </div>
        )}
      </div>

      {/* Upload modal */}
      <BeatUploadModal open={uploadOpen} onClose={() => setUploadOpen(false)} />
    </div>
  );
}
