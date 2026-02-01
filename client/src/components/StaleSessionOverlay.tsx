import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { StaleSessionState } from "@/hooks/useStaleSessionRefresh";

interface StaleSessionOverlayProps {
  state: StaleSessionState;
}

export function StaleSessionOverlay({ state }: StaleSessionOverlayProps) {
  const { showWarning, showDim, secondsRemaining, dismiss } = state;

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins > 0) {
      return `${mins}:${secs.toString().padStart(2, '0')}`;
    }
    return `${secs}s`;
  };

  return (
    <AnimatePresence>
      {showDim && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.6 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 bg-black z-[9998] pointer-events-none"
          data-testid="stale-session-dim"
        />
      )}
      
      {showWarning && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
          className="fixed top-4 left-4 right-4 z-[9999] flex justify-center"
        >
          <div className="bg-yellow-500/95 text-black px-4 py-3 rounded-lg shadow-xl max-w-md w-full flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 flex-shrink-0" />
            <div className="flex-1">
              <p className="font-semibold text-sm">Session about to refresh</p>
              <p className="text-xs opacity-80">
                Page will refresh in {formatTime(secondsRemaining)} due to inactivity
              </p>
            </div>
            <Button
              size="sm"
              variant="secondary"
              onClick={dismiss}
              className="bg-black/20 hover:bg-black/30 text-black border-0"
              data-testid="button-dismiss-stale-warning"
            >
              <RefreshCw className="h-3 w-3 mr-1" />
              Stay
            </Button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
