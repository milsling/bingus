import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { Home, User, Plus, Bookmark, MessageCircle, Users, PenLine, LayoutGrid, Shield, Sparkles, TrendingUp, Star, Flame, Settings, Compass, Zap, Award, Crown, Music, Mic2, Search, Bell, ChevronRight, Hash, Trophy, Target, Lightbulb, Heart, Menu, X, Circle, UserPlus } from "lucide-react";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { useBars } from "@/context/BarContext";
import { NotificationBell } from "@/components/NotificationBell";
import { SearchBar } from "@/components/SearchBar";
import { OnlineStatusIndicator } from "@/components/OnlineStatus";
import { useUnreadMessagesCount, usePendingFriendRequestsCount } from "@/components/UnreadMessagesBadge";
import headerLogo from "@/assets/logo.png";
import orphanageLogo from "@/assets/orphanage-logo.png";

interface DesktopLayoutProps {
  children: ReactNode;
  showSidebar?: boolean;
}

export function DesktopLayout({ children, showSidebar = true }: DesktopLayoutProps) {
  const [location] = useLocation();
  const { currentUser } = useBars();
  const unreadCount = useUnreadMessagesCount();
  const pendingFriendRequests = usePendingFriendRequestsCount();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Fetch sidebar data
  const { data: trendingHashtags = [] } = useQuery<Array<{ tag: string; count: number }>>({
    queryKey: ['/api/trending-hashtags'],
    staleTime: 5 * 60 * 1000,
  });

  const { data: onlineFriends = [] } = useQuery<Array<{ id: string; username: string; avatarUrl: string | null; onlineStatus: string }>>({
    queryKey: ['/api/online-friends'],
    enabled: !!currentUser,
    staleTime: 30 * 1000,
  });

  const { data: leaderboard = [] } = useQuery<Array<{ id: string; username: string; avatarUrl: string | null; xp: number; level: number; membershipTier: string | null }>>({
    queryKey: ['/api/leaderboard'],
    staleTime: 5 * 60 * 1000,
  });

  const { data: suggestedUsers = [] } = useQuery<Array<{ id: string; username: string; avatarUrl: string | null; bio: string | null; membershipTier: string | null; barsCount: number }>>({
    queryKey: ['/api/suggested-users'],
    enabled: !!currentUser,
    staleTime: 5 * 60 * 1000,
  });

  const { data: dailyChallenge } = useQuery<{ id: string; prompt: string; category: string } | null>({
    queryKey: ['/api/daily-challenge'],
    staleTime: 60 * 60 * 1000,
  });

  const { data: trendingBars = [] } = useQuery<Array<{ id: string; content: string; user: { id: string; username: string; avatarUrl: string | null }; velocity: number }>>({
    queryKey: ['/api/bars/feed/trending', { limit: 3 }],
    staleTime: 5 * 60 * 1000,
  });

  return (
    <div className="hidden md:block min-h-screen bg-[#121212] relative overflow-hidden">
      {/* Ambient background effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-primary/8 rounded-full blur-[150px]" />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-purple-500/8 rounded-full blur-[120px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-blue-500/5 rounded-full blur-[200px]" />
      </div>

      {/* Top Navigation Bar - Premium Glass Style */}
      <nav className="fixed top-4 left-4 right-4 h-14 z-50">
        <div className="h-full bg-gray-400/[0.08] backdrop-blur-3xl border border-white/[0.05] rounded-full shadow-2xl shadow-black/30 flex items-center px-4">
          {/* Left Section - Hamburger + Logo */}
          <div className="flex items-center gap-1 min-w-[200px]">
            {/* Hamburger Menu Button */}
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2.5 rounded-full hover:bg-white/[0.08] transition-colors"
              data-testid="button-toggle-sidebar"
            >
              <Menu className="h-5 w-5 text-white/70" />
            </button>
            
            {/* Logo */}
            <Link href="/">
              <div className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity group pl-1">
                <div className="relative">
                  <img src={headerLogo} alt="" className="h-7 w-7" />
                  <div className="absolute inset-0 bg-primary/30 rounded-full blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <span className="font-logo leading-none text-xl text-white">ORPHAN BARS</span>
              </div>
            </Link>
          </div>

          {/* Center - Search Bar */}
          <div className="flex-1 flex justify-center px-6">
            <div className="w-full max-w-[600px]">
              <SearchBar className="w-full" />
            </div>
          </div>

          {/* Right Section - Actions */}
          <div className="flex items-center gap-1 min-w-[200px] justify-end">
            {currentUser ? (
              <>
                <Link href="/post">
                  <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-primary to-purple-500 text-white font-semibold text-sm transition-all hover:shadow-lg hover:shadow-primary/30 hover:scale-[1.02] active:scale-[0.98] group">
                    <Plus className="h-4 w-4 group-hover:rotate-90 transition-transform duration-300" />
                    <span>Drop Bar</span>
                  </div>
                </Link>
                <NotificationBell />
                <OnlineStatusIndicator />
              </>
            ) : (
              <Link href="/auth">
                <div className="px-5 py-2 rounded-full bg-gradient-to-r from-primary to-purple-500 text-white font-semibold text-sm hover:shadow-lg hover:shadow-primary/30 transition-all">
                  Login
                </div>
              </Link>
            )}
          </div>
        </div>
      </nav>

      {/* Main Layout with Fixed Sidebars */}
      <div className="pt-24 min-h-screen">
        {/* Left Sidebar - Two stacked glass panels */}
        {showSidebar && (
          <aside className={cn(
            "fixed left-4 top-24 bottom-4 w-64 z-40 transition-all duration-300 ease-in-out flex flex-col gap-3",
            sidebarOpen ? "translate-x-0 opacity-100" : "-translate-x-[calc(100%+16px)] opacity-0"
          )}>
            {/* Top Panel - Profile Preview */}
            {currentUser ? (
              <div className="bg-white/[0.06] backdrop-blur-xl border border-white/[0.1] rounded-2xl p-4">
                {/* Profile Header */}
                <Link href="/profile">
                  <div className="flex flex-col items-center text-center cursor-pointer group">
                    <div className="relative mb-3">
                      <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary/30 to-purple-500/30 flex items-center justify-center overflow-hidden border-2 border-white/[0.15] group-hover:border-primary/50 transition-colors">
                        {currentUser.avatarUrl ? (
                          <img src={currentUser.avatarUrl} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <User className="h-8 w-8 text-white/50" />
                        )}
                      </div>
                      <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 rounded-full border-3 border-[#121212] flex items-center justify-center">
                        <Circle className="h-2 w-2 fill-white text-white" />
                      </div>
                    </div>
                    <p className="text-sm font-semibold text-white group-hover:text-primary transition-colors">@{currentUser.username}</p>
                    <p className="text-xs text-white/40 mt-0.5">Level {currentUser.level || 1} · {currentUser.xp || 0} XP</p>
                  </div>
                </Link>

                {/* Stats Row */}
                <div className="flex justify-center gap-6 mt-4 pt-4 border-t border-white/5">
                  <div className="text-center">
                    <p className="text-lg font-bold text-white">{currentUser.xp || 0}</p>
                    <p className="text-[10px] text-white/40 uppercase">XP</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-bold text-white">{currentUser.level || 1}</p>
                    <p className="text-[10px] text-white/40 uppercase">Level</p>
                  </div>
                </div>

                {/* Online Status Toggle */}
                <div className="mt-4 pt-4 border-t border-white/5">
                  <OnlineStatusIndicator showLabel />
                </div>
              </div>
            ) : (
              <div className="bg-white/[0.06] backdrop-blur-xl border border-white/[0.1] rounded-2xl p-4 text-center">
                <User className="h-10 w-10 text-white/30 mx-auto mb-3" />
                <p className="text-sm text-white/60 mb-3">Join the community</p>
                <Link href="/auth">
                  <div className="px-4 py-2 rounded-full bg-gradient-to-r from-primary to-purple-500 text-white text-sm font-semibold hover:shadow-lg hover:shadow-primary/30 transition-all cursor-pointer">
                    Login / Sign Up
                  </div>
                </Link>
              </div>
            )}

            {/* Bottom Panel - Navigation */}
            <div className="flex-1 bg-white/[0.06] backdrop-blur-xl border border-white/[0.1] rounded-2xl p-4 flex flex-col overflow-y-auto">
              {/* Navigation Items */}
              <nav className="space-y-1">
                <SidebarLink href="/" icon={Home} label="Feed" active={location === "/"} />
                <SidebarLink 
                  href="/orphanage" 
                  icon={() => (
                    <img src={orphanageLogo} alt="" className="h-5 w-5 brightness-0 invert opacity-70" />
                  )} 
                  label="Orphanage" 
                  active={location === "/orphanage"} 
                />
                
                {currentUser && (
                  <>
                    <div className="h-px bg-white/5 my-3" />
                    
                    <SidebarLink 
                      href="/friends" 
                      icon={Users} 
                      label="Friends" 
                      active={location === "/friends"}
                      badge={pendingFriendRequests > 0 ? pendingFriendRequests : undefined}
                    />
                    <SidebarLink 
                      href="/messages" 
                      icon={MessageCircle} 
                      label="Messages" 
                      active={location.startsWith("/messages")}
                      badge={unreadCount > 0 ? unreadCount : undefined}
                    />
                    <SidebarLink href="/saved" icon={Bookmark} label="Saved" active={location === "/saved"} />
                    <SidebarLink href="/apps" icon={LayoutGrid} label="Apps" active={location === "/apps"} />
                    
                    <div className="h-px bg-white/5 my-3" />
                    
                    <SidebarLink href="/profile" icon={User} label="Profile" active={location === "/profile"} />
                    <SidebarLink href="/achievements" icon={Sparkles} label="Achievements" active={location === "/achievements"} />
                    
                    {currentUser.isAdmin && (
                      <>
                        <div className="h-px bg-white/5 my-3" />
                        <SidebarLink href="/admin" icon={Shield} label="Admin" active={location === "/admin"} />
                      </>
                    )}
                  </>
                )}
              </nav>

              {/* Categories Section */}
              <div className="mt-4 pt-4 border-t border-white/5">
                <h3 className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Compass className="h-3.5 w-3.5" />
                  Categories
                </h3>
                <div className="flex flex-wrap gap-2">
                  {['Punchlines', 'Wordplay', 'Storytelling', 'Battle', 'Metaphor', 'Flow'].map((cat) => (
                    <Link key={cat} href={`/?category=${cat.toLowerCase()}`}>
                      <span className="inline-flex items-center px-3 py-1.5 rounded-full bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.08] text-sm text-white/70 hover:text-white transition-colors cursor-pointer">
                        {cat}
                      </span>
                    </Link>
                  ))}
                </div>
              </div>

              {/* Trending Hashtags */}
              {trendingHashtags.length > 0 && (
                <div className="mt-4 pt-4 border-t border-white/5">
                  <h3 className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <TrendingUp className="h-3.5 w-3.5" />
                    Trending Tags
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {trendingHashtags.slice(0, 6).map((tag) => (
                      <Link key={tag.tag} href={`/?tag=${tag.tag}`}>
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.08] text-xs text-white/70 hover:text-white transition-colors cursor-pointer">
                          <Hash className="h-3 w-3 text-primary/70" />
                          {tag.tag}
                          <span className="text-white/30 ml-1">{tag.count}</span>
                        </span>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* Friends Online */}
              {currentUser && onlineFriends.length > 0 && (
                <div className="mt-4 pt-4 border-t border-white/5">
                  <h3 className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <Circle className="h-3 w-3 fill-green-500 text-green-500" />
                    Friends Online ({onlineFriends.length})
                  </h3>
                  <div className="space-y-2">
                    {onlineFriends.slice(0, 5).map((friend) => (
                      <Link key={friend.id} href={`/profile/${friend.username}`}>
                        <div className="flex items-center gap-2 p-2 rounded-lg hover:bg-white/[0.05] transition-colors cursor-pointer group">
                          <div className="relative">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/30 to-purple-500/30 flex items-center justify-center overflow-hidden border border-white/10">
                              {friend.avatarUrl ? (
                                <img src={friend.avatarUrl} alt="" className="w-full h-full object-cover" />
                              ) : (
                                <User className="h-4 w-4 text-white/50" />
                              )}
                            </div>
                            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-[#121212]" />
                          </div>
                          <span className="text-sm text-white/70 group-hover:text-white truncate">@{friend.username}</span>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </aside>
        )}

        {/* Main Content Area - Scrollable with margins for fixed sidebars */}
        <main className={cn(
          "px-6 pb-8 transition-all duration-300 ease-in-out",
          showSidebar && sidebarOpen ? "ml-72 xl:mr-80" : "ml-4 xl:mr-80"
        )}>
          <div className="max-w-3xl mx-auto">
            {children}
          </div>
        </main>

        {/* Right Sidebar - Fixed Trending/Featured */}
        {showSidebar && (
          <aside className="fixed right-4 top-24 bottom-4 w-72 z-40 hidden xl:block">
            <div className="h-full bg-white/[0.06] backdrop-blur-xl border border-white/[0.1] rounded-2xl p-4 flex flex-col gap-4 overflow-y-auto">
              {/* Daily Challenge */}
              {dailyChallenge && (
                <div className="p-4 bg-gradient-to-br from-amber-500/10 to-orange-500/10 rounded-xl border border-amber-500/20">
                  <div className="flex items-center gap-2 mb-2">
                    <Target className="h-4 w-4 text-amber-400" />
                    <h3 className="text-xs font-semibold text-amber-400 uppercase tracking-wider">Daily Challenge</h3>
                  </div>
                  <p className="text-sm text-white/90 mb-2">{dailyChallenge.prompt}</p>
                  <span className="inline-block px-2 py-0.5 rounded-full bg-amber-500/20 text-xs text-amber-300">{dailyChallenge.category}</span>
                </div>
              )}

              {/* Your Stats */}
              {currentUser && (
                <div className="p-4 bg-gradient-to-br from-primary/10 to-purple-500/10 rounded-xl border border-white/5">
                  <h3 className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-3">Your Stats</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <StatBox icon={Flame} label="XP" value={currentUser.xp || 0} />
                    <StatBox icon={Star} label="Level" value={currentUser.level || 1} />
                  </div>
                </div>
              )}

              {/* Trending Bars */}
              {trendingBars.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <Flame className="h-3.5 w-3.5 text-orange-400" />
                    Hot Bars
                  </h3>
                  <div className="space-y-2">
                    {trendingBars.slice(0, 3).map((bar, idx) => (
                      <Link key={bar.id} href={`/bar/${bar.id}`}>
                        <div className="p-3 rounded-lg bg-white/[0.03] hover:bg-white/[0.06] border border-white/5 transition-colors cursor-pointer group">
                          <div className="flex items-start gap-2">
                            <span className="text-lg font-bold text-white/20">#{idx + 1}</span>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-white/80 group-hover:text-white line-clamp-2 leading-relaxed">
                                {bar.content.length > 60 ? bar.content.substring(0, 60) + '...' : bar.content}
                              </p>
                              <p className="text-xs text-white/40 mt-1">@{bar.user.username}</p>
                            </div>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* Leaderboard */}
              {leaderboard.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <Trophy className="h-3.5 w-3.5 text-yellow-400" />
                    Top Lyricists
                  </h3>
                  <div className="space-y-2">
                    {leaderboard.slice(0, 5).map((user, idx) => (
                      <Link key={user.id} href={`/profile/${user.username}`}>
                        <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/[0.05] transition-colors cursor-pointer group">
                          <span className={cn(
                            "w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold",
                            idx === 0 ? "bg-yellow-500/30 text-yellow-400" :
                            idx === 1 ? "bg-gray-400/30 text-gray-300" :
                            idx === 2 ? "bg-orange-600/30 text-orange-400" :
                            "bg-white/10 text-white/50"
                          )}>
                            {idx + 1}
                          </span>
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/30 to-purple-500/30 flex items-center justify-center overflow-hidden border border-white/10">
                            {user.avatarUrl ? (
                              <img src={user.avatarUrl} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <User className="h-4 w-4 text-white/50" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-white/80 group-hover:text-white truncate">@{user.username}</p>
                            <p className="text-xs text-white/40">{user.xp?.toLocaleString()} XP</p>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* Suggested Follows */}
              {currentUser && suggestedUsers.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <UserPlus className="h-3.5 w-3.5" />
                    Discover Lyricists
                  </h3>
                  <div className="space-y-2">
                    {suggestedUsers.slice(0, 4).map((user) => (
                      <Link key={user.id} href={`/profile/${user.username}`}>
                        <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/[0.05] transition-colors cursor-pointer group">
                          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary/30 to-purple-500/30 flex items-center justify-center overflow-hidden border border-white/10">
                            {user.avatarUrl ? (
                              <img src={user.avatarUrl} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <User className="h-4 w-4 text-white/50" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-white/80 group-hover:text-white truncate">@{user.username}</p>
                            <p className="text-xs text-white/40">{user.barsCount} bars</p>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* Quick Links */}
              <div>
                <h3 className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Zap className="h-3.5 w-3.5" />
                  Quick Links
                </h3>
                <div className="space-y-2">
                  <Link href="/?filter=top">
                    <div className="px-3 py-2.5 rounded-lg bg-gradient-to-r from-purple-500/10 to-pink-500/10 hover:from-purple-500/20 hover:to-pink-500/20 border border-purple-500/20 transition-colors cursor-pointer flex items-center gap-3">
                      <Award className="h-4 w-4 text-purple-400" />
                      <span className="text-sm text-white/80">Leaderboard</span>
                    </div>
                  </Link>
                </div>
              </div>

              {/* Footer Links */}
              <div className="mt-auto pt-4 border-t border-white/5">
                <div className="flex flex-wrap gap-2 text-xs text-white/30">
                  <Link href="/guidelines"><span className="hover:text-white/50 cursor-pointer">Guidelines</span></Link>
                  <span>·</span>
                  <Link href="/terms"><span className="hover:text-white/50 cursor-pointer">Terms</span></Link>
                </div>
                <p className="text-xs text-white/20 mt-2">© 2024 Orphan Bars</p>
              </div>
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}

interface SidebarLinkProps {
  href: string;
  icon: React.ComponentType<{ className?: string }> | (() => React.ReactNode);
  label: string;
  active?: boolean;
  badge?: number;
}

function SidebarLink({ href, icon: Icon, label, active, badge }: SidebarLinkProps) {
  return (
    <Link href={href}>
      <div className={cn(
        "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all cursor-pointer group relative",
        active 
          ? "bg-white/[0.08] text-white shadow-lg shadow-primary/10" 
          : "text-white/50 hover:text-white/80 hover:bg-white/[0.04]"
      )}>
        {active && (
          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-gradient-to-b from-primary to-purple-500 rounded-full" />
        )}
        <Icon className={cn("h-5 w-5 transition-colors", active ? "text-primary" : "group-hover:text-white/70")} />
        <span className="font-medium text-sm">{label}</span>
        {badge !== undefined && badge > 0 && (
          <span className="ml-auto min-w-[20px] h-5 px-1.5 rounded-full bg-primary text-white text-xs font-bold flex items-center justify-center">
            {badge > 99 ? '99+' : badge}
          </span>
        )}
      </div>
    </Link>
  );
}

function StatBox({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: number | string }) {
  return (
    <div className="text-center p-2 rounded-lg bg-white/[0.03]">
      <Icon className="h-4 w-4 text-primary mx-auto mb-1" />
      <p className="text-lg font-bold text-white">{value}</p>
      <p className="text-[10px] text-white/40 uppercase tracking-wider">{label}</p>
    </div>
  );
}

function QuickActionButton({ href, icon: Icon, label, primary }: { href: string; icon: React.ComponentType<{ className?: string }>; label: string; primary?: boolean }) {
  return (
    <Link href={href}>
      <div className={cn(
        "p-3 rounded-xl text-center cursor-pointer transition-all group",
        primary 
          ? "bg-gradient-to-br from-primary/20 to-purple-500/20 border border-primary/30 hover:from-primary/30 hover:to-purple-500/30" 
          : "bg-white/[0.03] border border-white/5 hover:bg-white/[0.06] hover:border-white/10"
      )}>
        <Icon className={cn("h-5 w-5 mx-auto mb-1.5 transition-transform group-hover:scale-110", primary ? "text-primary" : "text-white/50 group-hover:text-white/70")} />
        <span className={cn("text-[11px] font-medium", primary ? "text-white/90" : "text-white/50 group-hover:text-white/70")}>{label}</span>
      </div>
    </Link>
  );
}

interface NavPillProps {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  active?: boolean;
  badge?: number;
}

function NavPill({ href, icon: Icon, label, active, badge }: NavPillProps) {
  return (
    <Link href={href}>
      <div className={cn(
        "flex items-center gap-2 px-4 py-2 rounded-full transition-all cursor-pointer relative",
        active 
          ? "bg-white/[0.12] text-white shadow-lg" 
          : "text-white/50 hover:text-white/80 hover:bg-white/[0.06]"
      )}>
        {active && (
          <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-purple-500/20 rounded-full blur-sm" />
        )}
        <Icon className={cn("h-4 w-4 relative z-10", active ? "text-primary" : "")} />
        <span className="font-medium text-sm relative z-10">{label}</span>
        {badge !== undefined && badge > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center z-20">
            {badge > 99 ? '99+' : badge}
          </span>
        )}
      </div>
    </Link>
  );
}
