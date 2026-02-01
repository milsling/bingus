import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Home, User, Plus, LogIn, Shield, Bookmark, MessageCircle, Users, PenLine } from "lucide-react";
import orphanageLogo from "@/assets/orphanage-logo.png";
import headerLogo from "@/assets/logo.png";
import { cn } from "@/lib/utils";
import { useBars } from "@/context/BarContext";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import { NotificationBell } from "@/components/NotificationBell";
import { SearchBar } from "@/components/SearchBar";
import { OnlineStatusIndicator } from "@/components/OnlineStatus";
import { useUnreadMessagesCount, usePendingFriendRequestsCount } from "@/components/UnreadMessagesBadge";
import { NewMessageDialog } from "@/components/NewMessageDialog";
import { BottomNav } from "@/components/BottomNav";

export default function Navigation() {
  const [location] = useLocation();
  const { currentUser } = useBars();
  const unreadCount = useUnreadMessagesCount();
  const pendingFriendRequests = usePendingFriendRequestsCount();
  const [newMessageOpen, setNewMessageOpen] = useState(false);
  
  const isOnMessagesPage = location.startsWith("/messages");

  return (
    <>
      {/* Desktop Navigation */}
      <nav className="hidden md:flex fixed top-0 left-0 right-0 h-16 border-b border-border/50 bg-background/90 backdrop-blur-lg z-50 items-center px-4 lg:px-6 justify-between pt-[env(safe-area-inset-top)] shadow-sm">
        <div className="flex items-center gap-3 lg:gap-6 shrink-0">
          <Link href="/">
            <div className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity">
              <img src={headerLogo} alt="" className="h-7 w-7 lg:h-8 lg:w-8" />
              <span className="font-logo leading-none text-2xl lg:text-3xl xl:text-4xl">ORPHAN BARS</span>
            </div>
          </Link>
          <SearchBar className="w-48 lg:w-64" />
        </div>
        
        <div className="flex items-center gap-1 lg:gap-2 overflow-x-auto shrink min-w-0">
          {/* Main nav items */}
          <Link href="/">
            <div className={cn(
              "flex items-center gap-1 px-2 lg:px-3 py-1.5 rounded-md text-sm font-medium transition-colors hover:bg-muted cursor-pointer whitespace-nowrap",
              location === "/" ? "text-primary" : "text-muted-foreground"
            )}>
              <Home className="h-4 w-4" />
              <span className="hidden lg:inline">Feed</span>
            </div>
          </Link>
          
          <Link href="/orphanage">
            <div className={cn(
              "px-2 lg:px-3 py-1.5 rounded-md transition-colors hover:bg-muted cursor-pointer",
              location === "/orphanage" ? "opacity-100" : "opacity-70 hover:opacity-100"
            )}>
              <img 
                src={orphanageLogo} 
                alt="Orphanage" 
                className="h-5 lg:h-6 w-auto dark:invert dark:brightness-200"
              />
            </div>
          </Link>
          
          {currentUser && (
            <>
              <Link href="/friends">
                <div className={cn(
                  "relative flex items-center gap-1 px-2 lg:px-3 py-1.5 rounded-md text-sm font-medium transition-colors hover:bg-muted cursor-pointer whitespace-nowrap",
                  location === "/friends" ? "text-primary" : "text-muted-foreground",
                  pendingFriendRequests > 0 && location !== "/friends" && "text-primary"
                )}>
                  <div className="relative">
                    <Users className="h-4 w-4" />
                    {pendingFriendRequests > 0 && (
                      <span className="absolute -top-1.5 -right-1.5 min-w-[14px] h-3.5 px-1 rounded-full bg-destructive text-destructive-foreground text-[9px] font-bold flex items-center justify-center">
                        {pendingFriendRequests > 99 ? '99+' : pendingFriendRequests}
                      </span>
                    )}
                  </div>
                  <span className="hidden lg:inline">Friends</span>
                </div>
              </Link>
              
              <Link href="/messages">
                <div className={cn(
                  "relative flex items-center gap-1 px-2 lg:px-3 py-1.5 rounded-md text-sm font-medium transition-colors hover:bg-muted cursor-pointer whitespace-nowrap",
                  location === "/messages" ? "text-primary" : "text-muted-foreground",
                  unreadCount > 0 && location !== "/messages" && "text-primary"
                )}>
                  <div className="relative">
                    <MessageCircle className="h-4 w-4" />
                    {unreadCount > 0 && (
                      <span className="absolute -top-1.5 -right-1.5 min-w-[14px] h-3.5 px-1 rounded-full bg-primary text-primary-foreground text-[9px] font-bold flex items-center justify-center">
                        {unreadCount > 99 ? '99+' : unreadCount}
                      </span>
                    )}
                  </div>
                  <span className="hidden lg:inline">Messages</span>
                </div>
              </Link>
              
              {/* Context-aware action button */}
              {isOnMessagesPage ? (
                <button
                  onClick={() => setNewMessageOpen(true)}
                  className="flex items-center gap-1 px-3 lg:px-4 py-1.5 rounded-full bg-primary text-primary-foreground font-bold text-sm transition-transform hover:scale-105 active:scale-95 shadow-md shadow-primary/20 whitespace-nowrap"
                  data-testid="button-new-message"
                >
                  <PenLine className="h-4 w-4" />
                  <span className="hidden lg:inline">New Message</span>
                </button>
              ) : (
                <Link href="/post">
                  <div className={cn(
                    "flex items-center gap-1 px-3 lg:px-4 py-1.5 rounded-full bg-primary text-primary-foreground font-bold text-sm transition-transform hover:scale-105 active:scale-95 shadow-md shadow-primary/20 whitespace-nowrap",
                    location === "/post" && "ring-2 ring-primary ring-offset-2 ring-offset-background"
                  )}>
                    <Plus className="h-4 w-4" />
                    <span className="hidden lg:inline">Drop Bar</span>
                  </div>
                </Link>
              )}
              
              {/* Icon-only buttons for cleaner look */}
              <Link href="/saved">
                <div className={cn(
                  "p-2 rounded-md transition-colors hover:bg-muted cursor-pointer",
                  location === "/saved" ? "text-primary" : "text-muted-foreground"
                )} title="Saved">
                  <Bookmark className="h-4 w-4" />
                </div>
              </Link>
              
              <Link href="/profile">
                <div className={cn(
                  "p-2 rounded-md transition-colors hover:bg-muted cursor-pointer",
                  location === "/profile" ? "text-primary" : "text-muted-foreground"
                )} title="Profile">
                  <User className="h-4 w-4" />
                </div>
              </Link>
              
              {currentUser.isAdmin && (
                <Link href="/admin">
                  <div className={cn(
                    "p-2 rounded-md transition-colors hover:bg-muted cursor-pointer",
                    location === "/admin" ? "text-primary" : "text-muted-foreground"
                  )} title="Admin">
                    <Shield className="h-4 w-4" />
                  </div>
                </Link>
              )}
              
              <NotificationBell />
            </>
          )}
          
          <OnlineStatusIndicator />
          <ThemeToggle />
          
          {!currentUser && (
            <Link href="/auth">
              <Button size="sm" className="font-bold gap-2">
                <LogIn className="h-4 w-4" />
                Login
              </Button>
            </Link>
          )}
        </div>
      </nav>

      {/* Mobile Top Bar - Glass Style */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 p-3 pt-[calc(env(safe-area-inset-top)+0.75rem)]">
        <div className="glass-nav rounded-2xl h-12 flex items-center justify-between px-4 shadow-lg shadow-black/20">
          <Link href="/">
            <div className="flex items-center gap-1.5 cursor-pointer">
              <img src={headerLogo} alt="" className="h-5 w-5" />
              <span className="font-logo text-sm whitespace-nowrap text-white">ORPHAN BARS</span>
            </div>
          </Link>
          <div className="flex items-center gap-1">
            {currentUser && <NotificationBell />}
            <OnlineStatusIndicator />
            <ThemeToggle />
          </div>
        </div>
      </div>

      {/* Bottom Nav - visible on all screens */}
      <div>
        <BottomNav onNewMessage={() => setNewMessageOpen(true)} />
      </div>
      
      <NewMessageDialog open={newMessageOpen} onOpenChange={setNewMessageOpen} />
    </>
  );
}
