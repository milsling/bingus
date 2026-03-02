import React, { useRef } from 'react';
import { Link, useLocation } from 'wouter';
import { motion } from 'framer-motion';
import type { Variants } from 'framer-motion';
import { 
  Home, 
  Compass, 
  Plus,
  LogIn,
  PenLine, 
  NotebookPen, 
  Radio, 
  Swords, 
  Settings2, 
  User, 
  MessageCircle, 
  Users, 
  Bookmark,
  Sparkles,
  Shield,
  LogOut,
  UserCog,
  ChevronRight,
  ExternalLink
} from 'lucide-react';
import { useBars } from '@/context/BarContext';
import { useTheme } from '@/contexts/ThemeContext';
import { cn } from '@/lib/utils';
import headerLogo from '@/assets/logo.png';
import { SearchBar } from '@/components/SearchBar';
import { NotificationBell } from '@/components/NotificationBell';
import { OnlineStatusIndicator } from '@/components/OnlineStatus';
import ThumbNavTab, { useThumbNavClose } from './ThumbNavTab';

interface MenuItem {
  href?: string;
  action?: () => void;
  label: string;
  icon: React.ComponentType<any>;
  description?: string;
  external?: boolean;
}

interface MenuSection {
  title: string;
  icon: React.ComponentType<any>;
  items: MenuItem[];
}

