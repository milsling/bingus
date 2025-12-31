import { Link, useLocation } from "wouter";
import { Home, User, PlusSquare, Search, BookOpen, LogIn, Shield } from "lucide-react";
import { cn } from "@/lib/utils";
import { useBars } from "@/context/BarContext";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";

export default function Navigation() {
  const [location] = useLocation();
  const { currentUser } = useBars();

  const navItems = [
    { icon: Home, label: "Feed", path: "/" },
    { icon: Search, label: "Discover", path: "/discover" },
  ];

  const authenticatedItems = [
    { icon: PlusSquare, label: "Drop Bar", path: "/post" },
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
        <Link href="/">
          <div className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity">
            <BookOpen className="text-primary h-6 w-6" />
            <span className="font-display font-black text-xl tracking-tighter">ORPHAN BARS</span>
          </div>
        </Link>
        
        <div className="flex items-center gap-8">
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

      {/* Mobile Navigation */}
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
