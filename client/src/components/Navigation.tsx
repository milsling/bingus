import { Link, useLocation } from "wouter";
import { Home, User, PlusSquare, Search, BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";

export default function Navigation() {
  const [location] = useLocation();

  const navItems = [
    { icon: Home, label: "Feed", path: "/" },
    { icon: Search, label: "Discover", path: "/discover" },
    { icon: PlusSquare, label: "Drop Bar", path: "/post" },
    { icon: User, label: "Profile", path: "/profile" },
  ];

  return (
    <>
      {/* Desktop Navigation */}
      <nav className="hidden md:flex fixed top-0 left-0 right-0 h-16 border-b border-border bg-background/80 backdrop-blur-md z-50 items-center px-6 justify-between">
        <div className="flex items-center gap-2">
          <BookOpen className="text-primary h-6 w-6" />
          <span className="font-display font-bold text-xl tracking-tighter">RHYME BOOK</span>
        </div>
        
        <div className="flex items-center gap-8">
          {navItems.map((item) => (
            <Link key={item.path} href={item.path}>
              <a className={cn(
                "flex items-center gap-2 text-sm font-medium transition-colors hover:text-primary",
                location === item.path ? "text-primary" : "text-muted-foreground"
              )}>
                <item.icon className="h-4 w-4" />
                {item.label}
              </a>
            </Link>
          ))}
        </div>
      </nav>

      {/* Mobile Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 border-t border-border bg-background/90 backdrop-blur-lg z-50 flex items-center justify-around px-2 pb-safe">
        {navItems.map((item) => (
          <Link key={item.path} href={item.path}>
            <a className={cn(
              "flex flex-col items-center gap-1 p-2 transition-colors",
              location === item.path ? "text-primary" : "text-muted-foreground"
            )}>
              <item.icon className={cn("h-6 w-6", location === item.path && "fill-current/20")} />
              <span className="text-[10px] font-medium">{item.label}</span>
            </a>
          </Link>
        ))}
      </nav>
    </>
  );
}
