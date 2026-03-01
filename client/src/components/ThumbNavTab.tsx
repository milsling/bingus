import React, { useState, useRef, useEffect, createContext, useContext } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion';

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
  const [isOpen, setIsOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const dragX = useMotionValue(0);
  const touchStartXRef = useRef<number | null>(null);
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

  const handleOpen = () => {
    setIsOpen(true);
    dragX.set(panelWidth);
    
    if ('vibrate' in navigator) {
      navigator.vibrate(50);
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    dragX.set(0);
    
    if ('vibrate' in navigator) {
      navigator.vibrate(30);
    }
  };

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

  // Transform drag value to panel position
  const panelX = useTransform(dragX, [0, panelWidth], [panelWidth, 0]);
  const backdropOpacity = useTransform(dragX, [0, panelWidth], [0, 0.5]);
  const tabX = useTransform(dragX, [0, panelWidth], [0, -panelWidth]);

  // Touch handlers for slide-to-close on the open panel
  const panelTouchStartXRef = useRef<number | null>(null);

  const handlePanelTouchStart = (event: React.TouchEvent) => {
    panelTouchStartXRef.current = event.touches[0].clientX;
  };

  const handlePanelTouchMove = (event: React.TouchEvent) => {
    if (panelTouchStartXRef.current === null) return;
    const deltaX = event.touches[0].clientX - panelTouchStartXRef.current;
    if (deltaX > 0) {
      // Dragging right — move panel with finger
      dragX.set(Math.max(0, panelWidth - deltaX));
    }
  };

  const handlePanelTouchEnd = (event: React.TouchEvent) => {
    if (panelTouchStartXRef.current === null) return;
    const deltaX = event.changedTouches[0].clientX - panelTouchStartXRef.current;
    panelTouchStartXRef.current = null;
    if (deltaX > panelWidth * 0.3) {
      handleClose();
    } else {
      dragX.set(panelWidth);
    }
  };

  return (
    <ThumbNavCloseContext.Provider value={handleClose}>
      {/* Modern Edge Tab — larger, more visible, with clear affordances */}
      <motion.div
        className="fixed right-0 top-1/2 -translate-y-1/2 z-[1200] touch-none"
        style={{ x: tabX }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Expanded touch target for easier grab */}
        <div className="absolute inset-y-0 -left-8 right-2" />
        <div className="relative h-40 w-4 bg-gradient-to-l from-white/20 to-white/10 backdrop-blur-md rounded-l-2xl border-l border-t border-b border-white/20 shadow-2xl">
          {/* Visual grip indicator */}
          <div className="absolute inset-y-0 left-1 w-2 flex flex-col items-center justify-center gap-1.5">
            <div className="w-1.5 h-1.5 bg-white/80 rounded-full shadow-lg" />
            <div className="w-1.5 h-1.5 bg-white/80 rounded-full shadow-lg" />
            <div className="w-1.5 h-1.5 bg-white/80 rounded-full shadow-lg" />
          </div>
          {/* Subtle animated pulse when idle */}
          <motion.div
            className="absolute inset-0 bg-white/5 rounded-l-2xl"
            animate={{ opacity: [0.3, 0.6, 0.3] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          />
          {/* Hover/active state highlight */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent to-white/10 rounded-l-2xl opacity-0 hover:opacity-100 transition-opacity duration-200" />
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
              initial={{ opacity: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            />

            {/* Navigation Panel */}
            <motion.div
              style={{ x: panelX }}
              className="fixed right-0 top-0 bottom-0 z-[1202] w-[min(85vw,380px)] overflow-hidden"
              initial={{ x: panelWidth }}
              exit={{ x: panelWidth }}
              transition={{ 
                type: 'spring', 
                damping: isDragging ? 40 : 30, 
                stiffness: isDragging ? 500 : 350,
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
              <div className="relative h-full overflow-y-auto">
                {children}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </ThumbNavCloseContext.Provider>
  );
}
