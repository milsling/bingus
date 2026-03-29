import { useState, useEffect, useCallback, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRoute, useLocation } from "wouter";
import {
  Music,
  Plus,
  Trash2,
  ArrowLeft,
  Play,
  Pause,
  ChevronDown,
  FileDown,
  Link2,
  Search,
  X,
  GripVertical,
  Pencil,
  Check,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { formatDistanceToNow } from "date-fns";
import { useAudioPlayer } from "@/context/AudioPlayerContext";
import { useBars } from "@/context/BarContext";
import { WaveformVisualizer } from "@/components/WaveformVisualizer";
import { formatTime } from "@/lib/waveform";
import type { Song, SongSection, SongWithSections, BeatWithProducer } from "@shared/schema";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function countSyllables(text: string): number {
  const words = text.trim().toLowerCase().split(/\s+/).filter(Boolean);
  let total = 0;
  for (const word of words) {
    const clean = word.replace(/[^a-z]/g, "");
    if (!clean) continue;
    // Count vowel groups as a rough syllable estimate
    const groups = clean.match(/[aeiouy]+/g);
    let count = groups ? groups.length : 1;
    // Trailing silent-e
    if (clean.endsWith("e") && count > 1) count--;
    total += Math.max(count, 1);
  }
  return total;
}

function countBars(text: string): number {
  return text.split("\n").filter((line) => line.trim().length > 0).length;
}

const SECTION_TYPES = [
  { value: "intro", label: "Intro", color: "bg-sky-500/20 text-sky-300" },
  { value: "verse", label: "Verse", color: "bg-violet-500/20 text-violet-300" },
  { value: "hook", label: "Hook", color: "bg-amber-500/20 text-amber-300" },
  { value: "bridge", label: "Bridge", color: "bg-emerald-500/20 text-emerald-300" },
  { value: "outro", label: "Outro", color: "bg-rose-500/20 text-rose-300" },
  { value: "ad_lib", label: "Ad-lib", color: "bg-fuchsia-500/20 text-fuchsia-300" },
] as const;

function sectionMeta(type: string) {
  return SECTION_TYPES.find((s) => s.value === type) ?? SECTION_TYPES[1];
}

// ---------------------------------------------------------------------------
// Song List View
// ---------------------------------------------------------------------------

function SongListView() {
  const [, navigate] = useLocation();
  const { currentUser: user } = useBars();
  const queryClient = useQueryClient();

  const { data: songs = [], isLoading } = useQuery<Song[]>({
    queryKey: ["songs"],
    queryFn: async () => {
      const res = await fetch("/api/songs", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load songs");
      return res.json();
    },
    enabled: !!user,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/songs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ title: "Untitled Song" }),
      });
      if (!res.ok) throw new Error("Failed to create song");
      return res.json() as Promise<Song>;
    },
    onSuccess: (song) => {
      queryClient.invalidateQueries({ queryKey: ["songs"] });
      navigate(`/song-builder/${song.id}`);
    },
  });

  if (!user) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="glass-card rounded-2xl p-8 text-center max-w-sm">
          <Music className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground mb-4">Log in to start building songs</p>
          <button
            onClick={() => navigate("/auth")}
            className="glass-button rounded-full px-6 py-2 text-sm font-medium"
          >
            Log In
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Music className="h-7 w-7 text-primary" />
          <h1
            className="text-2xl font-bold"
            style={{ fontFamily: "var(--font-logo)" }}
          >
            Song Builder
          </h1>
        </div>
        <button
          onClick={() => createMutation.mutate()}
          disabled={createMutation.isPending}
          className="glass-button rounded-full px-5 py-2.5 text-sm font-medium flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          New Song
        </button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="glass-card rounded-2xl h-36 animate-pulse"
            />
          ))}
        </div>
      ) : songs.length === 0 ? (
        <div className="glass-card rounded-2xl p-12 text-center">
          <Music className="h-10 w-10 mx-auto mb-3 text-muted-foreground opacity-50" />
          <p className="text-muted-foreground">No songs yet</p>
          <p className="text-xs text-muted-foreground mt-1">
            Create your first song to get started
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <AnimatePresence>
            {songs.map((song, i) => (
              <motion.div
                key={song.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ delay: i * 0.04 }}
              >
                <div
                  className="glass-card rounded-2xl p-5 cursor-pointer hover:scale-[1.02] transition-transform"
                  onClick={() => navigate(`/song-builder/${song.id}`)}
                >
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="font-semibold truncate pr-2">
                      {song.title || "Untitled"}
                    </h3>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-medium shrink-0 ${
                        song.status === "released"
                          ? "bg-emerald-500/20 text-emerald-300"
                          : "bg-white/10 text-muted-foreground"
                      }`}
                    >
                      {song.status === "released" ? "Released" : "Draft"}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground space-y-1">
                    {song.beatId && (
                      <p className="flex items-center gap-1">
                        <Link2 className="h-3 w-3" />
                        Beat attached
                      </p>
                    )}
                    <p>
                      Updated{" "}
                      {formatDistanceToNow(new Date(song.updatedAt), {
                        addSuffix: true,
                      })}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Attach Beat Modal
// ---------------------------------------------------------------------------

function AttachBeatModal({
  onSelect,
  onClose,
}: {
  onSelect: (beatId: string) => void;
  onClose: () => void;
}) {
  const { data, isLoading } = useQuery<{ beats: BeatWithProducer[]; total: number }>({
    queryKey: ["beats", "attach-picker"],
    queryFn: async () => {
      const res = await fetch("/api/beats?limit=10", {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to load beats");
      return res.json();
    },
  });
  const beats = data?.beats ?? [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="glass-card rounded-2xl p-6 relative z-10 w-full max-w-md max-h-[70vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-lg">Attach a Beat</h3>
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-white/10 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-14 glass-surface rounded-xl animate-pulse" />
            ))}
          </div>
        ) : beats.length === 0 ? (
          <p className="text-center text-muted-foreground py-8 text-sm">
            No beats available
          </p>
        ) : (
          <div className="space-y-2">
            {beats.map((beat) => (
              <button
                key={beat.id}
                onClick={() => {
                  onSelect(beat.id);
                  onClose();
                }}
                className="w-full text-left glass-surface rounded-xl p-3 hover:bg-white/10 transition-colors flex items-center gap-3"
              >
                {beat.coverArtUrl ? (
                  <img
                    src={beat.coverArtUrl}
                    alt=""
                    className="h-10 w-10 rounded-lg object-cover"
                  />
                ) : (
                  <div className="h-10 w-10 rounded-lg bg-white/5 flex items-center justify-center">
                    <Music className="h-4 w-4 text-muted-foreground" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{beat.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {beat.producer?.username}
                    {beat.bpm ? ` \u00B7 ${beat.bpm} BPM` : ""}
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Section Add Dropdown
// ---------------------------------------------------------------------------

function AddSectionDropdown({
  onAdd,
}: {
  onAdd: (type: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div ref={ref} className="relative flex justify-center py-2">
      <button
        onClick={() => setOpen(!open)}
        className="glass-surface rounded-full p-1.5 hover:bg-white/10 transition-colors"
        title="Add section"
      >
        <Plus className="h-4 w-4 text-muted-foreground" />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="absolute top-full mt-1 z-20 glass-card rounded-xl p-1.5 min-w-[140px]"
          >
            {SECTION_TYPES.map((s) => (
              <button
                key={s.value}
                onClick={() => {
                  onAdd(s.value);
                  setOpen(false);
                }}
                className="w-full text-left text-sm px-3 py-1.5 rounded-lg hover:bg-white/10 transition-colors flex items-center gap-2"
              >
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${s.color}`}>
                  {s.label}
                </span>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Single Section Editor
// ---------------------------------------------------------------------------

function SectionEditor({
  section,
  songId,
  onDelete,
}: {
  section: SongSection;
  songId: string;
  onDelete: () => void;
}) {
  const queryClient = useQueryClient();
  const [content, setContent] = useState(section.content);
  const [label, setLabel] = useState(section.label ?? "");
  const [editingLabel, setEditingLabel] = useState(false);
  const saveTimeout = useRef<NodeJS.Timeout | null>(null);

  // Reset local state when section changes from server
  useEffect(() => {
    setContent(section.content);
    setLabel(section.label ?? "");
  }, [section.content, section.label]);

  const updateMutation = useMutation({
    mutationFn: async (data: { content?: string; label?: string; type?: string }) => {
      const res = await fetch(`/api/songs/${songId}/sections/${section.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update section");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["song", songId] });
    },
  });

  const handleContentChange = (value: string) => {
    setContent(value);
    if (saveTimeout.current) clearTimeout(saveTimeout.current);
    saveTimeout.current = setTimeout(() => {
      updateMutation.mutate({ content: value });
    }, 800);
  };

  const handleLabelSave = () => {
    setEditingLabel(false);
    updateMutation.mutate({ label });
  };

  const meta = sectionMeta(section.type);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="glass-card rounded-2xl p-4"
    >
      {/* Section header */}
      <div className="flex items-center gap-2 mb-3">
        <GripVertical className="h-4 w-4 text-muted-foreground/40 cursor-grab" />
        <span
          className={`text-[11px] px-2 py-0.5 rounded-full font-semibold ${meta.color}`}
        >
          {meta.label}
        </span>

        {editingLabel ? (
          <div className="flex items-center gap-1 flex-1">
            <input
              autoFocus
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleLabelSave()}
              className="glass-field text-sm rounded-lg px-2 py-0.5 flex-1"
              placeholder="Section label..."
            />
            <button
              onClick={handleLabelSave}
              className="p-1 rounded-md hover:bg-white/10"
            >
              <Check className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => setEditingLabel(true)}
            className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
          >
            {label || "Add label"}
            <Pencil className="h-3 w-3" />
          </button>
        )}

        <div className="ml-auto">
          <button
            onClick={onDelete}
            className="p-1.5 rounded-lg hover:bg-red-500/20 text-muted-foreground hover:text-red-400 transition-colors"
            title="Delete section"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Lyrics textarea */}
      <textarea
        value={content}
        onChange={(e) => handleContentChange(e.target.value)}
        placeholder="Write your bars here..."
        className="glass-field w-full rounded-xl p-3 text-sm leading-relaxed resize-none min-h-[120px] font-mono"
        rows={6}
      />

      {/* Counters */}
      <div className="flex items-center gap-4 mt-2 text-[11px] text-muted-foreground">
        <span>{countWords(content)} words</span>
        <span>{countSyllables(content)} syllables</span>
        <span>{countBars(content)} bars</span>
        {updateMutation.isPending && (
          <span className="ml-auto text-primary/60">Saving...</span>
        )}
      </div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Vault Sidebar
// ---------------------------------------------------------------------------

function VaultSidebar({
  onInsert,
}: {
  onInsert: (content: string) => void;
}) {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const { data: vaultBars = [], isLoading } = useQuery<
    { id: string; content: string; category: string }[]
  >({
    queryKey: ["vault-bars", debouncedSearch],
    queryFn: async () => {
      const params = new URLSearchParams({ limit: "20" });
      if (debouncedSearch) params.set("search", debouncedSearch);
      const res = await fetch(`/api/vault/bars?${params}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to search vault");
      return res.json();
    },
  });

  return (
    <div className="glass-card rounded-2xl p-4 h-fit sticky top-28">
      <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
        <Search className="h-4 w-4 text-primary" />
        From Vault
      </h3>
      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search your bars..."
        className="glass-field w-full rounded-lg px-3 py-2 text-sm mb-3"
      />

      <div className="space-y-2 max-h-[50vh] overflow-y-auto">
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-12 glass-surface rounded-lg animate-pulse" />
            ))}
          </div>
        ) : vaultBars.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">
            {search ? "No bars found" : "Your vault is empty"}
          </p>
        ) : (
          vaultBars.map((bar) => (
            <button
              key={bar.id}
              onClick={() => onInsert(bar.content)}
              className="w-full text-left glass-surface rounded-lg p-2.5 text-xs hover:bg-white/10 transition-colors leading-relaxed"
              title="Click to append to active section"
            >
              <span className="line-clamp-2">{bar.content}</span>
            </button>
          ))
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Song Editor View
// ---------------------------------------------------------------------------

function SongEditorView({ songId }: { songId: string }) {
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const audioPlayer = useAudioPlayer();

  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState("");
  const [showBeatModal, setShowBeatModal] = useState(false);
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null);

  const {
    data: song,
    isLoading,
    error,
  } = useQuery<SongWithSections>({
    queryKey: ["song", songId],
    queryFn: async () => {
      const res = await fetch(`/api/songs/${songId}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to load song");
      return res.json();
    },
  });

  // Keep title draft in sync
  useEffect(() => {
    if (song) setTitleDraft(song.title);
  }, [song?.title]);

  // Set first section as active by default
  useEffect(() => {
    if (song?.sections?.length && !activeSectionId) {
      setActiveSectionId(song.sections[0].id);
    }
  }, [song?.sections, activeSectionId]);

  // --- Mutations ---

  const updateSongMutation = useMutation({
    mutationFn: async (data: { title?: string; beatId?: string; status?: string }) => {
      const res = await fetch(`/api/songs/${songId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update song");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["song", songId] });
      queryClient.invalidateQueries({ queryKey: ["songs"] });
    },
  });

  const deleteSongMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/songs/${songId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to delete song");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["songs"] });
      navigate("/song-builder");
    },
  });

  const addSectionMutation = useMutation({
    mutationFn: async (type: string) => {
      const meta = sectionMeta(type);
      const sectionCount =
        (song?.sections?.filter((s) => s.type === type).length ?? 0) + 1;
      const res = await fetch(`/api/songs/${songId}/sections`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          type,
          label: `${meta.label} ${sectionCount}`,
          content: "",
        }),
      });
      if (!res.ok) throw new Error("Failed to add section");
      return res.json() as Promise<SongSection>;
    },
    onSuccess: (section) => {
      queryClient.invalidateQueries({ queryKey: ["song", songId] });
      setActiveSectionId(section.id);
    },
  });

  const deleteSectionMutation = useMutation({
    mutationFn: async (sectionId: string) => {
      const res = await fetch(`/api/songs/${songId}/sections/${sectionId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to delete section");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["song", songId] });
    },
  });

  // --- Handlers ---

  const handleTitleSave = () => {
    setEditingTitle(false);
    if (titleDraft.trim() && titleDraft !== song?.title) {
      updateSongMutation.mutate({ title: titleDraft.trim() });
    }
  };

  const handleAttachBeat = (beatId: string) => {
    updateSongMutation.mutate({ beatId });
  };

  const handleDetachBeat = () => {
    updateSongMutation.mutate({ beatId: "" });
  };

  const handleExportTxt = () => {
    if (!song) return;
    const lines: string[] = [`# ${song.title}`, ""];
    const sections = [...(song.sections ?? [])].sort(
      (a, b) => a.position - b.position
    );
    for (const section of sections) {
      const meta = sectionMeta(section.type);
      lines.push(`[${section.label || meta.label}]`);
      lines.push(section.content);
      lines.push("");
    }
    const blob = new Blob([lines.join("\n")], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${song.title || "song"}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleVaultInsert = (content: string) => {
    if (!activeSectionId || !song) return;
    const section = song.sections?.find((s) => s.id === activeSectionId);
    if (!section) return;
    const newContent = section.content
      ? section.content + "\n" + content
      : content;
    // Optimistic: update through section mutation will happen via SectionEditor
    // We directly PATCH here to reflect immediately
    fetch(`/api/songs/${songId}/sections/${activeSectionId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ content: newContent }),
    }).then(() => {
      queryClient.invalidateQueries({ queryKey: ["song", songId] });
    });
  };

  // --- Beat player state ---
  const beat = song?.beat;
  const isBeatPlaying =
    audioPlayer.isPlaying && audioPlayer.currentBeat?.id === beat?.id;
  const beatProgress =
    audioPlayer.currentBeat?.id === beat?.id && audioPlayer.duration > 0
      ? audioPlayer.currentTime / audioPlayer.duration
      : 0;

  const toggleBeatPlay = () => {
    if (!beat) return;
    if (isBeatPlaying) {
      audioPlayer.pause();
    } else if (audioPlayer.currentBeat?.id === beat.id) {
      audioPlayer.resume();
    } else {
      audioPlayer.playBeat(beat);
    }
  };

  // --- Loading / Error states ---

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="glass-card rounded-2xl h-16 animate-pulse" />
        <div className="glass-card rounded-2xl h-48 animate-pulse" />
        <div className="glass-card rounded-2xl h-48 animate-pulse" />
      </div>
    );
  }

  if (error || !song) {
    return (
      <div className="glass-card rounded-2xl p-8 text-center">
        <p className="text-muted-foreground mb-4">
          {error ? "Failed to load song" : "Song not found"}
        </p>
        <button
          onClick={() => navigate("/song-builder")}
          className="glass-button rounded-full px-5 py-2 text-sm font-medium"
        >
          Back to Songs
        </button>
      </div>
    );
  }

  const sortedSections = [...(song.sections ?? [])].sort(
    (a, b) => a.position - b.position
  );

  return (
    <div>
      {/* Top bar */}
      <div className="glass-card rounded-2xl p-4 mb-4">
        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={() => navigate("/song-builder")}
            className="p-2 rounded-xl hover:bg-white/10 transition-colors shrink-0"
            title="Back to Songs"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>

          {/* Editable title */}
          {editingTitle ? (
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <input
                autoFocus
                value={titleDraft}
                onChange={(e) => setTitleDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleTitleSave();
                  if (e.key === "Escape") {
                    setEditingTitle(false);
                    setTitleDraft(song.title);
                  }
                }}
                className="glass-field text-lg font-bold rounded-lg px-3 py-1 flex-1"
              />
              <button
                onClick={handleTitleSave}
                className="p-1.5 rounded-lg hover:bg-white/10"
              >
                <Check className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setEditingTitle(true)}
              className="text-lg font-bold flex items-center gap-2 hover:text-primary transition-colors min-w-0"
              style={{ fontFamily: "var(--font-logo)" }}
            >
              <span className="truncate">{song.title}</span>
              <Pencil className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            </button>
          )}

          <div className="ml-auto flex items-center gap-2 shrink-0">
            {beat ? (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Music className="h-3.5 w-3.5" />
                <span className="truncate max-w-[120px]">{beat.title}</span>
                <button
                  onClick={handleDetachBeat}
                  className="p-1 rounded hover:bg-red-500/20 hover:text-red-400 transition-colors"
                  title="Detach beat"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowBeatModal(true)}
                className="glass-surface rounded-full px-3 py-1.5 text-xs font-medium flex items-center gap-1.5 hover:bg-white/10 transition-colors"
              >
                <Link2 className="h-3.5 w-3.5" />
                Attach Beat
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Beat player */}
      {beat && (
        <div className="glass-card rounded-2xl p-4 mb-4">
          <div className="flex items-center gap-3">
            <button
              onClick={toggleBeatPlay}
              className="glass-button rounded-full p-2.5 shrink-0"
            >
              {isBeatPlaying ? (
                <Pause className="h-4 w-4" />
              ) : (
                <Play className="h-4 w-4 ml-0.5" />
              )}
            </button>
            <div className="flex-1 min-w-0">
              <WaveformVisualizer
                peaks={(beat.waveformData as number[]) ?? []}
                analyser={isBeatPlaying ? audioPlayer.analyserNode : null}
                progress={beatProgress}
                isPlaying={isBeatPlaying}
                onSeek={(p) => {
                  if (audioPlayer.currentBeat?.id === beat.id) {
                    audioPlayer.seek(p * audioPlayer.duration);
                  }
                }}
                height={40}
                variant="full"
              />
            </div>
            <div className="text-xs text-muted-foreground shrink-0 text-right">
              {audioPlayer.currentBeat?.id === beat.id
                ? formatTime(audioPlayer.currentTime)
                : "0:00"}
              {beat.duration ? ` / ${formatTime(beat.duration)}` : ""}
              {beat.bpm && (
                <span className="block text-[10px]">{beat.bpm} BPM</span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Main canvas area */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-4">
        {/* Section canvas */}
        <div>
          {sortedSections.length === 0 ? (
            <div className="glass-card rounded-2xl p-8 text-center">
              <p className="text-muted-foreground mb-3 text-sm">
                No sections yet. Add your first one.
              </p>
              <AddSectionDropdown onAdd={(type) => addSectionMutation.mutate(type)} />
            </div>
          ) : (
            <div className="space-y-1">
              <AddSectionDropdown
                onAdd={(type) => addSectionMutation.mutate(type)}
              />
              <AnimatePresence>
                {sortedSections.map((section) => (
                  <div
                    key={section.id}
                    onClick={() => setActiveSectionId(section.id)}
                  >
                    <div
                      className={`rounded-2xl transition-all ${
                        activeSectionId === section.id
                          ? "ring-1 ring-primary/30"
                          : ""
                      }`}
                    >
                      <SectionEditor
                        section={section}
                        songId={songId}
                        onDelete={() => deleteSectionMutation.mutate(section.id)}
                      />
                    </div>
                    <AddSectionDropdown
                      onAdd={(type) => addSectionMutation.mutate(type)}
                    />
                  </div>
                ))}
              </AnimatePresence>
            </div>
          )}

          {/* Bottom actions */}
          <div className="flex items-center justify-between mt-6 gap-3 flex-wrap">
            <button
              onClick={handleExportTxt}
              className="glass-surface rounded-full px-4 py-2 text-sm font-medium flex items-center gap-2 hover:bg-white/10 transition-colors"
            >
              <FileDown className="h-4 w-4" />
              Export as .txt
            </button>
            <button
              onClick={() => {
                if (confirm("Delete this song? This cannot be undone.")) {
                  deleteSongMutation.mutate();
                }
              }}
              className="text-xs text-muted-foreground hover:text-red-400 transition-colors px-3 py-2"
            >
              Delete Song
            </button>
          </div>
        </div>

        {/* Right sidebar - vault (desktop only) */}
        <div className="hidden lg:block">
          <VaultSidebar onInsert={handleVaultInsert} />
        </div>
      </div>

      {/* Attach beat modal */}
      <AnimatePresence>
        {showBeatModal && (
          <AttachBeatModal
            onSelect={handleAttachBeat}
            onClose={() => setShowBeatModal(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Page Component
// ---------------------------------------------------------------------------

export default function SongBuilder() {
  const [match, params] = useRoute("/song-builder/:id");

  return (
    <div className="min-h-screen bg-background pt-14 pb-24 md:pb-4 md:pt-24">
      <div className="container mx-auto max-w-7xl p-4">
        {match && params?.id ? (
          <SongEditorView songId={params.id} />
        ) : (
          <SongListView />
        )}
      </div>
    </div>
  );
}
