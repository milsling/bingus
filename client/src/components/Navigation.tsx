import { Link, useLocation } from "wouter";
import { Home, User, PlusSquare, LogIn, Shield, Bookmark, Users, MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useBars } from "@/context/BarContext";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import { NotificationBell } from "@/components/NotificationBell";
import { SearchBar } from "@/components/SearchBar";
import { OnlineStatusIndicator } from "@/components/OnlineStatus";

export default function Navigation() {
  const [location] = useLocation();
  const { currentUser } = useBars();

  const navItems = [
    { icon: Home, label: "Feed", path: "/" },
  ];

  const authenticatedItems = [
    { icon: PlusSquare, label: "Drop Bar", path: "/post" },
    { icon: Users, label: "Friends", path: "/friends" },
    { icon: MessageCircle, label: "Messages", path: "/messages" },
    { icon: Bookmark, label: "Saved", path: "/saved" },
    { icon: User, label: "Profile", path: "/profile" },
  ];

  const adminItems = currentUser?.isAdmin ? [
    { icon: Shield, label: "Admin", path: "/admin" },
  ] : [];

  const allItems = currentUser ? [...navItems, ...authenticatedItems, ...adminItems] : navItems;

  return (
    <>
      {/* Desktop Navigation */}
      <nav className="hidden md:flex fixed top-0 left-0 right-0 h-16 border-b border-border bg-background/80 backdrop-blur-md z-50 items-center px-6 justify-between">
        <div className="flex items-center gap-6">
          <Link href="/">
            <div className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity">
              <img src="/logo.png" alt="" className="h-8 w-8" />
              <span className="font-logo text-xl">ORPHAN BARS</span>
            </div>
          </Link>
          <SearchBar className="w-64" />
        </div>
        
        <div className="flex items-center gap-6">
          {allItems.map((item) => (
            <Link key={item.path} href={item.path}>
              <div className={cn(
                "flex items-center gap-2 text-sm font-medium transition-colors hover:text-primary cursor-pointer",
                location === item.path ? "text-primary" : "text-muted-foreground"
              )}>
                <item.icon className="h-4 w-4" />
                {item.label}
              </div>
            </Link>
          ))}
          
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
            <img src="/favicon.png" alt="" className="h-6 w-6" />
            <span className="font-logo text-base leading-none">ORPHAN BARS</span>
          </div>
        </Link>
        <div className="flex items-center gap-2">
          {currentUser && <NotificationBell />}
          <OnlineStatusIndicator />
          <ThemeToggle />
        </div>
      </div>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 border-t border-border bg-background/90 backdrop-blur-lg z-50 flex items-center justify-around px-2 pb-safe">
        {allItems.map((item) => (
          <Link key={item.path} href={item.path}>
            <div className={cn(
              "flex flex-col items-center gap-1 p-2 transition-colors cursor-pointer",
              location === item.path ? "text-primary" : "text-muted-foreground"
            )}>
              <item.icon className={cn("h-6 w-6", location === item.path && "fill-current/20")} />
              <span className="text-[10px] font-medium">{item.label}</span>
            </div>
          </Link>
        ))}
        
        {!currentUser && (
          <Link href="/auth">
            <div className={cn(
              "flex flex-col items-center gap-1 p-2 transition-colors cursor-pointer",
              location === "/auth" ? "text-primary" : "text-muted-foreground"
            )}>
              <LogIn className={cn("h-6 w-6", location === "/auth" && "fill-current/20")} />
              <span className="text-[10px] font-medium">Login</span>
            </div>
          </Link>
        )}
      </nav>
    </>
  );
}
