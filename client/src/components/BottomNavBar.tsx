import React from 'react';
import { motion } from 'framer-motion';
import { Home, Compass, Plus, MessageCircle, User } from 'lucide-react';
import { useLocation, Link } from 'wouter';
import { cn } from '@/lib/utils';
import { useBars } from '@/context/BarContext';

interface BottomNavBarProps {
  onMenuToggle: () => void;
  isMenuOpen: boolean;
}

export default function BottomNavBar({ onMenuToggle, isMenuOpen }: BottomNavBarProps) {
  const [location, setLocation] = useLocation();
  const { currentUser } = useBars();

  const navItems = [
    { label: 'Home', icon: Home, href: '/', position: 'left' },
    { label: 'Explore', icon: Compass, href: '/prompts', position: 'left' },
    { label: 'Menu', icon: Plus, action: onMenuToggle, position: 'center', isMenuButton: true },
    { label: 'Messages', icon: MessageCircle, href: '/messages', position: 'right' },
    { label: 'Profile', icon: User, href: currentUser ? `/u/${currentUser.username}` : '/auth', position: 'right' },
  ];

  return (
    <motion.div
      initial={{ y: 100 }}
      animate={{ y: 0 }}
      className="fixed bottom-0 left-0 right-0 z-[1100] md:hidden"
    >
      {/* Bottom nav bar container */}
      <div
        className="relative mx-auto max-w-[480px] px-4 pb-[max(env(safe-area-inset-bottom),12px)] pt-2"
        style={{
          background: 'linear-gradient(to top, var(--glass-surface-bg) 0%, var(--glass-surface-bg) 85%, transparent 100%)',
        }}
      >
        {/* Glass bar */}
        <div
          className="relative rounded-[28px] px-3 py-2.5 flex items-center justify-around gap-1"
          style={{
            background: 'var(--glass-surface-bg)',
            backdropFilter: 'blur(20px) saturate(150%)',
            WebkitBackdropFilter: 'blur(20px) saturate(150%)',
            border: '1px solid var(--glass-surface-border)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.12), 0 0 0 0.5px rgba(255,255,255,0.05) inset',
          }}
        >
          {navItems.map((item) => {
            const isActive = item.href && location === item.href;
            const isMenuButton = item.isMenuButton;

            if (isMenuButton) {
              // Center menu button - prominent with accent color
              return (
                <motion.button
                  key={item.label}
                  onClick={item.action}
                  className="relative flex flex-col items-center justify-center"
                  whileTap={{ scale: 0.92 }}
                  aria-label={item.label}
                >
                  <motion.div
                    className={cn(
                      "relative flex items-center justify-center rounded-2xl shadow-lg",
                      "w-[52px] h-[52px]",
                    )}
                    style={{
                      background: 'linear-gradient(135deg, hsl(var(--accent-color, 265 70% 60%)) 0%, hsl(var(--accent-color, 265 70% 60%) / 0.85) 100%)',
                      boxShadow: '0 4px 16px hsl(var(--accent-color, 265 70% 60%) / 0.4), 0 0 0 3px var(--glass-surface-bg), 0 0 0 4px hsl(var(--accent-color, 265 70% 60%) / 0.2)',
                    }}
                    animate={{ rotate: isMenuOpen ? 45 : 0 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                  >
                    <item.icon className="h-6 w-6 text-white" strokeWidth={2.5} />
                  </motion.div>
                </motion.button>
              );
            }

            // Regular nav items
            const content = (
              <motion.div
                className={cn(
                  "relative flex flex-col items-center justify-center rounded-2xl transition-all duration-200",
                  "w-[52px] h-[52px]",
                  "active:scale-95",
                )}
                whileTap={{ scale: 0.92 }}
              >
                {/* Icon container */}
                <div
                  className={cn(
                    "relative flex items-center justify-center rounded-xl transition-all duration-200",
                    "w-10 h-10",
                    isActive
                      ? "bg-primary/15"
                      : "hover:bg-foreground/5"
                  )}
                >
                  <item.icon
                    className={cn(
                      "h-5 w-5 transition-colors",
                      isActive
                        ? "text-primary"
                        : "text-muted-foreground"
                    )}
                    strokeWidth={isActive ? 2.5 : 2}
                  />

                  {/* Active indicator dot */}
                  {isActive && (
                    <motion.div
                      layoutId="activeNavDot"
                      className="absolute -bottom-1"
                      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                    >
                      <div
                        className="w-1 h-1 rounded-full"
                        style={{
                          background: 'hsl(var(--accent-color, 265 70% 60%))',
                          boxShadow: '0 0 8px hsl(var(--accent-color, 265 70% 60%) / 0.6)',
                        }}
                      />
                    </motion.div>
                  )}
                </div>
              </motion.div>
            );

            if (item.href) {
              return (
                <Link key={item.label} href={item.href}>
                  <a className="block" aria-label={item.label}>
                    {content}
                  </a>
                </Link>
              );
            }

            return (
              <button
                key={item.label}
                onClick={item.action}
                className="block"
                aria-label={item.label}
              >
                {content}
              </button>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}
