import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Home, User, Plus, LogIn, Shield, Bookmark, MessageCircle, Users, PenLine, Menu, Search, Bell, Settings, LogOut, Compass, Swords } from "lucide-react";
import headerLogo from "@/assets/logo.png";
import { cn } from "@/lib/utils";
import { useBars } from "@/context/BarContext";
import { NotificationBell } from "@/components/NotificationBell";
import { SearchBar } from "@/components/SearchBar";
import { OnlineStatusIndicator } from "@/components/OnlineStatus";
import { useUnreadMessagesCount, usePendingFriendRequestsCount } from "@/components/UnreadMessagesBadge";
import { NewMessageDialog } from "@/components/NewMessageDialog";
import { BottomNav } from "@/components/BottomNav";
import { ThemeToggle } from "@/components/ThemeToggle";
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
  const unreadCount = useUnreadMessagesCount();
  const pendingFriendRequests = usePendingFriendRequestsCount();
  const [newMessageOpen, setNewMessageOpen] = useState(false);
  
  const isOnMessagesPage = location.startsWith("/messages");

  const handleLogout = async () => {
    await logout();
    setLocation("/");
  };

  return (
    <>
      {/* Mobile Bottom Nav - Fixed to screen bottom */}
      <BottomNav onNewMessage={() => setNewMessageOpen(true)} />
      
      {/* Desktop Floating Top Bar - overflow-visible so bar isn't clipped */}
      <header className="hidden md:flex fixed top-4 left-4 right-4 h-14 z-50 items-center justify-between px-2 rounded-2xl floating-bar overflow-visible">
        {/* Left: Hamburger + Logo */}
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="p-2.5 rounded-xl hover:bg-secondary/80 transition-colors">
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
                <Link href="/challenges" className="flex items-center gap-3 cursor-pointer">
                  <Swords className="h-4 w-4" />
                  <span>Challenges</span>
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
              <span className="font-logo text-xl text-foreground">ORPHAN BARS</span>
            </div>
          </Link>
        </div>
        
        {/* Center: Search Bar */}
        <div className="flex-1 max-w-xl mx-8">
          <SearchBar className="w-full" />
        </div>
        
        {/* Right: Actions */}
        <div className="flex items-center gap-1">
          <ThemeToggle />
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

      {/* Mobile Top Bar - Floating glass - overflow-visible so bar isn't clipped */}
      <div className="md:hidden fixed top-[calc(env(safe-area-inset-top)+0.5rem)] left-3 right-3 z-[999] overflow-visible">
        <div className="floating-bar rounded-2xl h-12 flex items-center justify-between px-4 overflow-visible">
          <Link href="/">
            <div className="flex items-center gap-2 cursor-pointer">
              <img src={headerLogo} alt="" className="h-6 w-6" />
              <span className="font-logo text-base text-foreground">ORPHAN BARS</span>
            </div>
          </Link>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            {currentUser && <NotificationBell />}
            <OnlineStatusIndicator />
          </div>
        </div>
      </div>
      
      <NewMessageDialog open={newMessageOpen} onOpenChange={setNewMessageOpen} />
    </>
  );
}
