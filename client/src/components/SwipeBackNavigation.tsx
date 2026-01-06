import { useRef, useState, useCallback, useEffect } from "react";
import { useLocation } from "wouter";
import { ChevronLeft } from "lucide-react";

interface SwipeBackNavigationProps {
  children: React.ReactNode;
}

export function SwipeBackNavigation({ children }: SwipeBackNavigationProps) {
  const [, setLocation] = useLocation();
  const [location] = useLocation();
  const [offset, setOffset] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [isAnimatingOut, setIsAnimatingOut] = useState(false);
  const startX = useRef(0);
  const startY = useRef(0);
  const isEdgeSwipe = useRef(false);
  const isHorizontalSwipe = useRef<boolean | null>(null);
  
  const edgeThreshold = 40;
  const swipeThreshold = 80;
  const screenWidth = typeof window !== 'undefined' ? window.innerWidth : 400;

  const canGoBack = location !== "/" && location !== "/auth";

  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (!canGoBack) return;
    
    const touch = e.touches[0];
    startX.current = touch.clientX;
    startY.current = touch.clientY;
    
    isEdgeSwipe.current = touch.clientX <= edgeThreshold;
    isHorizontalSwipe.current = null;
    
    if (isEdgeSwipe.current) {
      setIsActive(true);
    }
  }, [canGoBack]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!isEdgeSwipe.current || !canGoBack) return;
    
    const touch = e.touches[0];
    const diffX = touch.clientX - startX.current;
    const diffY = touch.clientY - startY.current;
    
    if (isHorizontalSwipe.current === null) {
      isHorizontalSwipe.current = Math.abs(diffX) > Math.abs(diffY);
    }
    
    if (isHorizontalSwipe.current && diffX > 0) {
      e.preventDefault();
      setOffset(diffX);
    }
  }, [canGoBack]);

  const handleTouchEnd = useCallback(() => {
    if (!isEdgeSwipe.current || !canGoBack) {
      setOffset(0);
      setIsActive(false);
      return;
    }
    
    if (offset >= swipeThreshold) {
      setIsAnimatingOut(true);
      setOffset(screenWidth);
      setTimeout(() => {
        window.history.back();
        setOffset(0);
        setIsActive(false);
        setIsAnimatingOut(false);
      }, 250);
    } else {
      setOffset(0);
      setIsActive(false);
    }
    
    startX.current = 0;
    startY.current = 0;
    isEdgeSwipe.current = false;
    isHorizontalSwipe.current = null;
  }, [offset, canGoBack, screenWidth]);

  useEffect(() => {
    document.addEventListener("touchstart", handleTouchStart, { passive: true });
    document.addEventListener("touchmove", handleTouchMove, { passive: false });
    document.addEventListener("touchend", handleTouchEnd);
    
    return () => {
      document.removeEventListener("touchstart", handleTouchStart);
      document.removeEventListener("touchmove", handleTouchMove);
      document.removeEventListener("touchend", handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd]);

  const progress = Math.min(offset / swipeThreshold, 1);

  return (
    <div className="relative overflow-hidden">
      {(isActive || isAnimatingOut) && canGoBack && (
        <div 
          className="fixed inset-0 z-40 pointer-events-none bg-black/50"
          style={{
            opacity: Math.max(0, 1 - (offset / screenWidth)),
            transition: isAnimatingOut ? "opacity 0.25s ease-out" : "none",
          }}
        />
      )}
      
      {(isActive || isAnimatingOut) && canGoBack && progress > 0.3 && (
        <div
          className="fixed left-4 top-1/2 -translate-y-1/2 z-50 pointer-events-none"
          style={{
            opacity: Math.min(1, (progress - 0.3) * 2),
            transition: isAnimatingOut ? "opacity 0.15s ease-out" : "none",
          }}
        >
          <div className="w-10 h-10 rounded-full bg-primary/90 backdrop-blur-sm flex items-center justify-center shadow-lg">
            <ChevronLeft className="w-6 h-6 text-white" />
          </div>
        </div>
      )}
      
      <div
        className="min-h-screen bg-background"
        style={{
          transform: (isActive || isAnimatingOut) && offset > 0 ? `translateX(${offset}px)` : "none",
          transition: isAnimatingOut ? "transform 0.25s ease-out" : (offset === 0 && !isAnimatingOut ? "transform 0.2s ease-out" : "none"),
          boxShadow: (isActive || isAnimatingOut) && offset > 0 ? "-10px 0 30px rgba(0,0,0,0.3)" : "none",
        }}
      >
        {children}
      </div>
    </div>
  );
}
