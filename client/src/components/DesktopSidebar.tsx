import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import {
  ChevronLeft,
  ChevronRight,
  FolderOpen,
  Music,
  FileText,
  Heart,
  Clock,
  Plus,
} from "lucide-react";
import { useBars } from "@/context/BarContext";
import { cn } from "@/lib/utils";

export default function DesktopSidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const [location] = useLocation();
  const { currentUser } = useBars();

  // Fetch folders
  const { data: folders } = useQuery({
    queryKey: ["/api/vault/folders"],
    queryFn: async () => {
      const res = await fetch("/api/vault/folders", { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!currentUser,
  });

  // Fetch user songs
  const { data: songs } = useQuery({
    queryKey: ["/api/songs"],
    queryFn: async () => {
      const res = await fetch("/api/songs", { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!currentUser,
  });

  // Fetch favorite beats
  const { data: favoriteBeats } = useQuery({
    queryKey: ["/api/beats/favorites"],
    queryFn: async () => {
      const res = await fetch("/api/beats/favorites", { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!currentUser,
  });

  if (!currentUser) return null;

  return (
    <div
      className={cn(
        "hidden lg:flex flex-col fixed left-0 top-20 bottom-0 z-40 transition-all duration-300 border-r border-border/20",
        collapsed ? "w-12" : "w-56",
      )}
      style={{
        background: "var(--glass-surface-bg)",
        backdropFilter: "blur(40px) saturate(180%)",
        WebkitBackdropFilter: "blur(40px) saturate(180%)",
      }}
    >
      {/* Toggle button */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-4 z-50 w-6 h-6 rounded-full bg-background border border-border/40 flex items-center justify-center hover:bg-accent/10 transition-colors"
      >
        {collapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
      </button>

      {collapsed ? (
        // Collapsed: just icons
        <div className="flex flex-col items-center gap-3 pt-6">
          <Link href="/vault">
            <div className={cn("p-2 rounded-lg transition-colors", location === "/vault" ? "bg-accent/20 text-accent" : "text-muted-foreground hover:text-foreground hover:bg-white/5")}>
              <FolderOpen size={16} />
            </div>
          </Link>
          <Link href="/song-builder">
            <div className={cn("p-2 rounded-lg transition-colors", location.startsWith("/song-builder") ? "bg-accent/20 text-accent" : "text-muted-foreground hover:text-foreground hover:bg-white/5")}>
              <FileText size={16} />
            </div>
          </Link>
          <Link href="/beats">
            <div className={cn("p-2 rounded-lg transition-colors", location === "/beats" ? "bg-accent/20 text-accent" : "text-muted-foreground hover:text-foreground hover:bg-white/5")}>
              <Music size={16} />
            </div>
          </Link>
        </div>
      ) : (
        // Expanded: full sidebar
        <div className="flex flex-col h-full overflow-y-auto px-3 py-4 space-y-5">
          {/* Folders section */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60">
                Folders
              </span>
              <Link href="/vault">
                <Plus size={12} className="text-muted-foreground hover:text-accent cursor-pointer" />
              </Link>
            </div>
            <div className="space-y-0.5">
              {(folders || []).slice(0, 8).map((folder: any) => (
                <Link key={folder.id} href={`/vault?folder=${folder.id}`}>
                  <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors cursor-pointer">
                    <FolderOpen size={13} className="flex-shrink-0 text-accent/60" />
                    <span className="truncate">{folder.name}</span>
                    <span className="ml-auto text-[10px] text-muted-foreground/50">{folder.barCount}</span>
                  </div>
                </Link>
              ))}
              {(!folders || folders.length === 0) && (
                <p className="text-xs text-muted-foreground/40 px-2 py-1">No folders yet</p>
              )}
            </div>
          </div>

          {/* Songs section */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60">
                My Songs
              </span>
              <Link href="/song-builder">
                <Plus size={12} className="text-muted-foreground hover:text-accent cursor-pointer" />
              </Link>
            </div>
            <div className="space-y-0.5">
              {(songs || []).slice(0, 6).map((song: any) => (
                <Link key={song.id} href={`/song-builder/${song.id}`}>
                  <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors cursor-pointer">
                    <FileText size={13} className="flex-shrink-0 text-accent/60" />
                    <span className="truncate">{song.title}</span>
                    {song.status === "draft" && (
                      <span className="ml-auto text-[9px] px-1 py-0.5 rounded bg-white/5 text-muted-foreground/50">
                        draft
                      </span>
                    )}
                  </div>
                </Link>
              ))}
              {(!songs || songs.length === 0) && (
                <p className="text-xs text-muted-foreground/40 px-2 py-1">No songs yet</p>
              )}
            </div>
          </div>

          {/* Favorite Beats section */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60">
                Fav Beats
              </span>
              <Heart size={12} className="text-muted-foreground/40" />
            </div>
            <div className="space-y-0.5">
              {(favoriteBeats || []).slice(0, 6).map((beat: any) => (
                <Link key={beat.id} href="/beats">
                  <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors cursor-pointer">
                    <Music size={13} className="flex-shrink-0 text-accent/60" />
                    <span className="truncate">{beat.title}</span>
                    {beat.bpm && (
                      <span className="ml-auto text-[9px] text-muted-foreground/40 font-mono">
                        {beat.bpm}
                      </span>
                    )}
                  </div>
                </Link>
              ))}
              {(!favoriteBeats || favoriteBeats.length === 0) && (
                <p className="text-xs text-muted-foreground/40 px-2 py-1">No favorites yet</p>
              )}
            </div>
          </div>

          {/* Recent activity */}
          <div className="mt-auto pt-4 border-t border-border/20">
            <div className="flex items-center gap-2 px-2 py-1.5 text-xs text-muted-foreground/50">
              <Clock size={11} />
              <span>Quick access sidebar</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
