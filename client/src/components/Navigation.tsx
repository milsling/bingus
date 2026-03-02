import { useCallback, useState } from "react";
import { Link, useLocation } from "wouter";
import { Home, User, Plus, LogIn, Shield, Bookmark, MessageCircle, Users, PenLine, Menu, LogOut, Compass, Swords, NotebookPen, Settings2, DoorOpen, Radio, Sparkles, X, UserCog } from "lucide-react";
import headerLogo from "@/assets/logo.png";
import orphanageMenuLogo from "@/assets/orphanage-menu-logo.png";
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
import MobileNav from "@/components/MobileNav";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function Navigation() {
  const [location, setLocation] = useLocation();
  const { currentUser, logout } = useBars();
  const { theme, setTheme } = useTheme();
  const unreadCount = useUnreadMessagesCount();
  const pendingFriendRequests = usePendingFriendRequestsCount();
  const [newMessageOpen, setNewMessageOpen] = useState(false);
  const [araOpen, setAraOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
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
      <header className="hidden md:flex fixed top-4 left-4 right-4 h-14 z-50 items-center justify-between px-3 rounded-2xl floating-bar top-bar overflow-visible gap-3">
        
        {/* Left: Logo + inline nav links */}
        <div className="flex items-center gap-1 shrink-0">
          <Link href="/">
            <div className="flex items-center gap-2 cursor-pointer group px-2 py-1.5 rounded-xl hover:bg-white/[0.05] transition-colors">
              <div className="relative">
                <img src={headerLogo} alt="" className="h-7 w-7 transition-transform duration-200 group-hover:scale-110" />
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
                        : "text-foreground/60 hover:text-foreground hover:bg-white/[0.05]"
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
              {/* User avatar chip */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="flex items-center gap-2 pl-1 pr-2.5 py-1 rounded-xl hover:bg-white/[0.06] transition-colors"
                    data-testid="button-desktop-user"
                  >
                    <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center ring-1 ring-primary/20 text-primary font-bold text-xs">
                      {currentUser.username[0]?.toUpperCase()}
                    </div>
                    <span className="hidden xl:block text-sm font-medium text-foreground/80 max-w-[100px] truncate">
                      {currentUser.displayName || currentUser.username}
                    </span>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <div className="px-2 py-2 border-b border-border/20 mb-1">
                    <p className="text-sm font-semibold">{currentUser.displayName || currentUser.username}</p>
                    <p className="text-xs text-muted-foreground">@{currentUser.username}</p>
                  </div>
                  <DropdownMenuItem asChild>
                    <Link href="/profile" className="flex items-center gap-2 cursor-pointer">
                      <User className="h-4 w-4" />
                      <span>My Profile</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/messages" className="flex items-center gap-2 cursor-pointer">
                      <MessageCircle className="h-4 w-4" />
                      <span>Messages</span>
                      {unreadCount > 0 && <span className="ml-auto text-xs bg-primary text-white px-1.5 py-0.5 rounded-full">{unreadCount}</span>}
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/friends" className="flex items-center gap-2 cursor-pointer">
                      <Users className="h-4 w-4" />
                      <span>Friends</span>
                      {pendingFriendRequests > 0 && <span className="ml-auto text-xs bg-primary text-white px-1.5 py-0.5 rounded-full">{pendingFriendRequests}</span>}
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/saved" className="flex items-center gap-2 cursor-pointer">
                      <Bookmark className="h-4 w-4" />
                      <span>Saved</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/changelog" className="flex items-center gap-2 cursor-pointer">
                      <Sparkles className="h-4 w-4" />
                      <span>What's New</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/settings" className="flex items-center gap-2 cursor-pointer">
                      <UserCog className="h-4 w-4" />
                      <span>Settings</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} className="flex items-center gap-2 cursor-pointer text-red-400 focus:text-red-400">
                    <LogOut className="h-4 w-4" />
                    <span>Sign Out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="p-2 rounded-xl hover:bg-white/[0.06] transition-colors text-foreground/80"
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

      {/* Mobile Top Bar - Slim glass bar: logo, notifications, online */}
      <div className="md:hidden fixed mobile-topbar-offset left-3 right-3 z-[1200] overflow-visible">
        <div className="floating-bar rounded-2xl h-12 flex items-center justify-between px-3 overflow-visible top-bar mobile-nav">
          <Link href="/">
            <div className="flex items-center gap-1.5 cursor-pointer min-w-0">
              <img src={headerLogo} alt="" className="h-6 w-6" />
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
