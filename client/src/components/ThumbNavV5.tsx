import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Home, PenLine, NotebookPen, Swords, User, MessageCircle, Users, Bookmark, Settings2, Shield, LogOut, UserCog, Plus, ChevronRight } from 'lucide-react';
import { useBars } from '@/context/BarContext';
import { useLocation, Link } from 'wouter';
import { cn } from '@/lib/utils';

// ThumbNav v5: Liquid FAB + Radial Menu
export default function ThumbNavV5({ children }: { children?: React.ReactNode }) {
  const { currentUser, logout } = useBars();
  const [location, setLocation] = useLocation();
  const [open, setOpen] = useState(false);

  // Menu items (simplified for demo)
  const menuItems = [
    { label: 'Home', icon: Home, href: '/' },
    { label: 'Prompts', icon: PenLine, href: '/prompts' },
    { label: 'Studio', icon: NotebookPen, href: '/orphanstudio' },
    { label: 'Challenges', icon: Swords, href: '/challenges' },
    { label: 'Profile', icon: User, href: currentUser ? `/u/${currentUser.username}` : '/auth' },
    { label: 'Messages', icon: MessageCircle, href: '/messages' },
    { label: 'Friends', icon: Users, href: '/friends' },
    { label: 'Saved', icon: Bookmark, href: '/saved' },
    { label: 'Settings', icon: Settings2, href: '/settings' },
  ];

  // Radial positions for menu items
  const radius = 96;
  const angleStep = (Math.PI * 2) / menuItems.length;

  return (
    <>
      {/* Floating Action Button (FAB) */}
      <motion.button
        className="fixed bottom-6 right-6 z-[1200] rounded-full shadow-xl glass-panel"
        initial={{ scale: 1 }}
        animate={{ scale: open ? 1.08 : 1, boxShadow: open ? '0 0 0 16px rgba(168,85,247,0.12)' : '0 4px 24px rgba(168,85,247,0.18)' }}
        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        onClick={() => setOpen((v) => !v)}
        aria-label="Open menu"
      >
        <motion.div
          animate={{ rotate: open ? 45 : 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        >
          <Plus className="h-8 w-8 text-accent" />
        </motion.div>
      </motion.button>

      {/* Radial Menu */}
      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed bottom-6 right-6 z-[1199] pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {menuItems.map((item, i) => {
              const angle = i * angleStep - Math.PI / 2;
              const x = Math.cos(angle) * radius;
              const y = Math.sin(angle) * radius;
              return (
                <motion.button
                  key={item.label}
                  className={cn(
                    'absolute pointer-events-auto flex flex-col items-center justify-center rounded-full glass-panel text-foreground shadow-lg',
                    'w-14 h-14',
                    'hover:bg-accent/90 transition-colors',
                  )}
                  style={{
                    left: x,
                    top: y,
                  }}
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0, opacity: 0 }}
                  transition={{ delay: 0.05 * i, type: 'spring', stiffness: 300, damping: 20 }}
                  onClick={() => {
                    setOpen(false);
                    if (item.href) setLocation(item.href);
                  }}
                >
                  <item.icon className="h-6 w-6 mb-1 text-accent" />
                  <span className="text-xs font-medium leading-tight">{item.label}</span>
                </motion.button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
      {/* Render children (main nav content) but hide on mobile */}
      <div className="hidden md:block">{children}</div>
    </>
  );
}
