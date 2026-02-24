import { useCallback, useState } from "react";
import { Link, useLocation } from "wouter";
import { Home, User, Plus, LogIn, Shield, Bookmark, MessageCircle, Users, PenLine, Menu, LogOut, Compass, Swords, NotebookPen, Settings2, Sun, Moon, Monitor, UserCog, DoorOpen, Radio } from "lucide-react";
import headerLogo from "../assets/logo.png";
import orphanageMenuLogo from "../assets/orphanage-menu-logo.png";
import { useBars } from "@/context/BarContext";
import { NotificationBell } from "@/components/NotificationBell";
import { SearchBar } from "@/components/SearchBar";
import { OnlineStatusIndicator } from "@/components/OnlineStatus";
import { useUnreadMessagesCount, usePendingFriendRequestsCount } from "@/components/UnreadMessagesBadge";
import { NewMessageDialog } from "@/components/NewMessageDialog";
import { FloatingActionButton } from "@/components/FloatingActionButton";
import AIAssistant from "@/components/AIAssistant";
import { useTheme } from "@/contexts/ThemeContext";
import { useFabShortcuts, type ShortcutTarget } from "@/hooks/useFabShortcuts";
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

  return (
    <>
      <FloatingActionButton
        onDropABar={() => setLocation(currentUser ? "/post" : "/auth")}
        onSwipeLeft={() => executeShortcut(leftTarget)}
        onSwipeRight={() => executeShortcut(rightTarget)}
        onLongPress={() => {
          if ("vibrate" in navigator) navigator.vibrate([12, 50, 8, 50, 12]);
          setAraOpen(true);
        }}
      />
      
      {/* Desktop Floating Top Bar - overflow-visible so bar isn't clipped */}
      <header className="hidden md:flex fixed top-4 left-4 right-4 h-14 z-50 items-center justify-between px-2 rounded-2xl floating-bar top-bar overflow-visible">
        {/* Left: Hamburger + Logo */}
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="p-2.5 rounded-xl hover:bg-secondary/80 transition-colors"
                aria-label="Open menu"
              >
                <Menu className="h-5 w-5 text-foreground/70" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
              <DropdownMenuItem asChild>
                <Link href="/" className="flex items-center gap-3 cursor-pointer">
                  <Compass className="h-4 w-4" />
                  <span>Explore</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/prompts" className="flex items-center gap-3 cursor-pointer">
                  <PenLine className="h-4 w-4" />
                  <span>Prompts</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/orphanstudio" className="flex items-center gap-3 cursor-pointer">
                  <NotebookPen className="h-4 w-4" />
                  <span>Orphan Studio</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setAraOpen(true)}
                className="flex items-center gap-3 cursor-pointer"
              >
                <Radio className="h-4 w-4" />
                <span>Orphie Voice</span>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/challenges" className="flex items-center gap-3 cursor-pointer">
                  <Swords className="h-4 w-4" />
                  <span>Challenges</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href={currentUser ? "/settings" : "/auth"} className="flex items-center gap-3 cursor-pointer">
                  <Settings2 className="h-4 w-4" />
                  <span>Settings</span>
                </Link>
              </DropdownMenuItem>
              {currentUser && (
                <>
                  <DropdownMenuItem asChild>
                    <Link href="/profile" className="flex items-center gap-3 cursor-pointer">
                      <User className="h-4 w-4" />
                      <span>My Bars</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/messages" className="flex items-center gap-3 cursor-pointer">
                      <MessageCircle className="h-4 w-4" />
                      <span>Messages</span>
                      {unreadCount > 0 && (
                        <span className="ml-auto text-xs bg-primary text-white px-1.5 rounded-full">{unreadCount}</span>
                      )}
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/friends" className="flex items-center gap-3 cursor-pointer">
                      <Users className="h-4 w-4" />
                      <span>Friends</span>
                      {pendingFriendRequests > 0 && (
                        <span className="ml-auto text-xs bg-primary text-white px-1.5 rounded-full">{pendingFriendRequests}</span>
                      )}
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/saved" className="flex items-center gap-3 cursor-pointer">
                      <Bookmark className="h-4 w-4" />
                      <span>Saved</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/orphanage" className="flex items-center gap-3 cursor-pointer">
                      <img src={orphanageMenuLogo} alt="The Orphanage" className="h-4 w-4" />
                      <span>The Orphanage</span>
                    </Link>
                  </DropdownMenuItem>
                  {currentUser.isAdmin && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem asChild>
                        <Link href="/admin" className="flex items-center gap-3 cursor-pointer">
                          <Shield className="h-4 w-4" />
                          <span>Admin</span>
                        </Link>
                      </DropdownMenuItem>
                    </>
                  )}

                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onSelect={(e) => {
                      e.preventDefault();
                      void handleLogout();
                    }}
                    className="flex items-center gap-3 cursor-pointer"
                  >
                    <LogOut className="h-4 w-4" />
                    <span>Logout</span>
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
          
          <Link href="/">
            <div className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity">
              <img src={headerLogo} alt="" className="h-7 w-7" />
              <span className="font-logo text-xl leading-none text-foreground flex items-center gap-1">
                <span>ORPHAN</span>
                <span>BARS</span>
              </span>
            </div>
          </Link>
        </div>
        
        {/* Center: Search Bar */}
        <div className="flex-1 max-w-xl mx-8">
          <SearchBar className="w-full" />
        </div>
        
        {/* Right: Actions */}
        <div className="flex items-center gap-1">
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
              <div className="px-2 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Appearance
              </div>
              <DropdownMenuItem onClick={() => setTheme("light")} className="flex items-center gap-2 cursor-pointer">
                <Sun className="h-4 w-4" />
                <span>Light</span>
                {theme === "light" && <span className="ml-auto text-primary">✓</span>}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTheme("dark")} className="flex items-center gap-2 cursor-pointer">
                <Moon className="h-4 w-4" />
                <span>Dark</span>
                {theme === "dark" && <span className="ml-auto text-primary">✓</span>}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTheme("system")} className="flex items-center gap-2 cursor-pointer">
                <Monitor className="h-4 w-4" />
                <span>System</span>
                {theme === "system" && <span className="ml-auto text-primary">✓</span>}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href={currentUser ? "/settings" : "/auth"} className="flex items-center gap-2 cursor-pointer">
                  <UserCog className="h-4 w-4" />
                  <span>{currentUser ? "Account Settings" : "Sign in for Settings"}</span>
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          {currentUser ? (
            <>
              {isOnMessagesPage ? (
                <button
                  onClick={() => setNewMessageOpen(true)}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-white font-medium text-sm transition-all hover:bg-primary/90 active:scale-95"
                  data-testid="button-new-message"
                >
                  <PenLine className="h-4 w-4" />
                  <span>New Message</span>
                </button>
              ) : (
                <Link href="/post">
                  <button className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-white font-medium text-sm transition-all hover:bg-primary/90 active:scale-95">
                    <Plus className="h-4 w-4" />
                    <span>Drop Bar</span>
                  </button>
                </Link>
              )}
              <NotificationBell />
              <OnlineStatusIndicator />
            </>
          ) : (
            <Link href="/auth">
              <button className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-white font-medium text-sm transition-all hover:bg-primary/90">
                <LogIn className="h-4 w-4" />
                <span>Login</span>
              </button>
            </Link>
          )}
        </div>
      </header>

      {/* Mobile Top Bar - Slim glass bar: logo, notifications, online */}
      <div className="md:hidden fixed mobile-topbar-offset left-3 right-3 z-[1200] overflow-visible">
        <div className="floating-bar rounded-2xl h-12 flex items-center justify-between px-3 overflow-visible top-bar">
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
              className="h-8 px-2.5 rounded-full border border-white/15 bg-white/[0.06] text-foreground/90 hover:bg-white/[0.12] transition-colors flex items-center gap-1.5 shrink-0"
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
    </>
  );
}
