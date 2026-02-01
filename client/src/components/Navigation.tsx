import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Home, User, Plus, LogIn, Shield, Bookmark, MessageCircle, Users, PenLine, Search, Settings, Sparkles, DoorOpen } from "lucide-react";
import headerLogo from "@/assets/logo.png";
import { cn } from "@/lib/utils";
import { useBars } from "@/context/BarContext";
import { NotificationBell } from "@/components/NotificationBell";
import { SearchBar } from "@/components/SearchBar";
import { OnlineStatusIndicator } from "@/components/OnlineStatus";
import { useUnreadMessagesCount, usePendingFriendRequestsCount } from "@/components/UnreadMessagesBadge";
import { NewMessageDialog } from "@/components/NewMessageDialog";
import { BottomNav } from "@/components/BottomNav";

interface NavItemProps {
  icon: React.ElementType;
  label: string;
  path: string;
  badge?: number;
  isActive: boolean;
}

function NavItem({ icon: Icon, label, path, badge, isActive }: NavItemProps) {
  return (
    <Link href={path}>
      <div className={cn(
        "flex flex-col items-center gap-1.5 py-3 px-2 rounded-2xl transition-all cursor-pointer group",
        isActive 
          ? "bg-primary/20 text-primary" 
          : "text-white/50 hover:text-white/80 hover:bg-white/[0.04]"
      )}>
        <div className={cn(
          "relative w-10 h-10 rounded-xl flex items-center justify-center transition-all",
          isActive ? "bg-primary text-white" : "bg-white/[0.04] group-hover:bg-white/[0.08]"
        )}>
          <Icon className="w-5 h-5" />
          {badge && badge > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-primary text-white text-[10px] font-bold flex items-center justify-center shadow-lg shadow-primary/50">
              {badge > 99 ? '99+' : badge}
            </span>
          )}
        </div>
        <span className={cn(
          "text-[11px] font-medium transition-colors",
          isActive ? "text-primary" : "text-white/50 group-hover:text-white/70"
        )}>
          {label}
        </span>
      </div>
    </Link>
  );
}

export default function Navigation() {
  const [location] = useLocation();
  const { currentUser } = useBars();
  const unreadCount = useUnreadMessagesCount();
  const pendingFriendRequests = usePendingFriendRequestsCount();
  const [newMessageOpen, setNewMessageOpen] = useState(false);
  
  const isOnMessagesPage = location.startsWith("/messages");

  return (
    <>
      {/* Desktop Left Sidebar - Apple Style */}
      <aside className="hidden md:flex fixed left-0 top-0 bottom-0 w-20 lg:w-24 flex-col items-center py-6 z-50 bg-black/40 backdrop-blur-2xl border-r border-white/[0.06]">
        {/* Logo */}
        <Link href="/">
          <div className="mb-8 cursor-pointer hover:scale-105 transition-transform">
            <img src={headerLogo} alt="Orphan Bars" className="h-10 w-10 lg:h-12 lg:w-12" />
          </div>
        </Link>
        
        {/* Main Navigation */}
        <nav className="flex-1 flex flex-col items-center gap-1 w-full px-2">
          <NavItem 
            icon={Home} 
            label="Home" 
            path="/" 
            isActive={location === "/"} 
          />
          
          {currentUser && (
            <>
              <NavItem 
                icon={User} 
                label="Profile" 
                path="/profile" 
                isActive={location === "/profile"} 
              />
              
              <NavItem 
                icon={MessageCircle} 
                label="Messages" 
                path="/messages" 
                badge={unreadCount}
                isActive={location.startsWith("/messages")} 
              />
              
              <NavItem 
                icon={Users} 
                label="Friends" 
                path="/friends" 
                badge={pendingFriendRequests}
                isActive={location === "/friends"} 
              />
              
              <NavItem 
                icon={Bookmark} 
                label="Saved" 
                path="/saved" 
                isActive={location === "/saved"} 
              />
              
              <NavItem 
                icon={DoorOpen} 
                label="Orphanage" 
                path="/orphanage" 
                isActive={location.startsWith("/orphanage")} 
              />
              
              {currentUser.isAdmin && (
                <NavItem 
                  icon={Shield} 
                  label="Admin" 
                  path="/admin" 
                  isActive={location === "/admin"} 
                />
              )}
            </>
          )}
          
          {!currentUser && (
            <NavItem 
              icon={LogIn} 
              label="Login" 
              path="/auth" 
              isActive={location === "/auth"} 
            />
          )}
        </nav>
        
        {/* Bottom Section */}
        <div className="flex flex-col items-center gap-2 w-full px-2 mt-auto">
          {currentUser && (
            <>
              <NotificationBell />
              <OnlineStatusIndicator />
            </>
          )}
        </div>
      </aside>

      {/* Desktop Top Bar - minimal header with search */}
      <header className="hidden md:flex fixed top-0 left-20 lg:left-24 right-0 h-16 items-center justify-between px-6 z-40 bg-black/20 backdrop-blur-xl border-b border-white/[0.04]">
        <div className="flex items-center gap-4">
          <span className="font-logo text-xl lg:text-2xl text-white/90">ORPHAN BARS</span>
        </div>
        
        <div className="flex items-center gap-4">
          <SearchBar className="w-64 lg:w-80" />
          
          {currentUser && (
            <>
              {isOnMessagesPage ? (
                <button
                  onClick={() => setNewMessageOpen(true)}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-white font-medium text-sm transition-all hover:bg-primary/90 hover:scale-105 active:scale-95 shadow-lg shadow-primary/30"
                  data-testid="button-new-message"
                >
                  <PenLine className="h-4 w-4" />
                  <span>New Message</span>
                </button>
              ) : (
                <Link href="/post">
                  <button className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-white font-medium text-sm transition-all hover:bg-primary/90 hover:scale-105 active:scale-95 shadow-lg shadow-primary/30">
                    <Plus className="h-4 w-4" />
                    <span>Drop Bar</span>
                  </button>
                </Link>
              )}
            </>
          )}
          
          {!currentUser && (
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
        <div className="bg-black/50 backdrop-blur-2xl rounded-2xl h-12 flex items-center justify-between px-4 shadow-lg shadow-black/30 border border-white/[0.06]">
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
