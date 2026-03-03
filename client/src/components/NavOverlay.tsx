import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface NavOverlayItem {
  id: string;
  label: string;
  subtitle?: string;
  icon: React.ComponentType<{ className?: string }>;
  onSelect: () => void;
}

interface NavOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  items: NavOverlayItem[];
}

export function NavOverlay({ isOpen, onClose, items }: NavOverlayProps) {
  useEffect(() => {
    if (!isOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="nav-overlay-backdrop"
            onClick={onClose}
          />

          <motion.div
            initial={{ x: 420, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 420, opacity: 0 }}
            transition={{ type: "spring", bounce: 0.32, duration: 0.44 }}
            className="nav-overlay nav-overlay-modern"
            role="dialog"
            aria-modal="true"
            aria-label="Main navigation menu"
            style={{
              position: "fixed",
              top: 0,
              right: 0,
              height: "100vh",
              width: "min(92vw, 360px)",
              zIndex: 9999,
              display: "flex",
              flexDirection: "column",
              justifyContent: "flex-start",
              boxSizing: "border-box",
              paddingBottom: "env(safe-area-inset-bottom, 24px)",
            }}
          >
            <div className="nav-overlay-header" style={{paddingTop: "1.2rem", paddingBottom: "0.8rem"}}>
              <p className="text-base font-semibold text-foreground/90">Main Menu</p>
              <button
                type="button"
                onClick={onClose}
                className="nav-overlay-close"
                aria-label="Close navigation menu"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="nav-overlay-grid" style={{paddingBottom: "1.2rem", gap: "0.8rem"}}>
              {items.map((item, idx) => (
                <motion.button
                  key={item.id}
                  type="button"
                  className={cn("nav-overlay-item nav-overlay-modern-item")}
                  whileTap={{ scale: 0.97 }}
                  whileHover={{ scale: 1.03, boxShadow: "0 4px 16px rgba(0,0,0,0.12)" }}
                  transition={{ type: "spring", stiffness: 320, damping: 22 }}
                  onClick={() => {
                    item.onSelect();
                    onClose();
                  }}
                  style={{
                    minHeight: "56px",
                    fontSize: "1.05rem",
                    fontWeight: 500,
                    letterSpacing: "-0.01em",
                  }}
                >
                  <span className="nav-overlay-item-icon" style={{width: "2.2rem", height: "2.2rem"}}>
                    <item.icon className="h-5 w-5" />
                  </span>
                  <span className="text-left">
                    <span className="block text-base font-semibold text-foreground">{item.label}</span>
                    {item.subtitle && (
                      <span className="block text-xs text-muted-foreground">{item.subtitle}</span>
                    )}
                  </span>
                </motion.button>
              ))}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
