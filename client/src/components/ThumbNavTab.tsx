import React, { useState, useRef, useEffect, createContext, useContext } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion';
import { useBars } from '@/context/BarContext';
import { useLocation } from 'wouter';

/**
 * ThumbNavTab - A modern, native-feeling navigation drawer for mobile
 *
 * Features:
 * - Slim edge tab attached to right side
 * - Inverted color tab (always visible against any background)
 * - Smooth thumb-following drag interaction
 * - Swipe back to close (both from tab and open panel)
 * - Auto-close on nav item selection
 * - Haptic feedback
 * - Native app feel with spring physics
 */

export const ThumbNavCloseContext = createContext<() => void>(() => {});
export const useThumbNavClose = () => useContext(ThumbNavCloseContext);

interface ThumbNavTabProps {
  children: React.ReactNode;
}

export default function ThumbNavTab({ children }: ThumbNavTabProps) {
  const { currentUser } = useBars();
  const [location] = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isPressed, setIsPressed] = useState(false);
  const [showHint, setShowHint] = useState(() => {
    // Show hint if user hasn't seen it before
    return localStorage.getItem('orphan_bars_nav_hint_dismissed') !== 'true';
  });
  const [hideOnScroll, setHideOnScroll] = useState(false);
  const dragX = useMotionValue(0);
  const touchStartXRef = useRef<number | null>(null);
  const lastScrollYRef = useRef(0);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const panelWidth = 360;

  // Handle touch start
  const handleTouchStart = (event: React.TouchEvent) => {
    const touch = event.touches[0];
    if (!touch) return;
    
    touchStartXRef.current = touch.clientX;
    setIsDragging(true);
    
    // Light haptic feedback
    if ('vibrate' in navigator) {
      navigator.vibrate(10);
    }
  };

  // Handle touch move - follow the thumb
  const handleTouchMove = (event: React.TouchEvent) => {
    if (touchStartXRef.current === null || !isDragging) return;

    const touch = event.touches[0];
    if (!touch) return;

    // Calculate drag distance (positive = dragging left to open)
    const deltaX = touchStartXRef.current - touch.clientX;
    
    // Allow dragging from 0 to panelWidth, with slight overscroll
    const clampedDelta = Math.max(-50, Math.min(panelWidth + 50, deltaX));
    
    dragX.set(clampedDelta);
  };

  // Handle touch end - determine if we should open/close
  const handleTouchEnd = () => {
    if (!isDragging) return;
    
    const currentDrag = dragX.get();
    const threshold = panelWidth * 0.35;
    
    if (currentDrag > threshold) {
      // Dragged far enough to open
      handleOpen();
    } else if (currentDrag < -20) {
      // Swiped back right to cancel
      handleClose();
    } else {
      // Not far enough, return to current state
      if (isOpen) {
        dragX.set(panelWidth);
      } else {
        dragX.set(0);
      }
    }
    
    setIsDragging(false);
    touchStartXRef.current = null;
  };

  const setClosed = (withHaptic: boolean) => {
    setIsOpen(false);
    dragX.set(0);

    if (withHaptic && 'vibrate' in navigator) {
      navigator.vibrate(30);
    }
  };

  const handleOpen = () => {
    setIsOpen(true);
    dragX.set(panelWidth);

    // Dismiss hint when user opens the menu
    if (showHint) {
      setShowHint(false);
      localStorage.setItem('orphan_bars_nav_hint_dismissed', 'true');
    }

    if ('vibrate' in navigator) {
      navigator.vibrate(50);
    }
  };

  const handleClose = () => {
    setClosed(true);
  };

  const dismissHint = () => {
    setShowHint(false);
    localStorage.setItem('orphan_bars_nav_hint_dismissed', 'true');
  };

  const handlePressStart = () => {
    setIsPressed(true);
  };

  const handlePressEnd = () => {
    setIsPressed(false);
  };

  // Reset navigation state when user logs out
  useEffect(() => {
    if (!currentUser && isOpen) {
      setClosed(false);
    }
  }, [currentUser, isOpen]);

  // Always close on route changes so the drawer can't get stranded open.
  useEffect(() => {
    if (isOpen) {
      setClosed(false);
    }
  }, [location]);

  // Close on escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') handleClose();
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
      return () => {
        document.removeEventListener('keydown', handleEscape);
        document.body.style.overflow = '';
      };
    }
  }, [isOpen]);

  // Hide tab on scroll, show when scrolling stops
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      const deltaY = currentScrollY - lastScrollYRef.current;

      // Clear existing timeout
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }

      // Hide tab when scrolling (any direction)
      if (Math.abs(deltaY) > 5) {
        setHideOnScroll(true);
      }

      // Update last scroll position
      lastScrollYRef.current = currentScrollY;

      // Set timeout to show tab again after scrolling stops
      scrollTimeoutRef.current = setTimeout(() => {
        setHideOnScroll(false);
      }, 800);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, []);

  // Transform drag value to panel position
  const panelX = useTransform(dragX, [0, panelWidth], [panelWidth, 0]);
  const backdropOpacity = useTransform(dragX, [0, panelWidth], [0, 0.5]);
  const tabX = useTransform(dragX, [0, panelWidth], [0, -panelWidth]);
  const dragProgress = useTransform(dragX, [0, panelWidth], [0, 1]);

  // Compute tab X position based on drag progress and press state
  const tabPositionX = useTransform(
    dragProgress,
    (progress) => isOpen ? -10 : -(progress * 52 + (isPressed ? 8 : 0))
  );

  // Touch handlers for slide-to-close on the open panel
  // Only activates on horizontal swipes — vertical scrolling passes through to content
  const panelTouchStartXRef = useRef<number | null>(null);
  const panelTouchStartYRef = useRef<number | null>(null);
  const panelSwipeActiveRef = useRef(false);
  const panelSwipeLockedRef = useRef(false);

  const handlePanelTouchStart = (event: React.TouchEvent) => {
    const touch = event.touches[0];
    panelTouchStartXRef.current = touch.clientX;
    panelTouchStartYRef.current = touch.clientY;
    panelSwipeActiveRef.current = false;
    panelSwipeLockedRef.current = false;
  };

  const handlePanelTouchMove = (event: React.TouchEvent) => {
    if (panelTouchStartXRef.current === null || panelTouchStartYRef.current === null) return;
    // Once locked to scroll, don't intercept
    if (panelSwipeLockedRef.current) return;

    const touch = event.touches[0];
    const deltaX = touch.clientX - panelTouchStartXRef.current;
    const deltaY = touch.clientY - panelTouchStartYRef.current;

    // Determine intent on first significant movement
    if (!panelSwipeActiveRef.current) {
      const absDx = Math.abs(deltaX);
      const absDy = Math.abs(deltaY);
      // Need at least 10px movement to decide
      if (absDx < 10 && absDy < 10) return;
      if (absDy > absDx) {
        // Vertical — lock to native scroll, don't intercept
        panelSwipeLockedRef.current = true;
        return;
      }
      // Horizontal swipe right detected — activate panel drag
      if (deltaX > 0) {
        panelSwipeActiveRef.current = true;
      } else {
        // Swiping left inside panel — ignore
        panelSwipeLockedRef.current = true;
        return;
      }
    }

    if (panelSwipeActiveRef.current && deltaX > 0) {
      dragX.set(Math.max(0, panelWidth - deltaX));
    }
  };

  const handlePanelTouchEnd = (event: React.TouchEvent) => {
    if (panelTouchStartXRef.current === null) return;
    const deltaX = event.changedTouches[0].clientX - panelTouchStartXRef.current;
    const wasSwipe = panelSwipeActiveRef.current;
    panelTouchStartXRef.current = null;
    panelTouchStartYRef.current = null;
    panelSwipeActiveRef.current = false;
    panelSwipeLockedRef.current = false;

    if (!wasSwipe) return;

    if (deltaX > panelWidth * 0.3) {
      handleClose();
    } else {
      dragX.set(panelWidth);
    }
  };

  return (
    <ThumbNavCloseContext.Provider value={handleClose}>
      {/* Navigation Hint - Shows new users where to find the menu */}
      <AnimatePresence>
        {showHint && !isOpen && !isDragging && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ delay: 1, duration: 0.5 }}
            className="fixed right-16 top-1/2 -translate-y-1/2 z-[1200] pointer-events-none select-none"
          >
            <div className="relative">
              {/* Hint card */}
              <div
                className="bg-primary/95 backdrop-blur-md text-white px-4 py-3 rounded-xl shadow-2xl"
                style={{
                  boxShadow: '0 8px 32px rgba(168,85,247,0.4), 0 0 0 1px rgba(255,255,255,0.1) inset'
                }}
              >
                <div className="flex items-center gap-3">
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold leading-tight">Swipe to open menu</span>
                    <span className="text-xs text-white/70 leading-tight mt-0.5">← Drag from edge</span>
                  </div>
                  {/* Dismiss button */}
                  <button
                    onClick={dismissHint}
                    className="pointer-events-auto p-1 rounded-full hover:bg-white/20 transition-colors"
                    aria-label="Dismiss hint"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Animated arrow pointing to the tab */}
              <motion.div
                className="absolute left-full top-1/2 -translate-y-1/2 ml-1"
                animate={{ x: [0, 8, 0] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
              >
                <svg className="h-6 w-6 text-primary" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z" />
                </svg>
              </motion.div>

              {/* Subtle pulse animation */}
              <motion.div
                className="absolute inset-0 rounded-xl bg-primary/30 blur-xl"
                animate={{ opacity: [0.3, 0.6, 0.3], scale: [1, 1.1, 1] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modern Edge Tab — compact pill handle, Samsung/Arc style */}
      <motion.div
        className="fixed right-0 top-1/2 -translate-y-1/2 z-[1200] cursor-pointer select-none touch-none"
        style={{ x: tabPositionX }}
        animate={{
          scale: isPressed ? 0.92 : 1,
          x: hideOnScroll && !isOpen && !isDragging ? 20 : 0,
        }}
        transition={{
          type: 'spring',
          damping: 20,
          stiffness: 300,
          duration: 0.3
        }}
        whileHover="hover"
        whileTap="pressed"
        onMouseDown={handlePressStart}
        onMouseUp={handlePressEnd}
        onMouseLeave={handlePressEnd}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Invisible expanded touch target — 44×80px minimum for comfortable thumb grab */}
        <div className="absolute -inset-y-5 -left-12 right-0 min-w-[60px] min-h-[80px]" />

        {/* Visible pill — compact, high contrast, always discoverable */}
        <div className="relative h-12 w-[12px] rounded-l-full overflow-hidden"
          style={{
            background: 'hsl(var(--primary) / 0.55)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            boxShadow: '-2px 0 12px hsl(var(--primary) / 0.2), inset 0 0 0 0.5px hsl(var(--primary) / 0.3)',
          }}
        >
          {/* Single center notch — clear drag affordance */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-[4px] h-5 rounded-full bg-white/60" />
          </div>

          {/* Gentle breathing pulse so it doesn't look static/dead */}
          <motion.div
            className="absolute inset-0 rounded-l-full"
            style={{ background: 'hsl(var(--primary) / 0.15)' }}
            animate={{ opacity: [0, 0.6, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          />
        </div>
      </motion.div>

      {/* Backdrop and Panel */}
      <AnimatePresence>
        {(isOpen || isDragging) && (
          <>
            {/* Backdrop */}
            <motion.div
              style={{ opacity: backdropOpacity }}
              className="fixed inset-0 z-[1201] bg-black/60 backdrop-blur-sm"
              onClick={handleClose}
              initial={false}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            />

            {/* Navigation Panel */}
            <motion.div
              style={{ x: isDragging ? panelX : undefined }}
              className="fixed right-0 top-0 bottom-0 z-[1202] w-[min(85vw,380px)] overflow-hidden"
              initial={{ x: panelWidth }}
              animate={{ x: isOpen && !isDragging ? 0 : undefined }}
              exit={{ x: panelWidth }}
              transition={{
                type: 'spring',
                damping: 30,
                stiffness: 350,
                mass: 0.5
              }}
              onTouchStart={handlePanelTouchStart}
              onTouchMove={handlePanelTouchMove}
              onTouchEnd={handlePanelTouchEnd}
            >
              {/* Panel background with native app styling */}
              <div 
                className="absolute inset-0"
                style={{
                  background: 'var(--glass-surface-bg)',
                  backdropFilter: 'blur(40px) saturate(180%)',
                  WebkitBackdropFilter: 'blur(40px) saturate(180%)',
                  borderLeft: '1px solid var(--glass-surface-border)',
                  boxShadow: '-12px 0 48px rgba(0,0,0,0.3), 0 0 0 1px rgba(255,255,255,0.05) inset',
                }}
              />

              {/* Content */}
              <div className="relative h-full overflow-y-auto overscroll-contain" style={{ WebkitOverflowScrolling: 'touch' }}>
                {children}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </ThumbNavCloseContext.Provider>
  );
}
