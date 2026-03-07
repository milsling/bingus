import { useCallback, useState } from "react";
import { Link, useLocation } from "wouter";
import { Home, User, Plus, LogIn, Shield, Bookmark, MessageCircle, Users, PenLine, Menu, LogOut, Compass, Swords, NotebookPen, Settings2, DoorOpen, Radio, Sparkles, X, UserCog, ChevronRight, ExternalLink } from "lucide-react";
import AccentLogo from "@/components/AccentLogo";
import { useBars } from "@/context/BarContext";
import { NotificationBell } from "@/components/NotificationBell";
import { SearchBar } from "@/components/SearchBar";
import { OnlineStatusIndicator } from "@/components/OnlineStatus";
import { useUnreadMessagesCount, usePendingFriendRequestsCount } from "@/components/UnreadMessagesBadge";
import { cn } from "@/lib/utils";
import { NewMessageDialog } from "@/components/NewMessageDialog";
import { FloatingActionButton } from "@/components/FloatingActionButton";
import AIAssistant from "@/components/AIAssistant";
import { useTheme } from "@/contexts/ThemeContext";
import { useFabShortcuts, type ShortcutTarget } from "@/hooks/useFabShortcuts";
import ThumbNavigation from "@/components/ThumbNavigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export default function Navigation() {
  const [location, setLocation] = useLocation();
  const { currentUser, logout } = useBars();
  const { theme, setTheme } = useTheme();
  const unreadCount = useUnreadMessagesCount();
  const pendingFriendRequests = usePendingFriendRequestsCount();
  const [newMessageOpen, setNewMessageOpen] = useState(false);
  const [araOpen, setAraOpen] = useState(false);
  const [desktopMenuOpen, setDesktopMenuOpen] = useState(false);
  const { leftTarget, rightTarget } = useFabShortcuts();
  
  const isOnMessagesPage = location.startsWith("/messages");

  const handleLogout = async () => {
    await logout();
    setLocation("/");
  };

  const executeShortcut = useCallback((target: ShortcutTarget) => {
    if (!currentUser) {
      setLocation("/auth");
      return;
    }
    switch (target) {
      case "messages":
        if (isOnMessagesPage) setNewMessageOpen(true);
        else setLocation("/messages");
        break;
      case "ai-assistant":
        setAraOpen(true);
        break;
      case "profile":     setLocation("/profile"); break;
      case "friends":     setLocation("/friends"); break;
      case "saved":       setLocation("/saved"); break;
      case "prompts":     setLocation("/prompts"); break;
      case "challenges":  setLocation("/challenges"); break;
      case "orphanage":   setLocation("/orphanage"); break;
      case "orphanstudio": setLocation("/orphanstudio"); break;
    }
  }, [currentUser, isOnMessagesPage, setLocation]);

  const navLinks = [
    { href: "/", label: "Feed", icon: Home },
    { href: "/prompts", label: "Prompts", icon: PenLine },
    { href: "/challenges", label: "Challenges", icon: Swords },
    { href: "/orphanstudio", label: "Studio", icon: NotebookPen },
  ];

  return (
    <>
      <div className="hidden md:block">
        <FloatingActionButton
          onDropABar={() => setLocation(currentUser ? "/post" : "/auth")}
          onSwipeLeft={() => executeShortcut(leftTarget)}
          onSwipeRight={() => executeShortcut(rightTarget)}
          onLongPress={() => {
            if ("vibrate" in navigator) navigator.vibrate([12, 50, 8, 50, 12]);
            setAraOpen(true);
          }}
        />
      </div>
      
      {/* Desktop Floating Top Bar */}
      <header className="hidden md:flex fixed top-4 left-4 right-4 h-14 z-50 items-center justify-between px-3 rounded-[28px] border border-white/25 dark:border-white/10 floating-bar top-bar overflow-visible gap-3 shadow-[0_18px_48px_rgba(0,0,0,0.16)] backdrop-brightness-110 backdrop-saturate-150">
        
        {/* Left: Logo + inline nav links */}
        <div className="flex items-center gap-1 shrink-0">
          <Link href="/">
            <div className="flex items-center gap-2 cursor-pointer group px-2 py-1.5 rounded-xl hover:bg-foreground/[0.05] transition-colors">
              <div className="relative">
                <AccentLogo className="h-7 w-7 transition-transform duration-200 group-hover:scale-110" />
                <div className="absolute inset-0 bg-primary/20 rounded-lg blur-sm opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <span className="font-logo text-sm leading-none text-foreground flex items-center gap-0.5 group-hover:text-primary transition-colors">
                <span>ORPHAN</span>
                <span>BARS</span>
              </span>
            </div>
          </Link>

          {/* Divider */}
          <div className="w-px h-5 bg-border/30 mx-1" />

          {/* Inline nav links — hide on smaller desktops */}
          <nav className="hidden lg:flex items-center gap-0.5">
            {navLinks.map(({ href, label, icon: Icon }) => {
              const isActive = location === href;
              return (
                <Link key={href} href={href}>
                  <button
                    type="button"
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium transition-all duration-150",
                      isActive
                        ? "bg-primary/15 text-primary"
                        : "text-foreground/60 hover:text-foreground hover:bg-foreground/[0.05]"
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    <span>{label}</span>
                  </button>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Center: Search bar — expands to fill available space */}
        <div className="flex-1 min-w-0 max-w-2xl">
          <SearchBar className="w-full" />
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-1 shrink-0">
          {currentUser ? (
            <>
              {isOnMessagesPage ? (
                <button
                  onClick={() => setNewMessageOpen(true)}
                  className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-primary text-white font-medium text-sm transition-all hover:bg-primary/90 active:scale-95"
                  data-testid="button-new-message"
                >
                  <PenLine className="h-4 w-4" />
                  <span className="hidden xl:inline">New Message</span>
                </button>
              ) : (
                <Link href="/post">
                  <button className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-primary text-white font-medium text-sm transition-all hover:bg-primary/90 active:scale-95">
                    <Plus className="h-4 w-4" />
                    <span>Drop Bar</span>
                  </button>
                </Link>
              )}
              <NotificationBell />
              <OnlineStatusIndicator />
              {/* User avatar chip → opens desktop menu panel */}
              <button
                type="button"
                onClick={() => setDesktopMenuOpen(true)}
                className="flex items-center gap-2 pl-1 pr-2.5 py-1 rounded-xl hover:bg-foreground/[0.06] transition-colors"
                data-testid="button-desktop-user"
              >
                <Avatar className="h-7 w-7 rounded-lg ring-1 ring-primary/20">
                  <AvatarImage src={currentUser.avatarUrl || undefined} alt={currentUser.username} />
                  <AvatarFallback className="rounded-lg bg-gradient-to-br from-primary/30 to-primary/10 text-primary font-bold text-xs">
                    {currentUser.username[0]?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="hidden xl:block text-sm font-medium text-foreground/80 max-w-[100px] truncate">
                  {currentUser.displayName || currentUser.username}
                </span>
                <Menu className="h-4 w-4 text-foreground/50" />
              </button>
            </>
          ) : (
            <>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="p-2 rounded-xl hover:bg-foreground/[0.06] transition-colors text-foreground/80"
                    aria-label="Open settings"
                    data-testid="button-desktop-settings"
                  >
                    <Settings2 className="h-5 w-5" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuItem asChild>
                    <Link href="/changelog" className="flex items-center gap-2 cursor-pointer">
                      <Sparkles className="h-4 w-4" />
                      <span>What's New</span>
                    </Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Link href="/auth">
                <button className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-white font-medium text-sm transition-all hover:bg-primary/90">
                  <LogIn className="h-4 w-4" />
                  <span>Login</span>
                </button>
              </Link>
            </>
          )}
        </div>
      </header>

      {/* =========================================
          Desktop Menu Panel — ThumbNavigation style
          ========================================= */}
      {desktopMenuOpen && (
        <>
          {/* Backdrop */}
          <div
            className="hidden md:block fixed inset-0 z-[9997] bg-black/20 backdrop-blur-sm transition-opacity"
            onClick={() => setDesktopMenuOpen(false)}
          />
          {/* Panel */}
          <div className="hidden md:flex fixed top-0 right-0 h-full w-[380px] z-[9998] flex-col glass-sheet border-l border-border/20 shadow-2xl"
            style={{ animation: 'slideInRight 0.25s cubic-bezier(0.22, 1, 0.36, 1) forwards' }}
          >
            {/* Header */}
            <div className="relative flex items-center justify-between px-5 pt-5 pb-4">
              <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-primary/[0.07] to-transparent pointer-events-none rounded-tl-none" />
              <div className="relative flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary/25 to-primary/10 flex items-center justify-center ring-1 ring-primary/20">
                  <AccentLogo className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="font-logo text-lg leading-none tracking-wide">ORPHANBARS</h2>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Navigate your world</p>
                </div>
              </div>
              <button
                onClick={() => setDesktopMenuOpen(false)}
                className="relative p-2 rounded-xl hover:bg-foreground/[0.06] transition-colors"
              >
                <X className="h-5 w-5 text-foreground/70" />
              </button>
            </div>

            {/* Profile Card */}
            {currentUser && (
              <div className="px-4 pb-4">
                <Link
                  href={`/u/${currentUser.username}`}
                  className="group flex items-center gap-3 p-3 rounded-2xl transition-all duration-200 hover:bg-primary/[0.06] border border-transparent hover:border-primary/15"
                  onClick={() => setDesktopMenuOpen(false)}
                >
                  <div className="relative shrink-0">
                    <Avatar className="h-12 w-12 rounded-full ring-2 ring-primary/20 ring-offset-1 ring-offset-background">
                      <AvatarImage src={currentUser.avatarUrl || undefined} alt={currentUser.username} />
                      <AvatarFallback className="bg-gradient-to-br from-primary/30 via-primary/20 to-purple-500/15 text-primary font-bold text-lg">
                        {currentUser.username[0]?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full bg-emerald-500 border-2 border-background" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm group-hover:text-primary transition-colors truncate">
                      {currentUser.displayName || currentUser.username}
                    </div>
                    <div className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-1.5">
                      <span className="truncate">@{currentUser.username}</span>
                      {currentUser.isOwner && (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-orange-500/15 text-orange-400 ring-1 ring-orange-500/20">Owner</span>
                      )}
                      {currentUser.isAdminPlus && !currentUser.isOwner && (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-purple-500/15 text-purple-400 ring-1 ring-purple-500/20">Admin+</span>
                      )}
                      {currentUser.isAdmin && !currentUser.isAdminPlus && !currentUser.isOwner && (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-primary/15 text-primary ring-1 ring-primary/20">Admin</span>
                      )}
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground/50 group-hover:text-primary/70 transition-colors shrink-0" />
                </Link>
              </div>
            )}

            {/* Menu Sections */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden px-4 pb-4 space-y-5">
              {/* Explore Section */}
              <div>
                <div className="flex items-center gap-2 px-1 mb-2">
                  <Compass className="h-3.5 w-3.5 text-primary/60" />
                  <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground/70">Explore</span>
                  <div className="flex-1 h-px bg-gradient-to-r from-border/30 to-transparent" />
                </div>
                <div className="space-y-1">
                  {[
                    { href: "/", label: "Home", icon: Home, description: "Your feed" },
                    { href: "/prompts", label: "Prompts", icon: PenLine, description: "Get inspired" },
                    { href: "/orphanstudio", label: "Orphan Studio", icon: NotebookPen, description: "Create & mix" },
                    { href: "/challenges", label: "Challenges", icon: Swords, description: "Compete" },
                  ].map((item) => {
                    const isActive = location === item.href;
                    return (
                      <Link key={item.label} href={item.href} className="block" onClick={() => setDesktopMenuOpen(false)}>
                        <div className={cn(
                          "group relative flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-150",
                          isActive
                            ? "bg-primary/[0.12] border border-primary/25 shadow-[0_0_20px_rgba(168,85,247,0.08)]"
                            : "border border-transparent hover:bg-foreground/[0.04] hover:border-border/20"
                        )}>
                          <div className={cn(
                            "shrink-0 h-9 w-9 rounded-xl flex items-center justify-center transition-all duration-200",
                            isActive
                              ? "bg-primary text-white shadow-[0_4px_12px_rgba(168,85,247,0.3)]"
                              : "bg-foreground/[0.05] text-muted-foreground group-hover:bg-foreground/[0.08] group-hover:text-foreground"
                          )}>
                            <item.icon className="h-4 w-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className={cn("text-sm font-medium leading-tight", isActive ? "text-primary" : "text-foreground")}>{item.label}</div>
                            <div className="text-[11px] text-muted-foreground/60 leading-tight mt-0.5">{item.description}</div>
                          </div>
                          <ChevronRight className={cn("h-3.5 w-3.5 shrink-0 transition-all duration-150", isActive ? "text-primary/60" : "text-muted-foreground/30 group-hover:text-muted-foreground/60 group-hover:translate-x-0.5")} />
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>

              {/* Account Section */}
              <div>
                <div className="flex items-center gap-2 px-1 mb-2">
                  <User className="h-3.5 w-3.5 text-primary/60" />
                  <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground/70">Account</span>
                  <div className="flex-1 h-px bg-gradient-to-r from-border/30 to-transparent" />
                </div>
                <div className="space-y-1">
                  {(currentUser ? [
                    { href: "/profile", label: "My Bars", icon: User, description: "Your profile" },
                    { href: "/messages", label: "Messages", icon: MessageCircle, description: "Chat", badge: unreadCount },
                    { href: "/friends", label: "Friends", icon: Users, description: "Your crew", badge: pendingFriendRequests },
                    { href: "/saved", label: "Saved", icon: Bookmark, description: "Bookmarks" },
                    { href: "/settings", label: "Settings", icon: Settings2, description: "Preferences" },
                    { href: "/changelog", label: "What's New", icon: Sparkles, description: "Latest updates" },
                  ] : [
                    { href: "/auth", label: "Sign In", icon: User, description: "Join the community" },
                  ]).map((item) => {
                    const isActive = location === item.href;
                    return (
                      <Link key={item.label} href={item.href} className="block" onClick={() => setDesktopMenuOpen(false)}>
                        <div className={cn(
                          "group relative flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-150",
                          isActive
                            ? "bg-primary/[0.12] border border-primary/25"
                            : "border border-transparent hover:bg-foreground/[0.04] hover:border-border/20"
                        )}>
                          <div className={cn(
                            "shrink-0 h-9 w-9 rounded-xl flex items-center justify-center transition-all duration-200",
                            isActive
                              ? "bg-primary text-white shadow-[0_4px_12px_rgba(168,85,247,0.3)]"
                              : "bg-foreground/[0.05] text-muted-foreground group-hover:bg-foreground/[0.08] group-hover:text-foreground"
                          )}>
                            <item.icon className="h-4 w-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className={cn("text-sm font-medium leading-tight", isActive ? "text-primary" : "text-foreground")}>{item.label}</div>
                            <div className="text-[11px] text-muted-foreground/60 leading-tight mt-0.5">{item.description}</div>
                          </div>
                          {'badge' in item && (item as any).badge > 0 && (
                            <span className="text-xs bg-primary text-white px-1.5 py-0.5 rounded-full">{(item as any).badge}</span>
                          )}
                          <ChevronRight className={cn("h-3.5 w-3.5 shrink-0 transition-all duration-150", isActive ? "text-primary/60" : "text-muted-foreground/30 group-hover:text-muted-foreground/60")} />
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>

              {/* Admin Section */}
              {(currentUser?.isAdmin || currentUser?.isAdminPlus || currentUser?.isOwner) && (
                <div>
                  <div className="flex items-center gap-2 px-1 mb-2">
                    <Shield className="h-3.5 w-3.5 text-primary/60" />
                    <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground/70">Admin</span>
                    <div className="flex-1 h-px bg-gradient-to-r from-border/30 to-transparent" />
                  </div>
                  <div className="space-y-1">
                    <Link href="/admin" className="block" onClick={() => setDesktopMenuOpen(false)}>
                      <div className={cn(
                        "group relative flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-150",
                        location === "/admin"
                          ? "bg-primary/[0.12] border border-primary/25"
                          : "border border-transparent hover:bg-foreground/[0.04] hover:border-border/20"
                      )}>
                        <div className={cn(
                          "shrink-0 h-9 w-9 rounded-xl flex items-center justify-center transition-all duration-200",
                          location === "/admin"
                            ? "bg-primary text-white"
                            : "bg-foreground/[0.05] text-muted-foreground group-hover:bg-foreground/[0.08] group-hover:text-foreground"
                        )}>
                          <Shield className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium leading-tight">Admin Panel</div>
                          <div className="text-[11px] text-muted-foreground/60 leading-tight mt-0.5">Manage site</div>
                        </div>
                        <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground/30 group-hover:text-muted-foreground/60" />
                      </div>
                    </Link>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="shrink-0">
              <div className="mx-5 h-px bg-gradient-to-r from-transparent via-border/40 to-transparent mb-3" />
              <div className="px-4 pb-5">
                {currentUser ? (
                  <button
                    onClick={() => { setDesktopMenuOpen(false); handleLogout(); }}
                    className="group flex items-center gap-3 w-full px-3 py-2.5 rounded-xl border border-transparent hover:border-red-500/15 hover:bg-red-500/[0.06] transition-all duration-200"
                  >
                    <div className="h-9 w-9 rounded-xl bg-red-500/10 text-red-400 group-hover:bg-red-500/15 transition-colors flex items-center justify-center">
                      <LogOut className="h-4 w-4" />
                    </div>
                    <span className="text-sm font-medium text-red-400">Sign Out</span>
                  </button>
                ) : (
                  <Link href="/auth" className="block" onClick={() => setDesktopMenuOpen(false)}>
                    <div className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-white font-medium text-sm transition-all hover:bg-primary/90 active:scale-[0.97]">
                      <User className="h-4 w-4" />
                      <span>Sign In</span>
                    </div>
                  </Link>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Mobile Top Bar - Slim glass bar: logo, notifications, online */}
      <div className="md:hidden fixed mobile-topbar-offset left-3 right-3 z-[1200] overflow-visible">
        <div className="floating-bar rounded-2xl h-12 flex items-center justify-between px-3 overflow-visible top-bar mobile-nav">
          <Link href="/">
            <div className="flex items-center gap-1.5 cursor-pointer min-w-0">
              <AccentLogo className="h-6 w-6" />
              <span className="font-logo text-sm leading-none text-foreground flex items-center gap-0.5 truncate">
                <span>ORPHAN</span>
                <span>BARS</span>
              </span>
            </div>
          </Link>
          <div className="flex items-center gap-1 shrink-0">
            {currentUser && <NotificationBell compact />}
            <button
              type="button"
              onClick={() => setLocation(currentUser ? "/settings" : "/auth")}
              className="h-8 px-2.5 rounded-full transition-colors flex items-center gap-1.5 shrink-0 mobile-nav-button"
              aria-label="Open settings"
              data-testid="button-mobile-settings"
            >
              <Settings2 className="h-3.5 w-3.5" />
              <span className="text-[11px] font-semibold leading-none">Settings</span>
            </button>
            <OnlineStatusIndicator compact />
          </div>
        </div>
      </div>
      
      <NewMessageDialog open={newMessageOpen} onOpenChange={setNewMessageOpen} />
      <AIAssistant open={araOpen} onOpenChange={setAraOpen} hideFloatingButton />
      
      {/* Mobile Thumb Navigation - only visible on mobile */}
      <div className="md:hidden">
        <ThumbNavigation />
      </div>
    </>
  );
}