function NavContent() {
  const { currentUser, logout } = useBars();
  const { theme, setTheme } = useTheme();
  const [location, setLocation] = useLocation();
  const close = useThumbNavClose();
  const isOnMessagesPage = location.startsWith('/messages');

  // Triple-tap logo for owner console secret access
  const tapCountRef = useRef(0);
  const tapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleLogoTap = () => {
    if (!currentUser?.isOwner) return;
    tapCountRef.current += 1;
    if (tapTimerRef.current) clearTimeout(tapTimerRef.current);
    tapTimerRef.current = setTimeout(() => { tapCountRef.current = 0; }, 600);
    if (tapCountRef.current >= 3) {
      tapCountRef.current = 0;
      close();
      setLocation('/owner-console');
    }
  };

  const handleLogout = async () => {
    close();
    await logout();
  };

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

  const itemVariants: Variants = {
    hidden: { opacity: 0, x: 20, scale: 0.96 },
    visible: {
      opacity: 1,
      x: 0,
      scale: 1,
      transition: { type: 'spring' as const, damping: 22, stiffness: 260 }
    }
  };

  const staggerContainer: Variants = {
    visible: {
      transition: { staggerChildren: 0.04, delayChildren: 0.1 }
    }
  };

  return (
    <div className="h-full flex flex-col">
        {/* Header */}
        <div className="relative flex items-center justify-between px-5 pt-[max(env(safe-area-inset-top),12px)] pb-4">
          {/* Gradient glow */}
          <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-primary/[0.07] to-transparent pointer-events-none" />

          <div className="relative flex items-center gap-3" onClick={handleLogoTap}>
            <div className="relative h-10 w-10 rounded-xl bg-gradient-to-br from-primary/25 to-primary/10 flex items-center justify-center ring-1 ring-primary/20">
              <img src={headerLogo} alt="" className="h-6 w-6" />
            </div>
            <div>
              <h2 className="font-logo text-lg leading-none text-foreground tracking-wide">
                ORPHANBARS
              </h2>
              <p className="text-[10px] text-muted-foreground mt-0.5">Navigate your world</p>
            </div>
          </div>
        </div>

        {/* Desktop-like controls */}
        <div className="px-4 pb-3 space-y-3">
          <SearchBar className="w-full" />

          <div className="flex gap-2">
            <Link href={currentUser ? '/settings' : '/auth'} className="block flex-1" onClick={close}>
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl border border-border/30 text-xs font-medium hover:bg-foreground/[0.04] transition-colors">
                <UserCog className="h-4 w-4" />
                <span>Settings</span>
              </div>
            </Link>
          </div>

          <div className="flex items-center gap-2">
            {currentUser ? (
              <>
                <button
                  type="button"
                  onClick={() => { close(); setLocation(isOnMessagesPage ? '/messages' : '/post'); }}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-primary text-white text-xs font-semibold hover:bg-primary/90 transition-colors"
                >
                  {isOnMessagesPage ? <PenLine className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                  <span>{isOnMessagesPage ? 'Messages' : 'Drop Bar'}</span>
                </button>
                <NotificationBell compact />
                <OnlineStatusIndicator compact />
              </>
            ) : (
              <Link href="/auth" className="block w-full" onClick={close}>
                <div className="flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-primary text-white text-xs font-semibold hover:bg-primary/90 transition-colors">
                  <LogIn className="h-4 w-4" />
                  <span>Login</span>
                </div>
              </Link>
            )}
          </div>
        </div>

        {/* User Profile Card */}
        {currentUser && (
          <motion.div 
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="px-4 pb-4"
          >
            <Link
              href={`/u/${currentUser.username}`}
              className="group flex items-center gap-3 p-3 rounded-2xl transition-all duration-200 hover:bg-primary/[0.06] border border-transparent hover:border-primary/15"
              onClick={close}
            >
              <div className="relative shrink-0">
                <div className="h-12 w-12 rounded-full bg-gradient-to-br from-primary/30 via-primary/20 to-purple-500/15 flex items-center justify-center ring-2 ring-primary/20 ring-offset-1 ring-offset-background">
                  <span className="text-primary font-bold text-lg">
                    {currentUser.username[0]?.toUpperCase()}
                  </span>
                </div>
                {/* Online dot */}
                <div className="absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full bg-emerald-500 border-2 border-background" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm text-foreground group-hover:text-primary transition-colors truncate">
                  {currentUser.displayName || currentUser.username}
                </div>
                <div className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-1.5">
                  <span className="truncate">@{currentUser.username}</span>
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
              <ChevronRight className="h-4 w-4 text-muted-foreground/50 group-hover:text-primary/70 transition-colors shrink-0" />
            </Link>
          </motion.div>
        )}

        {/* Menu Items */}
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
          className="flex-1 overflow-y-auto overflow-x-hidden px-4 pb-4 space-y-5"
        >
          {menuSections.map((section, sectionIndex) => (
            <motion.div
              key={section.title}
              variants={itemVariants}
              custom={sectionIndex}
            >
              {/* Section label */}
              <div className="flex items-center gap-2 px-1 mb-2">
                <section.icon className="h-3.5 w-3.5 text-primary/60" />
                <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground/70">
                  {section.title}
                </span>
                <div className="flex-1 h-px bg-gradient-to-r from-border/30 to-transparent" />
              </div>

              {/* Items */}
              <div className="space-y-1">
                {section.items.map((item) => {
                  const isActive = item.href && location === item.href;

                  const content = (
                    <motion.div
                      variants={itemVariants}
                      whileTap={{ scale: 0.97 }}
                      className={cn(
                        "group relative flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-150",
                        isActive
                          ? "bg-primary/[0.12] border border-primary/25 shadow-[0_0_20px_rgba(168,85,247,0.08)]"
                          : "border border-transparent hover:bg-foreground/[0.04] hover:border-border/20"
                      )}
                    >
                      {/* Icon container */}
                      <div
                        className={cn(
                          "relative shrink-0 h-9 w-9 rounded-xl flex items-center justify-center transition-all duration-200",
                          isActive
                            ? "bg-primary text-white shadow-[0_4px_12px_rgba(168,85,247,0.3)]"
                            : "bg-foreground/[0.05] text-muted-foreground group-hover:bg-foreground/[0.08] group-hover:text-foreground"
                        )}
                      >
                        <item.icon className="h-4 w-4" />
                        {isActive && (
                          <div className="absolute inset-0 rounded-xl bg-primary/20 blur-md" />
                        )}
                      </div>

                      {/* Label + description */}
                      <div className="flex-1 min-w-0">
                        <div className={cn(
                          "text-sm font-medium leading-tight",
                          isActive ? "text-primary" : "text-foreground"
                        )}>
                          {item.label}
                        </div>
                        {item.description && (
                          <div className="text-[11px] text-muted-foreground/60 leading-tight mt-0.5">
                            {item.description}
                          </div>
                        )}
                      </div>

                      {/* Trailing icon */}
                      {item.external ? (
                        <ExternalLink className="h-3.5 w-3.5 text-muted-foreground/40 shrink-0" />
                      ) : (
                        <ChevronRight className={cn(
                          "h-3.5 w-3.5 shrink-0 transition-all duration-150",
                          isActive
                            ? "text-primary/60"
                            : "text-muted-foreground/30 group-hover:text-muted-foreground/60 group-hover:translate-x-0.5"
                        )} />
                      )}
                    </motion.div>
                  );

                  if (item.href) {
                    return (
                      <Link key={item.label} href={item.href} className="block" onClick={close}>
                        {content}
                      </Link>
                    );
                  }

                  return (
                    <button
                      key={item.label}
                      onClick={() => { close(); item.action?.(); }}
                      className="block w-full text-left"
                    >
                      {content}
                    </button>
                  );
                })}
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Footer */}
        <div className="shrink-0">
          <div className="mx-5 h-px bg-gradient-to-r from-transparent via-border/40 to-transparent mb-3" />
          <div className="px-4 pb-3">
            {currentUser ? (
              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                onClick={handleLogout}
                className="group flex items-center gap-3 w-full px-3 py-2.5 rounded-xl border border-transparent hover:border-red-500/15 hover:bg-red-500/[0.06] transition-all duration-200"
              >
                <div className="h-9 w-9 rounded-xl bg-red-500/10 text-red-400 group-hover:bg-red-500/15 transition-colors flex items-center justify-center">
                  <LogOut className="h-4 w-4" />
                </div>
                <span className="text-sm font-medium text-red-400">Sign Out</span>
              </motion.button>
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
              >
                <Link href="/auth" className="block" onClick={close}>
                  <div className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-white font-medium text-sm transition-all hover:bg-primary/90 active:scale-[0.97]">
                    <User className="h-4 w-4" />
                    <span>Sign In</span>
                  </div>
                </Link>
              </motion.div>
            )}
          </div>
          {/* Safe area padding */}
          <div className="h-[env(safe-area-inset-bottom)]" />
        </div>
      </div>
  );
}

export default function ThumbNavigation() {
  return (
    <ThumbNavTab>
      <NavContent />
    </ThumbNavTab>
  );
}
