import { useEffect, useRef, useState, useCallback } from "react";

const STALE_THRESHOLD_MS = 15 * 60 * 1000; // 15 minutes
const WARNING_BEFORE_MS = 2 * 60 * 1000; // 2 minutes before refresh
const DIM_BEFORE_MS = 30 * 1000; // 30 seconds before refresh

export interface StaleSessionState {
  showWarning: boolean;
  showDim: boolean;
  secondsRemaining: number;
  dismiss: () => void;
}

export function useStaleSessionRefresh(): StaleSessionState {
  const hiddenAtRef = useRef<number | null>(null);
  const checkIntervalRef = useRef<number | null>(null);
  const [showWarning, setShowWarning] = useState(false);
  const [showDim, setShowDim] = useState(false);
  const [secondsRemaining, setSecondsRemaining] = useState(0);

  const dismiss = useCallback(() => {
    setShowWarning(false);
    setShowDim(false);
    setSecondsRemaining(0);
    hiddenAtRef.current = null;
    if (checkIntervalRef.current) {
      clearInterval(checkIntervalRef.current);
      checkIntervalRef.current = null;
    }
  }, []);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        hiddenAtRef.current = Date.now();
        setShowWarning(false);
        setShowDim(false);
        if (checkIntervalRef.current) {
          clearInterval(checkIntervalRef.current);
          checkIntervalRef.current = null;
        }
      } else {
        if (hiddenAtRef.current) {
          const awayDuration = Date.now() - hiddenAtRef.current;
          
          if (awayDuration >= STALE_THRESHOLD_MS) {
            console.log(`Session stale after ${Math.round(awayDuration / 60000)} minutes, refreshing...`);
            window.location.reload();
            return;
          }
          
          const timeUntilRefresh = STALE_THRESHOLD_MS - awayDuration;
          
          if (timeUntilRefresh <= WARNING_BEFORE_MS) {
            setShowWarning(true);
            setSecondsRemaining(Math.ceil(timeUntilRefresh / 1000));
            
            if (timeUntilRefresh <= DIM_BEFORE_MS) {
              setShowDim(true);
            }
            
            checkIntervalRef.current = window.setInterval(() => {
              if (!hiddenAtRef.current) return;
              
              const elapsed = Date.now() - hiddenAtRef.current;
              const remaining = STALE_THRESHOLD_MS - elapsed;
              
              if (remaining <= 0) {
                window.location.reload();
                return;
              }
              
              setSecondsRemaining(Math.ceil(remaining / 1000));
              
              if (remaining <= DIM_BEFORE_MS) {
                setShowDim(true);
              }
            }, 1000);
          } else {
            dismiss();
          }
        }
      }
    };

    const handleUserActivity = () => {
      if (showWarning || showDim) {
        dismiss();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    document.addEventListener("click", handleUserActivity);
    document.addEventListener("keydown", handleUserActivity);
    document.addEventListener("touchstart", handleUserActivity);
    document.addEventListener("mousemove", handleUserActivity);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      document.removeEventListener("click", handleUserActivity);
      document.removeEventListener("keydown", handleUserActivity);
      document.removeEventListener("touchstart", handleUserActivity);
      document.removeEventListener("mousemove", handleUserActivity);
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
      }
    };
  }, [showWarning, showDim, dismiss]);

  return { showWarning, showDim, secondsRemaining, dismiss };
}
