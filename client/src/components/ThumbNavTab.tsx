import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion';
import { ChevronLeft } from 'lucide-react';

/**
 * ThumbNavTab - A modern, native-feeling navigation drawer for mobile
 * 
 * Features:
 * - Slim edge tab attached to right side
 * - Smooth thumb-following drag interaction
 * - Swipe back to cancel opening
 * - Haptic feedback
 * - Native app feel with spring physics
 */
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

  return (
    <>
      {/* Slim Edge Tab */}
      <motion.div
        className="fixed right-0 top-1/2 -translate-y-1/2 z-[1200] touch-none"
        style={{ x: tabX }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div className="relative h-24 w-1 bg-primary/30 rounded-l-full shadow-lg">
          {/* Grip indicator */}
          <div className="absolute inset-y-0 -left-3 w-4 flex items-center justify-center">
            <div className="space-y-1.5">
              {[...Array(3)].map((_, i) => (
                <div
                  key={i}
                  className="w-0.5 h-0.5 bg-primary/50 rounded-full"
                />
              ))}
            </div>
          </div>
          
          {/* Active indicator */}
          <motion.div
            className="absolute inset-0 bg-primary rounded-l-full"
            initial={{ scaleY: 0 }}
            animate={{ 
              scaleY: isDragging ? Math.min(dragX.get() / panelWidth, 1) : (isOpen ? 1 : 0)
            }}
            transition={{ type: 'spring', damping: 25, stiffness: 400 }}
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
    </>
  );
}
