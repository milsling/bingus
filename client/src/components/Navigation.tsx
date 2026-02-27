    // Touch handlers for closing menu by dragging left
    const [menuDragStartX, setMenuDragStartX] = useState<number | null>(null);
    const [menuDragOffset, setMenuDragOffset] = useState(0);
    const handleMenuTouchStart = (e: React.TouchEvent) => {
      setMenuDragStartX(e.touches[0].clientX);
    };
    const handleMenuTouchMove = (e: React.TouchEvent) => {
      if (menuDragStartX !== null) {
        const offset = e.touches[0].clientX - menuDragStartX;
        setMenuDragOffset(Math.min(0, offset)); // Only allow left drag
      }
    };
    const handleMenuTouchEnd = () => {
      if (menuDragOffset < -60) {
        setMobileMenuOpen(false);
      }
      setMenuDragStartX(null);
      setMenuDragOffset(0);
    };
  // Mobile menu state
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [dragStartX, setDragStartX] = useState<number | null>(null);
  const [dragOffset, setDragOffset] = useState(0);

  // Touch handlers for drag-to-open/close
  const handleTabTouchStart = (e: React.TouchEvent) => {
    setDragStartX(e.touches[0].clientX);
  };
  const handleTabTouchMove = (e: React.TouchEvent) => {
    if (dragStartX !== null) {
      const offset = e.touches[0].clientX - dragStartX;
      setDragOffset(Math.max(0, offset));
    }
  };
  const handleTabTouchEnd = () => {
    if (dragOffset > 60) {
      setMobileMenuOpen(true);
    }
    setDragStartX(null);
    setDragOffset(0);
  };
