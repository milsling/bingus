import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence, useAnimation } from 'framer-motion';
import { ChevronLeft, Menu } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * ThumbNavTab - A thumb-activated navigation tab for mobile devices
 * 
 * Features:
 * - Press and hold interaction (500ms to open)
 * - Visual progress feedback during press
 * - Haptic feedback on devices that support it
 * - Smooth slide-out animation from the right
 * - Touch-optimized for thumb reach
 * 
 * Usage:
 * <ThumbNavTab>
 *   <YourNavigationContent />
 * </ThumbNavTab>
 */
interface ThumbNavTabProps {
  children: React.ReactNode;
}

export default function ThumbNavTab({ children }: ThumbNavTabProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isPressed, setIsPressed] = useState(false);
  const [pressProgress, setPressProgress] = useState(0);
  const controls = useAnimation();
  const tabRef = useRef<HTMLDivElement>(null);
  const pressTimerRef = useRef<NodeJS.Timeout>();
  const progressTimerRef = useRef<NodeJS.Timeout>();

  // Handle press and hold interaction
  const handlePressStart = () => {
    setIsPressed(true);
    setPressProgress(0);
    
    // Gradually increase press progress
    let progress = 0;
    progressTimerRef.current = setInterval(() => {
      progress += 2;
      setPressProgress(progress);
      
      if (progress >= 100) {
        clearInterval(progressTimerRef.current!);
        handleOpen();
      }
    }, 20);
  };

  const handlePressEnd = () => {
    setIsPressed(false);
    
    // Clear progress timer
    if (progressTimerRef.current) {
      clearInterval(progressTimerRef.current);
    }
    
    // Reset progress with animation
    setTimeout(() => setPressProgress(0), 100);
  };

  const handleOpen = () => {
    setIsOpen(true);
    setIsPressed(false);
    setPressProgress(0);
    
    // Haptic feedback if available
    if ('vibrate' in navigator) {
      navigator.vibrate(50);
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    
    // Haptic feedback if available
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

  // Animation variants
  const tabVariants = {
    idle: {
      x: 0,
      scale: 1,
      rotate: 0,
    },
    pressed: {
      x: -8,
      scale: 0.95,
      rotate: -2,
      transition: { type: 'spring', damping: 15, stiffness: 300 }
    },
    hover: {
      x: -4,
      scale: 1.05,
      transition: { type: 'spring', damping: 20, stiffness: 400 }
    }
  };

  const panelVariants = {
    hidden: {
      x: '100%',
      opacity: 0,
      transition: {
        type: 'spring',
        damping: 25,
        stiffness: 300,
        mass: 0.8
      }
    },
    visible: {
      x: 0,
      opacity: 1,
      transition: {
        type: 'spring',
        damping: 28,
        stiffness: 300,
        mass: 0.8,
        when: 'beforeChildren',
        staggerChildren: 0.03
      }
    },
    exit: {
      x: '100%',
      opacity: 0,
      transition: {
        duration: 0.25,
        ease: [0.4, 0, 1, 1]
      }
    }
  };

  const overlayVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { duration: 0.2 }
    },
    exit: { 
      opacity: 0,
      transition: { duration: 0.15 }
    }
  };

  return (
    <>
      {/* Thumb Tab */}
      <motion.div
        ref={tabRef}
        className="fixed right-0 top-1/2 -translate-y-1/2 z-[1200] cursor-pointer select-none"
        variants={tabVariants}
        animate={isPressed ? 'pressed' : 'hover'}
        whileHover="hover"
        whileTap="pressed"
        onMouseDown={handlePressStart}
        onMouseUp={handlePressEnd}
        onMouseLeave={handlePressEnd}
        onTouchStart={handlePressStart}
        onTouchEnd={handlePressEnd}
      >
        {/* Tab Container */}
        <div className="relative">
          {/* Main Tab */}
          <motion.div
            className={cn(
              "relative w-12 h-20 bg-gradient-to-b from-primary/20 to-primary/10",
              "border-l border-t border-b border-primary/20",
              "rounded-l-2xl shadow-lg shadow-primary/10",
              "flex items-center justify-center",
              "backdrop-blur-md",
              "transition-all duration-200"
            )}
            style={{
              background: isPressed 
                ? `linear-gradient(135deg, rgba(168, 85, 247, ${0.3 + pressProgress * 0.004}), rgba(168, 85, 247, ${0.1 + pressProgress * 0.003}))`
                : undefined,
            }}
          >
            {/* Progress Indicator */}
            <div className="absolute inset-0 rounded-l-2xl overflow-hidden">
              <motion.div
                className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-primary/40 to-transparent"
                style={{ height: `${pressProgress}%` }}
                transition={{ duration: 0.1 }}
              />
            </div>

            {/* Icon */}
            <motion.div
              animate={{
                rotate: isPressed ? 180 : 0,
                scale: isPressed ? 0.8 : 1
              }}
              transition={{
                rotate: { duration: 0.3, ease: 'easeInOut' },
                scale: { duration: 0.1 }
              }}
              className="relative z-10"
            >
              {isPressed ? (
                <ChevronLeft className="h-5 w-5 text-primary" />
              ) : (
                <Menu className="h-5 w-5 text-primary/80" />
              )}
            </motion.div>

            {/* Haptic Feedback Dots */}
            <div className="absolute left-2 top-1/2 -translate-y-1/2 space-y-1">
              {[...Array(3)].map((_, i) => (
                <motion.div
                  key={i}
                  className="w-1 h-1 bg-primary/40 rounded-full"
                  animate={{
                    scale: isPressed ? [1, 1.5, 1] : 1,
                    opacity: isPressed ? [0.4, 0.8, 0.4] : 0.4
                  }}
                  transition={{
                    delay: i * 0.1,
                    duration: 0.6,
                    repeat: isPressed ? Infinity : 0,
                    repeatDelay: 0.2
                  }}
                />
              ))}
            </div>

            {/* Glow Effect */}
            {isPressed && (
              <motion.div
                className="absolute inset-0 rounded-l-2xl bg-primary/20 blur-md"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1.2 }}
                exit={{ opacity: 0, scale: 0.8 }}
              />
            )}
          </motion.div>

          {/* Press Progress Ring */}
          {isPressed && (
            <svg className="absolute inset-0 w-12 h-20 -left-1">
              <motion.circle
                cx="6"
                cy="10"
                r="4"
                stroke="currentColor"
                strokeWidth="2"
                fill="none"
                strokeDasharray={`${2 * Math.PI * 4}`}
                strokeDashoffset={`${2 * Math.PI * 4 * (1 - pressProgress / 100)}`}
                className="text-primary/60"
                animate={{ strokeDashoffset: 2 * Math.PI * 4 * (1 - pressProgress / 100) }}
                transition={{ duration: 0.1 }}
              />
            </svg>
          )}
        </div>
      </motion.div>

      {/* Navigation Panel */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              variants={overlayVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="fixed inset-0 z-[1201] bg-black/40 backdrop-blur-sm"
              onClick={handleClose}
            />

            {/* Panel */}
            <motion.div
              variants={panelVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="fixed right-0 top-0 bottom-0 z-[1202] w-[min(90vw,400px)] overflow-hidden"
              style={{
                background: 'var(--glass-surface-bg)',
                backdropFilter: 'blur(40px) saturate(160%)',
                WebkitBackdropFilter: 'blur(40px) saturate(160%)',
                borderLeft: '1px solid var(--glass-surface-border)',
                boxShadow: '-8px 0 40px rgba(0,0,0,0.25), 0 0 0 1px rgba(255,255,255,0.04) inset',
              }}
            >
              {/* Close Tab */}
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={handleClose}
                className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-12 bg-gradient-to-l from-primary/20 to-primary/10 border-l border-t border-b border-primary/20 rounded-l-xl shadow-lg flex items-center justify-center z-10"
              >
                <ChevronLeft className="h-4 w-4 text-primary" />
              </motion.button>

              {/* Content */}
              <div className="h-full overflow-y-auto pl-12">
                {children}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
