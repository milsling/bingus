import React, { useRef, useEffect, useCallback } from 'react';
import { Link, useLocation } from 'wouter';
import { motion, AnimatePresence } from 'framer-motion';
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
  Sparkles,
  Shield,
  LogOut,
  ChevronRight,
  ExternalLink
} from 'lucide-react';
import { useBars } from '@/context/BarContext';
import { useTheme } from '@/contexts/ThemeContext';
import { cn } from '@/lib/utils';
import headerLogo from '@/assets/logo.png';

interface MobileNavProps {
  isOpen: boolean;
  onClose: () => void;
}

interface MenuItem {
  href: string;
  label: string;
  icon: React.ComponentType<any>;
  description?: string;
}

interface ActionItem {
  action: () => void;
  label: string;
  icon: React.ComponentType<any>;
  description?: string;
  external?: boolean;
}
r5
type MenuItemUnion = MenuItem | ActionItem;

// Type guard functions
function isMenuItem(item: MenuItemUnion): item is MenuItem {
  return 'href' in item;
}

function isActionItem(item: MenuItemUnion): item is ActionItem {
  return 'action' in item;
}

interface MenuSection {
  title: string;
  icon: React.ComponentType<any>;
  items: MenuItemUnion[];
  
}
// Animation variants
const overlayVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.25 } },
  exit: { opacity: 0, transition: { duration: 0.2 } },
};

const panelVariants = {
  hidden: { x: '-100%', opacity: 0.5 },
  visible: {
    x: 0,
    opacity: 1,
    transition: { type: 'spring', damping: 28, stiffness: 300, mass: 0.8 },
  },
  exit: {
    x: '-100%',
    opacity: 0,
    transition: { duration: 0.22, ease: [0.4, 0, 1, 1] },
  },
};

