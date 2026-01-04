import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Home, User, Plus, LogIn, Shield, Bookmark, MessageCircle, Users, PenLine } from "lucide-react";
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

  const desktopNavItems = [
    { icon: Home, label: "Feed", path: "/" },
  ];

  const desktopAuthItems = [
    { icon: Plus, label: "Drop Bar", path: "/post" },
    { icon: Users, label: "Friends", path: "/friends" },
    { icon: MessageCircle, label: "Messages", path: "/messages" },
    { icon: Bookmark, label: "Saved", path: "/saved" },
    { icon: User, label: "Profile", path: "/profile" },
  ];

  const adminItems = currentUser?.isAdmin ? [
    { icon: Shield, label: "Admin", path: "/admin" },
  ] : [];

  const desktopItems = currentUser ? [...desktopNavItems, ...desktopAuthItems, ...adminItems] : desktopNavItems;

  return (
    <>
      {/* Desktop Navigation */}
      <nav className="hidden md:flex fixed top-0 left-0 right-0 h-16 border-b border-border bg-background/80 backdrop-blur-md z-50 items-center px-6 justify-between">
        <div className="flex items-center gap-6">
          <Link href="/">
            <div className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity">
              <img src="/icon.png" alt="" className="h-8 w-8" />
              <span className="font-logo text-xl">ORPHAN BARS</span>
            </div>
          </Link>
          <SearchBar className="w-64" />
        </div>
        
        <div className="flex items-center gap-2">
          {/* Main nav items */}
          <Link href="/">
            <div className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors hover:bg-muted cursor-pointer",
              location === "/" ? "text-primary" : "text-muted-foreground"
            )}>
              <Home className="h-4 w-4" />
              Feed
            </div>
          </Link>
          
          {currentUser && (
            <>
              <Link href="/friends">
                <div className={cn(
                  "relative flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors hover:bg-muted cursor-pointer",
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
                  Friends
                </div>
              </Link>
              
              <Link href="/messages">
                <div className={cn(
                  "relative flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors hover:bg-muted cursor-pointer",
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
                  Messages
                </div>
              </Link>
              
              {/* Context-aware action button */}
              {isOnMessagesPage ? (
                <button
                  onClick={() => setNewMessageOpen(true)}
                  className="flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-primary text-primary-foreground font-bold text-sm transition-transform hover:scale-105 active:scale-95 shadow-md shadow-primary/20"
                  data-testid="button-new-message"
                >
                  <PenLine className="h-4 w-4" />
                  New Message
                </button>
              ) : (
                <Link href="/post">
                  <div className={cn(
                    "flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-primary text-primary-foreground font-bold text-sm transition-transform hover:scale-105 active:scale-95 shadow-md shadow-primary/20",
                    location === "/post" && "ring-2 ring-primary ring-offset-2 ring-offset-background"
                  )}>
                    <Plus className="h-4 w-4" />
                    Drop Bar
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

      {/* Mobile Top Bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-14 border-b border-border bg-background/90 backdrop-blur-lg z-50 flex items-center justify-between px-4">
        <Link href="/">
          <div className="flex items-center gap-1.5 cursor-pointer">
            <img src="/icon.png" alt="" className="h-6 w-6" />
            <span className="font-logo text-sm whitespace-nowrap">ORPHAN BARS</span>
          </div>
        </Link>
        <div className="flex items-center gap-2">
          {currentUser && <NotificationBell />}
          <OnlineStatusIndicator />
          <ThemeToggle />
        </div>
      </div>

      {/* Mobile Bottom Nav */}
      <div className="md:hidden">
        <BottomNav onNewMessage={() => setNewMessageOpen(true)} />
      </div>
      
      <NewMessageDialog open={newMessageOpen} onOpenChange={setNewMessageOpen} />
    </>
  );
}
