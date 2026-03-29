import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useBars } from "@/context/BarContext";
import { apiRequest } from "@/lib/queryClient";
import { useLocation, Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import {
  Vault as VaultIcon,
  Search,
  Plus,
  FolderOpen,
  Folder,
  Trash2,
  Pencil,
  Music,
  Send,
  Headphones,
  ArrowDownAZ,
  ArrowUpAZ,
  X,
  ChevronDown,
  Loader2,
  Hash,
  StickyNote,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

interface VaultStats {
  totalBars: number;
  totalFolders: number;
  barsThisWeek: number;
  totalSongs: number;
}

interface VaultBar {
  id: string;
  content: string;
  category: string;
  tags: string[] | null;
  barType: string;
  createdAt: string;
  folderId?: string | null;
  folderName?: string | null;
}

interface FolderWithCount {
  id: string;
  name: string;
  barCount: number;
  createdAt: string;
}

interface VaultBarsResponse {
  bars: VaultBar[];
  total: number;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function detectBarType(text: string): string {
  const lines = text.trim().split("\n").filter((l) => l.trim().length > 0);
  if (lines.length <= 1) return "single_bar";
  if (lines.length <= 4) return "snippet";
  if (lines.length <= 8) return "half_verse";
  return "half_verse";
}

function parseInlineTags(text: string): string[] {
  const tagPattern = /\[([^\]]+)\]/g;
  const tags: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = tagPattern.exec(text)) !== null) {
    tags.push(match[1].trim().toLowerCase());
  }
  return tags;
}

function stripInlineTags(text: string): string {
  return text.replace(/\s*\[([^\]]+)\]\s*/g, " ").trim();
}

function truncateText(text: string, maxLines: number): string {
  const lines = text.split("\n");
  if (lines.length <= maxLines) return text;
  return lines.slice(0, maxLines).join("\n") + "...";
}

function formatRelativeDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMs / 3600000);
  const diffDay = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;
  return date.toLocaleDateString();
}

// ─── Vault Bar Card (inline component) ──────────────────────────────────────

