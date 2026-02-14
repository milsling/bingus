import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface NavOverlayItem {
  id: string;
  label: string;
  subtitle?: string;
  icon: LucideIcon;
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
            transition={{ duration: 0.2 }}
            className="nav-overlay-backdrop"
            onClick={onClose}
          />

          <div className="nav-overlay-anchor">
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ type: "spring", bounce: 0.2, duration: 0.3 }}
              className="nav-overlay"
              role="dialog"
              aria-modal="true"
              aria-label="Main navigation menu"
            >
              <div className="nav-overlay-header">
                <p className="text-sm font-semibold text-foreground/90">Main Menu</p>
                <button
                  type="button"
                  onClick={onClose}
                  className="nav-overlay-close"
                  aria-label="Close navigation menu"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="nav-overlay-grid">
                {items.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className={cn("nav-overlay-item")}
                    onClick={() => {
                      item.onSelect();
                      onClose();
                    }}
                  >
                    <span className="nav-overlay-item-icon">
                      <item.icon className="h-4 w-4" />
                    </span>
                    <span className="text-left">
                      <span className="block text-sm font-semibold text-foreground">{item.label}</span>
                      {item.subtitle && (
                        <span className="block text-xs text-muted-foreground">{item.subtitle}</span>
                      )}
                    </span>
                  </button>
                ))}
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
