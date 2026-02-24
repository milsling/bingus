import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation } from 'wouter';
import { 
  Home, 
  Compass, 
  PenLine, 
  NotebookPen, 
  Radio, 
  Swords, 
  Settings2, 
  User, 
  MessageCircle, 
  Users, 
  Bookmark,
  X,
  ChevronRight,
  Sparkles,
  Heart,
  Shield,
  LogOut
} from 'lucide-react';
import { useBars } from '@/context/BarContext';
import { useTheme } from '@/contexts/ThemeContext';
import { cn } from '@/lib/utils';

interface MobileNavProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function MobileNav({ isOpen, onClose }: MobileNavProps) {
  const { currentUser, logout } = useBars();
  const { settings } = useTheme();
  const [location] = useLocation();
  const menuRef = useRef<HTMLDivElement>(null);
  const [activeSection, setActiveSection] = useState<string | null>(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen, onClose]);

  // Close menu on escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen, onClose]);

  const handleLogout = async () => {
    await logout();
    onClose();
  };

  const menuSections = [
    {
      title: 'Explore',
      icon: Compass,
      items: [
        { href: '/', label: 'Home', icon: Home },
        { href: '/prompts', label: 'Prompts', icon: PenLine },
        { href: '/orphanstudio', label: 'Orphan Studio', icon: NotebookPen },
        { href: '/challenges', label: 'Challenges', icon: Swords },
      ]
    },
    {
      title: 'Create',
      icon: Sparkles,
      items: [
        { 
          action: () => {}, // Will be handled by AIAssistant
          label: 'Orphie Voice', 
          icon: Radio,
          external: true 
        },
      ]
    },
    {
      title: 'Account',
      icon: User,
      items: currentUser ? [
        { href: '/profile', label: 'My Bars', icon: User },
        { href: '/messages', label: 'Messages', icon: MessageCircle },
        { href: '/friends', label: 'Friends', icon: Users },
        { href: '/saved', label: 'Saved', icon: Bookmark },
        { href: '/settings', label: 'Settings', icon: Settings2 },
      ] : [
        { href: '/auth', label: 'Sign In', icon: User },
      ]
    }
  ];

  if (currentUser?.isAdmin || currentUser?.isAdminPlus || currentUser?.isOwner) {
    menuSections.push({
      title: 'Admin',
      icon: Shield,
      items: [
        { href: '/admin', label: 'Admin Panel', icon: Shield },
      ]
    });
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          "fixed inset-0 bg-black/20 backdrop-blur-sm z-[1300] transition-opacity duration-300",
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        onClick={onClose}
      />

      {/* Menu Panel */}
      <div
        ref={menuRef}
        className={cn(
          "fixed left-0 top-0 bottom-0 w-80 transform transition-transform duration-300 ease-out overflow-hidden mobile-nav",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border/30">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">Menu</h2>
              <p className="text-xs text-muted-foreground">Navigate your world</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl transition-colors mobile-nav-button"
            aria-label="Close menu"
          >
            <X className="h-5 w-5 text-foreground/70" />
          </button>
        </div>

        {/* User Profile Section */}
        {currentUser && (
          <div className="p-4 border-b border-border/30">
            <Link
              href={`/u/${currentUser.username}`}
              onClick={onClose}
              className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/[0.05] transition-colors group"
            >
              <div className="h-12 w-12 rounded-full bg-gradient-to-br from-primary/30 to-primary/20 flex items-center justify-center">
                <span className="text-primary font-bold text-lg">
                  {currentUser.username[0]?.toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-foreground group-hover:text-primary transition-colors">
                  {currentUser.displayName || currentUser.username}
                </div>
                <div className="text-xs text-muted-foreground">
                  {currentUser.isAdmin && <span className="text-primary">Admin</span>}
                  {currentUser.isAdminPlus && <span className="text-purple-400">Admin+</span>}
                  {currentUser.isOwner && <span className="text-orange-400">Owner</span>}
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
            </Link>
          </div>
        )}

        {/* Menu Items */}
        <div className="flex-1 overflow-y-auto">
          {menuSections.map((section, sectionIndex) => (
            <div key={section.title} className="mb-6">
              <div className="px-4 mb-2">
                <div className="flex items-center gap-2">
                  <section.icon className="h-4 w-4 text-primary" />
                  <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">
                    {section.title}
                  </h3>
                </div>
              </div>
              <div className="space-y-1">
                {section.items.map((item, itemIndex) => (
                  <div key={item.label}>
                    {item.href ? (
                      <Link
                        href={item.href}
                        onClick={onClose}
                        className={cn(
                          "flex items-center gap-3 px-4 py-3 mx-2 rounded-xl transition-all duration-200 group",
                          location === item.href
                            ? "bg-primary/10 text-primary border border-primary/30"
                            : "hover:bg-white/[0.05] text-foreground border border-transparent"
                        )}
                      >
                        <div className={cn(
                          "h-8 w-8 rounded-lg flex items-center justify-center",
                          location === item.href
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted/50 text-muted-foreground group-hover:text-foreground group-hover:bg-muted transition-colors"
                        )}>
                          <item.icon className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium">{item.label}</div>
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                      </Link>
                    ) : (
                      <button
                        onClick={() => {
                          item.action?.();
                          onClose();
                        }}
                        className="flex items-center gap-3 px-4 py-3 mx-2 rounded-xl hover:bg-white/[0.05] text-foreground border border-transparent transition-all duration-200 group w-full"
                      >
                        <div className="h-8 w-8 rounded-lg bg-muted/50 text-muted-foreground group-hover:text-foreground group-hover:bg-muted transition-colors flex items-center justify-center">
                          <item.icon className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0 text-left">
                          <div className="font-medium">{item.label}</div>
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        {currentUser && (
          <div className="p-4 border-t border-border/30">
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 w-full px-4 py-3 rounded-xl hover:bg-red-500/10 text-red-500 border border-transparent transition-all duration-200 group"
            >
              <div className="h-8 w-8 rounded-lg bg-red-500/10 text-red-500 group-hover:bg-red-500/20 transition-colors flex items-center justify-center">
                <LogOut className="h-4 w-4" />
              </div>
              <div className="font-medium">Sign Out</div>
              <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-red-500 transition-colors" />
            </button>
          </div>
        )}
      </div>
    </>
  );
}