function VaultBarCard({
  bar,
  onEdit,
  onDelete,
  onAddToSongBuilder,
  onReleaseToFloor,
  onAttachBeat,
}: {
  bar: VaultBar;
  onEdit: (bar: VaultBar) => void;
  onDelete: (barId: string) => void;
  onAddToSongBuilder: (barId: string) => void;
  onReleaseToFloor: (barId: string) => void;
  onAttachBeat: (barId: string) => void;
}) {
  const barTypeLabel =
    bar.barType === "single_bar"
      ? "Bar"
      : bar.barType === "snippet"
        ? "Snippet"
        : bar.barType === "half_verse"
          ? "Half Verse"
          : bar.barType;

  return (
    <div className="glass-card p-4 flex flex-col gap-3 group transition-all">
      {/* Header row: type badge + folder badge + timestamp */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-400 border border-purple-500/20">
            {barTypeLabel}
          </span>
          {bar.folderName && (
            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-400 border border-blue-500/20 flex items-center gap-1">
              <Folder className="h-2.5 w-2.5" />
              {bar.folderName}
            </span>
          )}
        </div>
        <span className="text-[11px] text-muted-foreground/70">
          {formatRelativeDate(bar.createdAt)}
        </span>
      </div>

      {/* Content */}
      <div className="text-sm leading-relaxed whitespace-pre-wrap font-mono break-words line-clamp-3">
        {truncateText(bar.content, 3)}
      </div>

      {/* Tags */}
      {bar.tags && bar.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {bar.tags.map((tag, i) => (
            <span
              key={i}
              className="text-[10px] px-1.5 py-0.5 rounded-md bg-white/5 text-muted-foreground border border-white/10 flex items-center gap-0.5"
            >
              <Hash className="h-2.5 w-2.5" />
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Action row */}
      <div className="flex items-center gap-1 pt-1 border-t border-white/5 opacity-60 group-hover:opacity-100 transition-opacity">
        <button
          onClick={() => onAddToSongBuilder(bar.id)}
          className="text-[11px] px-2 py-1 rounded-md hover:bg-white/10 text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
          title="Add to Song Builder"
        >
          <Music className="h-3 w-3" />
          <span className="hidden sm:inline">Song Builder</span>
        </button>
        <button
          onClick={() => onReleaseToFloor(bar.id)}
          className="text-[11px] px-2 py-1 rounded-md hover:bg-white/10 text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
          title="Release to Floor"
        >
          <Send className="h-3 w-3" />
          <span className="hidden sm:inline">Release</span>
        </button>
        <button
          onClick={() => onAttachBeat(bar.id)}
          className="text-[11px] px-2 py-1 rounded-md hover:bg-white/10 text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
          title="Attach Beat"
        >
          <Headphones className="h-3 w-3" />
          <span className="hidden sm:inline">Beat</span>
        </button>
        <div className="flex-1" />
        <button
          onClick={() => onEdit(bar)}
          className="text-[11px] px-2 py-1 rounded-md hover:bg-white/10 text-muted-foreground hover:text-foreground transition-colors"
          title="Edit"
        >
          <Pencil className="h-3 w-3" />
        </button>
        <button
          onClick={() => onDelete(bar.id)}
          className="text-[11px] px-2 py-1 rounded-md hover:bg-red-500/20 text-muted-foreground hover:text-red-400 transition-colors"
          title="Delete"
        >
          <Trash2 className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}

// ─── Main Vault Page ─────────────────────────────────────────────────────────

export default function Vault() {
  const { currentUser, isLoadingUser, addBar } = useBars();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // ── State ──────────────────────────────────────────────────────────────────

  const [quickDropText, setQuickDropText] = useState("");
  const [isDropping, setIsDropping] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [activeFolderId, setActiveFolderId] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");
  const [page, setPage] = useState(1);
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [editingBar, setEditingBar] = useState<VaultBar | null>(null);

  const BARS_PER_PAGE = 20;

  // Redirect if not logged in
  useEffect(() => {
    if (!isLoadingUser && !currentUser) {
      navigate("/auth");
    }
  }, [currentUser, isLoadingUser, navigate]);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // ── Queries ────────────────────────────────────────────────────────────────

  const { data: stats } = useQuery<VaultStats>({
    queryKey: ["vault", "stats"],
    queryFn: async () => {
      const res = await fetch("/api/vault/stats", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load vault stats");
      return res.json();
    },
    enabled: !!currentUser,
  });

  const { data: foldersData = [] } = useQuery<FolderWithCount[]>({
    queryKey: ["vault", "folders"],
    queryFn: async () => {
      const res = await fetch("/api/vault/folders", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load folders");
      return res.json();
    },
    enabled: !!currentUser,
  });

  const barsQueryParams = new URLSearchParams({
    ...(debouncedSearch ? { search: debouncedSearch } : {}),
    ...(activeFolderId ? { folderId: activeFolderId } : {}),
    sort: sortOrder,
    page: String(page),
    limit: String(BARS_PER_PAGE),
  });

  const {
    data: barsData,
    isLoading: isLoadingBars,
  } = useQuery<VaultBarsResponse>({
    queryKey: ["vault", "bars", debouncedSearch, activeFolderId, sortOrder, page],
    queryFn: async () => {
      const res = await fetch(`/api/vault/bars?${barsQueryParams.toString()}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to load bars");
      return res.json();
    },
    enabled: !!currentUser,
  });

  const bars = barsData?.bars ?? [];
  const totalBars = barsData?.total ?? 0;
  const totalPages = Math.ceil(totalBars / BARS_PER_PAGE);

  // ── Mutations ──────────────────────────────────────────────────────────────

  const createFolderMutation = useMutation({
    mutationFn: async (name: string) => {
      const res = await apiRequest("POST", "/api/vault/folders", { name });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vault", "folders"] });
      queryClient.invalidateQueries({ queryKey: ["vault", "stats"] });
      setNewFolderName("");
      setShowNewFolder(false);
      toast({ title: "Folder created" });
    },
    onError: (err: Error) => {
      toast({ title: "Failed to create folder", description: err.message, variant: "destructive" });
    },
  });

  const deleteFolderMutation = useMutation({
    mutationFn: async (folderId: string) => {
      await apiRequest("DELETE", `/api/vault/folders/${folderId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vault", "folders"] });
      queryClient.invalidateQueries({ queryKey: ["vault", "bars"] });
      queryClient.invalidateQueries({ queryKey: ["vault", "stats"] });
      if (activeFolderId) setActiveFolderId(null);
      toast({ title: "Folder deleted" });
    },
    onError: (err: Error) => {
      toast({ title: "Failed to delete folder", description: err.message, variant: "destructive" });
    },
  });

  const deleteBarMutation = useMutation({
    mutationFn: async (barId: string) => {
      await apiRequest("DELETE", `/api/bars/${barId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vault", "bars"] });
      queryClient.invalidateQueries({ queryKey: ["vault", "stats"] });
      queryClient.invalidateQueries({ queryKey: ["bars"] });
      toast({ title: "Bar deleted" });
    },
    onError: (err: Error) => {
      toast({ title: "Failed to delete bar", description: err.message, variant: "destructive" });
    },
  });

  // ── Handlers ───────────────────────────────────────────────────────────────

  const handleQuickDrop = useCallback(async () => {
    const trimmed = quickDropText.trim();
    if (!trimmed) return;

    setIsDropping(true);
    try {
      const inlineTags = parseInlineTags(trimmed);
      const cleanContent = stripInlineTags(trimmed);
      const barType = detectBarType(cleanContent);

      await addBar({
        content: cleanContent,
        category: "vault",
        tags: inlineTags.length > 0 ? inlineTags : ["vault"],
        barType,
        permissionStatus: "private",
        isOriginal: true,
      });

      setQuickDropText("");
      queryClient.invalidateQueries({ queryKey: ["vault", "bars"] });
      queryClient.invalidateQueries({ queryKey: ["vault", "stats"] });
      toast({ title: "Bar dropped to vault" });
    } catch (err: any) {
      toast({
        title: "Failed to save bar",
        description: err?.message || "Something went wrong",
        variant: "destructive",
      });
    } finally {
      setIsDropping(false);
    }
  }, [quickDropText, addBar, queryClient, toast]);

  const handleCreateFolder = () => {
    const name = newFolderName.trim();
    if (!name) return;
    createFolderMutation.mutate(name);
  };

  const handleDeleteBar = (barId: string) => {
    if (window.confirm("Delete this bar permanently?")) {
      deleteBarMutation.mutate(barId);
    }
  };

  const handleDeleteFolder = (folderId: string) => {
    if (window.confirm("Delete this folder? Bars inside will be unassigned, not deleted.")) {
      deleteFolderMutation.mutate(folderId);
    }
  };

  const handleAddToSongBuilder = (barId: string) => {
    toast({ title: "Added to Song Builder", description: "Bar queued for your next session" });
  };

  const handleReleaseToFloor = (barId: string) => {
    toast({ title: "Released to Floor", description: "Your bar is now public on the Orphanage" });
  };

  const handleAttachBeat = (barId: string) => {
    toast({ title: "Attach Beat", description: "Beat attachment coming soon" });
  };

  const handleEdit = (bar: VaultBar) => {
    setEditingBar(bar);
    toast({ title: "Edit mode", description: "Bar editing coming soon" });
  };

  // ── Loading state ──────────────────────────────────────────────────────────

  if (isLoadingUser) {
    return (
      <div className="min-h-screen bg-background pt-14 pb-24 md:pb-4 md:pt-24 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!currentUser) return null;

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-background pt-14 pb-24 md:pb-4 md:pt-24">
      <div className="container mx-auto max-w-6xl p-4">
        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-purple-500/15 border border-purple-500/20 flex items-center justify-center">
              <VaultIcon className="h-5 w-5 text-purple-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Your Vault</h1>
              <p className="text-sm text-muted-foreground">
                {stats
                  ? `${stats.totalBars} bars across ${stats.totalFolders} folders`
                  : "Loading..."}
              </p>
            </div>
          </div>
          {stats && (
            <div className="hidden sm:flex items-center gap-4 text-sm text-muted-foreground">
              <div className="text-center">
                <div className="text-lg font-bold text-foreground">{stats.barsThisWeek}</div>
                <div className="text-[11px]">this week</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-foreground">{stats.totalSongs}</div>
                <div className="text-[11px]">songs</div>
              </div>
            </div>
          )}
        </div>

        {/* ── Quick-Drop Box ──────────────────────────────────────────────── */}
        <div className="glass-card p-4 mb-6">
          <div className="flex items-center gap-2 mb-2">
            <StickyNote className="h-4 w-4 text-purple-400" />
            <span className="text-sm font-medium">Quick Drop</span>
            <span className="text-[11px] text-muted-foreground ml-auto">
              Use [tag] for inline tags
            </span>
          </div>
          <textarea
            value={quickDropText}
            onChange={(e) => setQuickDropText(e.target.value)}
            placeholder={"Drop a bar, snippet, or verse...\nUse [punch] [multi] for tags"}
            rows={3}
            className="glass-field w-full resize-none text-sm font-mono p-3 rounded-lg mb-3 placeholder:text-muted-foreground/50 focus:outline-none"
          />
          <div className="flex items-center justify-between">
            <div className="text-[11px] text-muted-foreground">
              {quickDropText.trim() && (
                <>
                  Detected:{" "}
                  <span className="text-purple-400 font-medium">
                    {detectBarType(quickDropText)}
                  </span>
                  {parseInlineTags(quickDropText).length > 0 && (
                    <>
                      {" | Tags: "}
                      {parseInlineTags(quickDropText).map((t, i) => (
                        <span key={i} className="text-blue-400">
                          {i > 0 ? ", " : ""}
                          {t}
                        </span>
                      ))}
                    </>
                  )}
                </>
              )}
            </div>
            <button
              onClick={handleQuickDrop}
              disabled={!quickDropText.trim() || isDropping}
              className="px-4 py-1.5 rounded-lg bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 text-sm font-medium border border-purple-500/25 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              {isDropping ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Plus className="h-3.5 w-3.5" />
              )}
              Drop
            </button>
          </div>
        </div>

        {/* ── Filter Bar ──────────────────────────────────────────────────── */}
        <div className="glass-surface rounded-xl p-3 mb-4 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          {/* Search input */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search bars..."
              className="glass-field w-full pl-9 pr-8 py-2 text-sm rounded-lg focus:outline-none"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground/60 hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Sort toggle */}
          <button
            onClick={() => setSortOrder((s) => (s === "newest" ? "oldest" : "newest"))}
            className="flex items-center gap-1.5 px-3 py-2 text-sm text-muted-foreground hover:text-foreground rounded-lg hover:bg-white/5 transition-colors whitespace-nowrap"
          >
            {sortOrder === "newest" ? (
              <ArrowDownAZ className="h-4 w-4" />
            ) : (
              <ArrowUpAZ className="h-4 w-4" />
            )}
            {sortOrder === "newest" ? "Newest" : "Oldest"}
          </button>
        </div>

        {/* ── Folder Tabs ─────────────────────────────────────────────────── */}
        <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-1 scrollbar-hide">
          {/* All Bars tab */}
          <button
            onClick={() => {
              setActiveFolderId(null);
              setPage(1);
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg whitespace-nowrap transition-colors ${
              activeFolderId === null
                ? "bg-purple-500/20 text-purple-300 border border-purple-500/25"
                : "text-muted-foreground hover:text-foreground hover:bg-white/5 border border-transparent"
            }`}
          >
            <FolderOpen className="h-3.5 w-3.5" />
            All Bars
            {stats && (
              <span className="text-[10px] opacity-70 ml-0.5">({stats.totalBars})</span>
            )}
          </button>

          {/* User folders */}
          {foldersData.map((folder) => (
            <div key={folder.id} className="flex items-center group">
              <button
                onClick={() => {
                  setActiveFolderId(folder.id);
                  setPage(1);
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-l-lg whitespace-nowrap transition-colors ${
                  activeFolderId === folder.id
                    ? "bg-blue-500/20 text-blue-300 border border-blue-500/25 border-r-0"
                    : "text-muted-foreground hover:text-foreground hover:bg-white/5 border border-transparent border-r-0"
                }`}
              >
                <Folder className="h-3.5 w-3.5" />
                {folder.name}
                <span className="text-[10px] opacity-70 ml-0.5">({folder.barCount})</span>
              </button>
              <button
                onClick={() => handleDeleteFolder(folder.id)}
                className={`px-1.5 py-1.5 rounded-r-lg opacity-0 group-hover:opacity-100 transition-all text-muted-foreground hover:text-red-400 hover:bg-red-500/10 ${
                  activeFolderId === folder.id
                    ? "border border-blue-500/25 border-l-0"
                    : "border border-transparent border-l-0"
                }`}
                title="Delete folder"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}

          {/* New Folder button */}
          {showNewFolder ? (
            <div className="flex items-center gap-1.5">
              <input
                type="text"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleCreateFolder();
                  if (e.key === "Escape") {
                    setShowNewFolder(false);
                    setNewFolderName("");
                  }
                }}
                placeholder="Folder name..."
                className="glass-field px-2 py-1 text-sm rounded-lg w-32 focus:outline-none"
                autoFocus
              />
              <button
                onClick={handleCreateFolder}
                disabled={!newFolderName.trim() || createFolderMutation.isPending}
                className="px-2 py-1 text-sm rounded-lg bg-blue-500/20 text-blue-300 hover:bg-blue-500/30 disabled:opacity-40 transition-colors"
              >
                {createFolderMutation.isPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  "Add"
                )}
              </button>
              <button
                onClick={() => {
                  setShowNewFolder(false);
                  setNewFolderName("");
                }}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowNewFolder(true)}
              className="flex items-center gap-1 px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground rounded-lg hover:bg-white/5 transition-colors whitespace-nowrap border border-dashed border-white/10 hover:border-white/20"
            >
              <Plus className="h-3.5 w-3.5" />
              New Folder
            </button>
          )}
        </div>

        {/* ── Bar Grid ────────────────────────────────────────────────────── */}
        {isLoadingBars ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="glass-card p-4 animate-pulse">
                <div className="h-3 w-16 bg-white/10 rounded mb-3" />
                <div className="space-y-2">
                  <div className="h-3 w-full bg-white/10 rounded" />
                  <div className="h-3 w-4/5 bg-white/10 rounded" />
                  <div className="h-3 w-3/5 bg-white/10 rounded" />
                </div>
                <div className="flex gap-2 mt-4">
                  <div className="h-5 w-12 bg-white/10 rounded" />
                  <div className="h-5 w-12 bg-white/10 rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : bars.length === 0 ? (
          <div className="text-center py-20">
            <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-purple-500/10 border border-purple-500/15 mb-4">
              <VaultIcon className="h-8 w-8 text-purple-400/60" />
            </div>
            <h3 className="text-lg font-medium mb-1 text-foreground">
              {debouncedSearch
                ? "No bars match your search"
                : activeFolderId
                  ? "This folder is empty"
                  : "Your vault is empty"}
            </h3>
            <p className="text-sm text-muted-foreground max-w-sm mx-auto">
              {debouncedSearch
                ? "Try adjusting your search terms."
                : activeFolderId
                  ? "Move some bars into this folder to organize your work."
                  : "Use the Quick Drop above to stash your first bar, snippet, or verse."}
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {bars.map((bar) => (
                <VaultBarCard
                  key={bar.id}
                  bar={bar}
                  onEdit={handleEdit}
                  onDelete={handleDeleteBar}
                  onAddToSongBuilder={handleAddToSongBuilder}
                  onReleaseToFloor={handleReleaseToFloor}
                  onAttachBeat={handleAttachBeat}
                />
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-6">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-1.5 text-sm rounded-lg text-muted-foreground hover:text-foreground hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  Previous
                </button>
                <span className="text-sm text-muted-foreground px-2">
                  Page {page} of {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-3 py-1.5 text-sm rounded-lg text-muted-foreground hover:text-foreground hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