import { useCallback, useState } from "react";
import { Link, useLocation } from "wouter";
import { Home, User, Plus, LogIn, Shield, Bookmark, MessageCircle, Users, PenLine, LogOut, Compass, Swords, NotebookPen, Settings2, Sun, Moon, Monitor, UserCog, DoorOpen, Radio, Sparkles, X } from "lucide-react";
import headerLogo from "../assets/logo.png";
import orphanageMenuLogo from "../assets/orphanage-menu-logo.png";
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
  import { motion, AnimatePresence } from "framer-motion";
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
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            className="fixed inset-0 z-[1400] md:hidden"
            style={{ background: "rgba(0,0,0,0.32)" }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}
            onClick={() => setMobileMenuOpen(false)}
          >
            <motion.div
              className="fixed bottom-0 right-0 w-4/5 max-w-xs h-[80vh] bg-background rounded-tl-2xl shadow-2xl flex flex-col p-4"
              initial={{ x: 320, opacity: 0 }}
              animate={{ x: menuDragOffset, opacity: 1 }}
              exit={{ x: 320, opacity: 0 }}
              transition={{ type: "spring", stiffness: 420, damping: 38 }}
              onTouchStart={handleMenuTouchStart}
              onTouchMove={handleMenuTouchMove}
              onTouchEnd={handleMenuTouchEnd}
              onClick={e => e.stopPropagation()}
            >
              <div className="flex flex-col gap-4">
                <Link href="/" onClick={() => setMobileMenuOpen(false)} className="text-base py-2 flex items-center gap-2">
                  <Home className="w-5 h-5" /> Home
                </Link>
                <Link href="/profile" onClick={() => setMobileMenuOpen(false)} className="text-base py-2 flex items-center gap-2">
                  <User className="w-5 h-5" /> Profile
                </Link>
                <Link href="/messages" onClick={() => setMobileMenuOpen(false)} className="text-base py-2 flex items-center gap-2">
                  <MessageCircle className="w-5 h-5" /> Messages
                </Link>
                <Link href="/saved" onClick={() => setMobileMenuOpen(false)} className="text-base py-2 flex items-center gap-2">
                  <Bookmark className="w-5 h-5" /> Saved
                </Link>
                <Link href="/friends" onClick={() => setMobileMenuOpen(false)} className="text-base py-2 flex items-center gap-2">
                  <Users className="w-5 h-5" /> Friends
                </Link>
                <Link href="/settings" onClick={() => setMobileMenuOpen(false)} className="text-base py-2 flex items-center gap-2">
                  <Settings2 className="w-5 h-5" /> Settings
                </Link>
                <Link href="/challenges" onClick={() => setMobileMenuOpen(false)} className="text-base py-2 flex items-center gap-2">
                  <Swords className="w-5 h-5" /> Challenges
                </Link>
                <Link href="/orphanage" onClick={() => setMobileMenuOpen(false)} className="text-base py-2 flex items-center gap-2">
                  <DoorOpen className="w-5 h-5" /> Orphanage
                </Link>
                <Link href="/orphanstudio" onClick={() => setMobileMenuOpen(false)} className="text-base py-2 flex items-center gap-2">
                  <NotebookPen className="w-5 h-5" /> OrphanStudio
                </Link>
                <Link href="/post" onClick={() => setMobileMenuOpen(false)} className="text-base py-2 flex items-center gap-2">
                  <Plus className="w-5 h-5" /> Drop Bar
                </Link>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
                    <Users className="w-5 h-5" /> Friends
                  </Link>
                  <Link href="/settings" onClick={() => setMobileMenuOpen(false)} className="text-base py-2 flex items-center gap-2">
                    <Settings2 className="w-5 h-5" /> Settings
                  </Link>
                  <Link href="/challenges" onClick={() => setMobileMenuOpen(false)} className="text-base py-2 flex items-center gap-2">
                    <Swords className="w-5 h-5" /> Challenges
                  </Link>
                  <Link href="/orphanage" onClick={() => setMobileMenuOpen(false)} className="text-base py-2 flex items-center gap-2">
                    <DoorOpen className="w-5 h-5" /> Orphanage
                  </Link>
                  <Link href="/orphanstudio" onClick={() => setMobileMenuOpen(false)} className="text-base py-2 flex items-center gap-2">
                    <NotebookPen className="w-5 h-5" /> OrphanStudio
                  </Link>
                  <Link href="/post" onClick={() => setMobileMenuOpen(false)} className="text-base py-2 flex items-center gap-2">
                    <Plus className="w-5 h-5" /> Drop Bar
                  </Link>
                </div>
              </div>
            </div>
          )}
    <>
      {/* Mobile draggable tab (bottom right) */}
      <div
        className="fixed bottom-6 right-4 z-[1300] md:hidden"
        style={{ touchAction: "pan-x" }}
      >
        <div
          className="w-12 h-12 rounded-full bg-primary flex items-center justify-center shadow-lg active:scale-95 transition-transform cursor-pointer"
          onTouchStart={handleTabTouchStart}
          onTouchMove={handleTabTouchMove}
          onTouchEnd={handleTabTouchEnd}
          style={{ transform: `translateX(${dragOffset}px)` }}
          aria-label="Open menu"
        >
          <img src={orphanageMenuLogo} alt="Menu" className="w-7 h-7" />
        </div>
      </div>
      
      {/* Desktop Floating Top Bar - overflow-visible so bar isn't clipped */}
      <header className="hidden md:flex fixed top-4 left-4 right-4 h-14 z-50 items-center justify-between px-2 rounded-2xl floating-bar top-bar overflow-visible">
        {/* Left: Logo Only (no hamburger on mobile) */}
        <div className="flex items-center gap-2">
          <Link href="/">
            <div className="flex items-center gap-2 cursor-pointer min-w-0 group">
              <div className="relative">
                <img src={headerLogo} alt="" className="h-7 w-7 transition-transform duration-200 group-hover:scale-110" />
                <div className="absolute inset-0 bg-primary/20 rounded-lg blur-sm opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <span className="font-logo text-sm leading-none text-foreground flex items-center gap-0.5 truncate group-hover:text-primary transition-colors">
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
                <Link href="/changelog" className="flex items-center gap-2 cursor-pointer">
                  <Sparkles className="h-4 w-4" />
                  <span>What's New</span>
                </Link>
              </DropdownMenuItem>
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
