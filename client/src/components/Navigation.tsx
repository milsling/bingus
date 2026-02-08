import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Home, User, Plus, LogIn, Shield, Bookmark, MessageCircle, Users, PenLine, Menu, Search, Bell, Settings } from "lucide-react";
import headerLogo from "@/assets/logo.png";
import { cn } from "@/lib/utils";
import { useBars } from "@/context/BarContext";
import { NotificationBell } from "@/components/NotificationBell";
import { SearchBar } from "@/components/SearchBar";
import { OnlineStatusIndicator } from "@/components/OnlineStatus";
import { useUnreadMessagesCount, usePendingFriendRequestsCount } from "@/components/UnreadMessagesBadge";
import { NewMessageDialog } from "@/components/NewMessageDialog";
import { BottomNav } from "@/components/BottomNav";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function Navigation() {
  const [location] = useLocation();
  const { currentUser } = useBars();
  const unreadCount = useUnreadMessagesCount();
  const pendingFriendRequests = usePendingFriendRequestsCount();
  const [newMessageOpen, setNewMessageOpen] = useState(false);
  
  const isOnMessagesPage = location.startsWith("/messages");

  return (
    <>
      {/* Desktop Floating Top Bar - Gmail/YouTube style */}
      <header className="hidden md:flex fixed top-4 left-4 right-4 h-14 z-50 items-center justify-between px-2 rounded-2xl bg-[#1c1c1f]/70 border border-[#2a2a2d] backdrop-blur-lg shadow-lg">
        {/* Left: Hamburger + Logo */}
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="p-2.5 rounded-xl hover:bg-white/[0.06] transition-colors">
                <Menu className="h-5 w-5 text-white/70" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
              <DropdownMenuItem asChild>
                <Link href="/" className="flex items-center gap-3 cursor-pointer">
                  <Home className="h-4 w-4" />
                  <span>Home</span>
                </Link>
              </DropdownMenuItem>
              {currentUser && (
                <>
                  <DropdownMenuItem asChild>
                    <Link href="/profile" className="flex items-center gap-3 cursor-pointer">
                      <User className="h-4 w-4" />
                      <span>Profile</span>
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
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
          
          <Link href="/">
            <div className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity">
              <img src={headerLogo} alt="" className="h-7 w-7" />
              <span className="font-logo text-xl text-white">ORPHAN BARS</span>
            </div>
          </Link>
        </div>
        
        {/* Center: Search Bar */}
        <div className="flex-1 max-w-xl mx-8">
          <SearchBar className="w-full" />
        </div>
        
        {/* Right: Actions */}
        <div className="flex items-center gap-1">
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

      {/* Mobile Top Bar - Apple Glass Style */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 p-3 pt-[calc(env(safe-area-inset-top)+0.75rem)]">
        <div className="bg-black/40 backdrop-blur-2xl rounded-2xl h-12 flex items-center justify-between px-4 shadow-lg shadow-black/30 border border-white/[0.05]">
          <Link href="/">
            <div className="flex items-center gap-2 cursor-pointer">
              <img src={headerLogo} alt="" className="h-6 w-6" />
              <span className="font-logo text-base text-white">ORPHAN BARS</span>
            </div>
          </Link>
          <div className="flex items-center gap-2">
            {currentUser && <NotificationBell />}
            <OnlineStatusIndicator />
          </div>
        </div>
      </div>

      {/* Bottom Nav - Mobile only */}
      <BottomNav onNewMessage={() => setNewMessageOpen(true)} />
      
      <NewMessageDialog open={newMessageOpen} onOpenChange={setNewMessageOpen} />
    </>
  );
}