const staggerContainer = {
  visible: {
    transition: { staggerChildren: 0.04, delayChildren: 0.12 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, x: -16, scale: 0.96 },
  visible: {
    opacity: 1,
    x: 0,
    scale: 1,
    transition: { type: 'spring', damping: 22, stiffness: 260 },
  },
};

const profileVariants = {
  hidden: { opacity: 0, y: -12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring', damping: 20, stiffness: 200, delay: 0.06 },
  },
};

export default function MobileNav({ isOpen, onClose }: MobileNavProps) {
  const { currentUser, logout } = useBars();
  const { settings } = useTheme();
  const [location, setLocation] = useLocation();
  const menuRef = useRef<HTMLDivElement>(null);

  // Lock body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = ''; };
    }
  }, [isOpen]);

  // Close menu on escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen, onClose]);

  const handleLogout = useCallback(async () => {
    await logout();
    onClose();
    setLocation('/');
  }, [logout, onClose, setLocation]);

  const menuSections: MenuSection[] = [
    {
      title: 'Explore',
      icon: Compass,
      items: [
        { href: '/', label: 'Home', icon: Home, description: 'Your feed' },
        { href: '/prompts', label: 'Prompts', icon: PenLine, description: 'Get inspired' },
        { href: '/orphanstudio', label: 'Orphan Studio', icon: NotebookPen, description: 'Create & mix' },
        { href: '/challenges', label: 'Challenges', icon: Swords, description: 'Compete' },
      ]
    },
    {
      title: 'Create',
      icon: Sparkles,
      items: [
        { 
          action: () => {},
          label: 'Orphie Voice', 
          icon: Radio,
          description: 'AI assistant',
          external: true 
        },
      ]
    },
    {
      title: 'Account',
      icon: User,
      items: currentUser ? [
        { href: '/profile', label: 'My Bars', icon: User, description: 'Your profile' },
        { href: '/messages', label: 'Messages', icon: MessageCircle, description: 'Chat' },
        { href: '/friends', label: 'Friends', icon: Users, description: 'Your crew' },
        { href: '/saved', label: 'Saved', icon: Bookmark, description: 'Bookmarks' },
        { href: '/settings', label: 'Settings', icon: Settings2, description: 'Preferences' },
      ] : [
        { href: '/auth', label: 'Sign In', icon: User, description: 'Join the community' },
      ]
    }
  ];

  if (currentUser?.isAdmin || currentUser?.isAdminPlus || currentUser?.isOwner) {
    menuSections.push({
      title: 'Admin',
      icon: Shield,
      items: [
        { href: '/admin', label: 'Admin Panel', icon: Shield, description: 'Manage site' },
      ]
    });
  }

  // Flatten all items for global stagger index
  const allItems: { section: MenuSection; item: MenuItemUnion; globalIndex: number }[] = [];
  menuSections.forEach((section) => {
    section.items.forEach((item) => {
      allItems.push({ section, item, globalIndex: allItems.length });
    });
  });

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            key="mobile-nav-backdrop"
            variants={overlayVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="fixed inset-0 z-[1300] bg-black/40 backdrop-blur-md"
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            key="mobile-nav-panel"
            ref={menuRef}
            variants={panelVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="fixed left-0 top-0 bottom-0 z-[1301] w-[min(92vw,480px)] flex flex-col overflow-hidden"
            style={{
              background: 'var(--glass-surface-bg)',
              backdropFilter: 'blur(40px) saturate(160%)',
              WebkitBackdropFilter: 'blur(40px) saturate(160%)',
              borderRight: '1px solid var(--glass-surface-border)',
              boxShadow: '8px 0 40px rgba(0,0,0,0.25), 0 0 0 1px rgba(255,255,255,0.04) inset',
            }}
          >
            {/* ── Header ── */}
            <div className="relative flex items-center justify-between px-5 pt-[max(env(safe-area-inset-top),12px)] pb-3">
              {/* Subtle gradient glow behind header */}
              <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-primary/[0.07] to-transparent pointer-events-none" />

              <div className="relative flex items-center gap-3">
                <div className="relative h-9 w-9 rounded-xl bg-gradient-to-br from-primary/25 to-primary/10 flex items-center justify-center ring-1 ring-primary/20">
                  <img src={headerLogo} alt="" className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="font-logo text-base leading-none text-foreground tracking-wide">
                    ORPHANBARS
                  </h2>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Navigate your world</p>
                </div>
              </div>

              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={onClose}
                className="relative z-10 h-8 w-8 rounded-full flex items-center justify-center bg-foreground/[0.06] hover:bg-foreground/[0.12] border border-border/30 transition-colors"
                aria-label="Close menu"
              >
                <X className="h-4 w-4 text-foreground/70" />
              </motion.button>
            </div>

            {/* Divider */}
            <div className="mx-5 h-px bg-gradient-to-r from-transparent via-border/40 to-transparent" />

            {/* ── User Profile Card ── */}
            {currentUser && (
              <motion.div variants={profileVariants} initial="hidden" animate="visible" className="px-4 pt-4 pb-2">
                <div className="flex items-center gap-4 p-4 rounded-2xl bg-primary/[0.05] border border-primary/10">
                  <Link href={`/u/${currentUser.username}`} onClick={onClose} className="relative shrink-0 group">
                    <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-primary/30 via-primary/20 to-purple-500/15 flex items-center justify-center ring-2 ring-primary/20 ring-offset-2 ring-offset-background group-hover:ring-primary/40 transition-all">
                      <span className="text-primary font-bold text-xl">
                        {currentUser.username[0]?.toUpperCase()}
                      </span>
                    </div>
                    <div className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-emerald-500 border-2 border-background" />
                  </Link>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-base text-foreground truncate">
                      {currentUser.displayName || currentUser.username}
                    </div>
                    <div className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5">
                      <span>@{currentUser.username}</span>
                      {currentUser.isOwner && (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-orange-500/15 text-orange-400 ring-1 ring-orange-500/20">Owner</span>
                      )}
                      {currentUser.isAdminPlus && !currentUser.isOwner && (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-purple-500/15 text-purple-400 ring-1 ring-purple-500/20">Admin+</span>
                      )}
                      {currentUser.isAdmin && !currentUser.isAdminPlus && !currentUser.isOwner && (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-primary/15 text-primary ring-1 ring-primary/20">Admin</span>
                      )}
                    </div>
                  </div>
                  <Link href={`/u/${currentUser.username}`} onClick={onClose}>
                    <div className="p-2 rounded-xl hover:bg-white/[0.06] transition-colors">
                      <ChevronRight className="h-4 w-4 text-muted-foreground/50" />
                    </div>
                  </Link>
                </div>
              </motion.div>
            )}

            {/* ── Scrollable Menu Body ── */}
            <motion.div
              variants={staggerContainer}
              initial="hidden"
              animate="visible"
              className="flex-1 overflow-y-auto overflow-x-hidden px-4 pt-2 pb-4 space-y-4"
            >
              {menuSections.map((section) => (
                <div key={section.title}>
                  {/* Section label */}
                  <div className="flex items-center gap-2 px-1 mb-2">
                    <section.icon className="h-3.5 w-3.5 text-primary/60" />
                    <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground/70">
                      {section.title}
                    </span>
                    <div className="flex-1 h-px bg-gradient-to-r from-border/30 to-transparent" />
                  </div>

                  {/* Items — two-column grid */}
                  <div className="grid grid-cols-2 gap-1.5">
                    {section.items.map((item) => {
                      const isActive = isMenuItem(item) && location === item.href;

                      const content = (
                        <motion.div
                          variants={itemVariants}
                          whileTap={{ scale: 0.97 }}
                          className={cn(
                            "group relative flex items-center gap-2.5 px-3 py-3 rounded-xl transition-all duration-150",
                            isActive
                              ? "bg-primary/[0.12] border border-primary/25 shadow-[0_0_20px_rgba(168,85,247,0.08)]"
                              : "border border-border/10 bg-foreground/[0.02] hover:bg-foreground/[0.05] hover:border-border/25"
                          )}
                        >
                          {/* Icon container */}
                          <div
                            className={cn(
                              "relative shrink-0 h-8 w-8 rounded-lg flex items-center justify-center transition-all duration-200",
                              isActive
                                ? "bg-primary text-white shadow-[0_4px_12px_rgba(168,85,247,0.3)]"
                                : "bg-foreground/[0.06] text-muted-foreground group-hover:bg-foreground/[0.1] group-hover:text-foreground"
                            )}
                          >
                            <item.icon className="h-3.5 w-3.5" />
                            {isActive && (
                              <div className="absolute inset-0 rounded-lg bg-primary/20 blur-md" />
                            )}
                          </div>

                          {/* Label + description */}
                          <div className="flex-1 min-w-0">
                            <div className={cn(
                              "text-xs font-semibold leading-tight",
                              isActive ? "text-primary" : "text-foreground"
                            )}>
                              {item.label}
                            </div>
                            {item.description && (
                              <div className="text-[10px] text-muted-foreground/60 leading-tight mt-0.5 truncate">
                                {item.description}
                              </div>
                            )}
                          </div>

                          {/* Trailing icon */}
                          {isActionItem(item) && item.external && (
                            <ExternalLink className="h-3 w-3 text-muted-foreground/40 shrink-0" />
                          )}
                        </motion.div>
                      );

                      if (isMenuItem(item)) {
                        return (
                          <Link key={item.label} href={item.href} onClick={onClose} className="block">
                            {content}
                          </Link>
                        );
                      }

                      return (
                        <button
                          key={item.label}
                          onClick={() => { item.action(); onClose(); }}
                          className="block w-full text-left"
                        >
                          {content}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </motion.div>

            {/* ── Footer ── */}
            <div className="shrink-0">
              <div className="mx-5 h-px bg-gradient-to-r from-transparent via-border/40 to-transparent" />
              {currentUser ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1, transition: { delay: 0.3 } }}
                  className="px-4 py-3"
                >
                  <button
                    onClick={handleLogout}
                    className="group flex items-center gap-3 w-full px-3 py-2.5 rounded-xl border border-transparent hover:border-red-500/15 hover:bg-red-500/[0.06] transition-all duration-200"
                  >
                    <div className="h-9 w-9 rounded-xl bg-red-500/10 text-red-400 group-hover:bg-red-500/15 transition-colors flex items-center justify-center">
                      <LogOut className="h-4 w-4" />
                    </div>
                    <span className="text-sm font-medium text-red-400">Sign Out</span>
                  </button>
                </motion.div>
              ) : (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1, transition: { delay: 0.3 } }}
                  className="px-4 py-3"
                >
                  <Link href="/auth" onClick={onClose} className="block">
                    <div className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-white font-medium text-sm transition-all hover:bg-primary/90 active:scale-[0.97]">
                      <User className="h-4 w-4" />
                      <span>Sign In</span>
                    </div>
                  </Link>
                </motion.div>
              )}
              {/* Safe area padding */}
              <div className="h-[env(safe-area-inset-bottom)]" />
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
