import { Link, useLocation } from "wouter";
import { Home, User, Plus, LogIn, Shield, Bookmark, Users, MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useBars } from "@/context/BarContext";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import { NotificationBell } from "@/components/NotificationBell";
import { SearchBar } from "@/components/SearchBar";
import { OnlineStatusIndicator } from "@/components/OnlineStatus";
import iconUrl from "@/assets/icon.png";

export default function Navigation() {
  const [location] = useLocation();
  const { currentUser } = useBars();

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

  // Mobile nav: 4 items around the edges, center button for Drop Bar
  const mobileLeftItems = [
    { icon: Home, label: "Feed", path: "/" },
    ...(currentUser ? [{ icon: MessageCircle, label: "Messages", path: "/messages" }] : []),
  ];
  
  const mobileRightItems = [
    { icon: Bookmark, label: "Saved", path: "/saved" },
    { icon: User, label: "Profile", path: "/profile" },
  ];

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
        
        <div className="flex items-center gap-4">
          {/* Left nav items */}
          <Link href="/">
            <div className={cn(
              "flex items-center gap-2 text-sm font-medium transition-colors hover:text-primary cursor-pointer",
              location === "/" ? "text-primary" : "text-muted-foreground"
            )}>
              <Home className="h-4 w-4" />
              Feed
            </div>
          </Link>
          
          {currentUser && (
            <>
              <Link href="/messages">
                <div className={cn(
                  "flex items-center gap-2 text-sm font-medium transition-colors hover:text-primary cursor-pointer",
                  location === "/messages" ? "text-primary" : "text-muted-foreground"
                )}>
                  <MessageCircle className="h-4 w-4" />
                  Messages
                </div>
              </Link>
              
              {/* Prominent Drop Bar button */}
              <Link href="/post">
                <div className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-full bg-primary text-primary-foreground font-bold text-sm transition-transform hover:scale-105 active:scale-95 shadow-md shadow-primary/20",
                  location === "/post" && "ring-2 ring-primary ring-offset-2 ring-offset-background"
                )}>
                  <Plus className="h-4 w-4" />
                  Drop Bar
                </div>
              </Link>
              
              <Link href="/saved">
                <div className={cn(
                  "flex items-center gap-2 text-sm font-medium transition-colors hover:text-primary cursor-pointer",
                  location === "/saved" ? "text-primary" : "text-muted-foreground"
                )}>
                  <Bookmark className="h-4 w-4" />
                  Saved
                </div>
              </Link>
              
              <Link href="/profile">
                <div className={cn(
                  "flex items-center gap-2 text-sm font-medium transition-colors hover:text-primary cursor-pointer",
                  location === "/profile" ? "text-primary" : "text-muted-foreground"
                )}>
                  <User className="h-4 w-4" />
                  Profile
                </div>
              </Link>
              
              {currentUser.isAdmin && (
                <Link href="/admin">
                  <div className={cn(
                    "flex items-center gap-2 text-sm font-medium transition-colors hover:text-primary cursor-pointer",
                    location === "/admin" ? "text-primary" : "text-muted-foreground"
                  )}>
                    <Shield className="h-4 w-4" />
                    Admin
                  </div>
                </Link>
              )}
            </>
          )}
          
          {currentUser && <NotificationBell />}
          
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

      {/* Mobile Top Bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-14 border-b border-border bg-background/90 backdrop-blur-lg z-50 flex items-center justify-between px-4">
        <Link href="/">
          <div className="flex items-center gap-1.5 cursor-pointer">
            <img src={iconUrl} alt="" className="h-6 w-6" />
            <span className="font-logo text-sm whitespace-nowrap">ORPHAN BARS</span>
          </div>
        </Link>
        <div className="flex items-center gap-2">
          {currentUser && <NotificationBell />}
          <OnlineStatusIndicator />
          <ThemeToggle />
        </div>
      </div>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 border-t border-border bg-background/90 backdrop-blur-lg z-50 pb-safe">
        <div className="relative h-full flex items-center justify-between px-6">
          {/* Left side items */}
          <div className="flex items-center gap-6">
            {mobileLeftItems.map((item) => (
              <Link key={item.path} href={item.path}>
                <div className={cn(
                  "flex flex-col items-center gap-0.5 transition-colors cursor-pointer",
                  location === item.path ? "text-primary" : "text-muted-foreground"
                )}>
                  <item.icon className="h-5 w-5" />
                  <span className="text-[9px] font-medium">{item.label}</span>
                </div>
              </Link>
            ))}
          </div>

          {/* Center Drop Bar button */}
          {currentUser ? (
            <Link href="/post">
              <div className="absolute left-1/2 -translate-x-1/2 -top-5">
                <div className={cn(
                  "w-14 h-14 rounded-full bg-primary flex items-center justify-center shadow-lg shadow-primary/30 transition-transform hover:scale-105 active:scale-95",
                  location === "/post" && "ring-2 ring-primary ring-offset-2 ring-offset-background"
                )}>
                  <Plus className="h-7 w-7 text-primary-foreground" />
                </div>
              </div>
            </Link>
          ) : (
            <Link href="/auth">
              <div className="absolute left-1/2 -translate-x-1/2 -top-5">
                <div className="w-14 h-14 rounded-full bg-primary flex items-center justify-center shadow-lg shadow-primary/30 transition-transform hover:scale-105 active:scale-95">
                  <LogIn className="h-6 w-6 text-primary-foreground" />
                </div>
              </div>
            </Link>
          )}

          {/* Right side items */}
          <div className="flex items-center gap-6">
            {currentUser ? (
              <>
                {mobileRightItems.map((item) => (
                  <Link key={item.path} href={item.path}>
                    <div className={cn(
                      "flex flex-col items-center gap-0.5 transition-colors cursor-pointer",
                      location === item.path ? "text-primary" : "text-muted-foreground"
                    )}>
                      <item.icon className="h-5 w-5" />
                      <span className="text-[9px] font-medium">{item.label}</span>
                    </div>
                  </Link>
                ))}
                {currentUser.isAdmin && (
                  <Link href="/admin">
                    <div className={cn(
                      "flex flex-col items-center gap-0.5 transition-colors cursor-pointer",
                      location === "/admin" ? "text-primary" : "text-muted-foreground"
                    )}>
                      <Shield className="h-5 w-5" />
                      <span className="text-[9px] font-medium">Admin</span>
                    </div>
                  </Link>
                )}
              </>
            ) : (
              <>
                <Link href="/auth">
                  <div className={cn(
                    "flex flex-col items-center gap-0.5 transition-colors cursor-pointer",
                    location === "/auth" ? "text-primary" : "text-muted-foreground"
                  )}>
                    <LogIn className="h-5 w-5" />
                    <span className="text-[9px] font-medium">Login</span>
                  </div>
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>
    </>
  );
}
