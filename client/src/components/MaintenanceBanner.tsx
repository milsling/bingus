import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { AlertTriangle, X } from "lucide-react";

interface MaintenanceStatus {
  isActive: boolean;
  message?: string;
  activatedAt?: string;
}

export function MaintenanceBanner() {
  const [dismissed, setDismissed] = useState(false);
  const [dismissedId, setDismissedId] = useState<string | null>(() => {
    return localStorage.getItem("maintenance_dismissed");
  });

  const { data: status } = useQuery<MaintenanceStatus>({
    queryKey: ["/api/maintenance"],
    refetchInterval: 30000,
  });

  const activatedAtKey = status?.activatedAt ? new Date(status.activatedAt).toISOString() : null;

  useEffect(() => {
    if (activatedAtKey && dismissedId !== activatedAtKey) {
      setDismissed(false);
    }
  }, [activatedAtKey, dismissedId]);

  if (!status?.isActive || dismissed) return null;

  const handleDismiss = () => {
    setDismissed(true);
    if (activatedAtKey) {
      localStorage.setItem("maintenance_dismissed", activatedAtKey);
      setDismissedId(activatedAtKey);
    }
  };

  return (
    <div className="fixed top-0 left-0 right-0 z-[200] bg-gradient-to-r from-amber-500 via-orange-500 to-amber-500 text-black overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2">
        <div className="flex-1 overflow-hidden">
          <div className="animate-marquee whitespace-nowrap flex items-center gap-4">
            <span className="inline-flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              <span className="font-bold">{status.message || "Heads up - maintenance incoming. Save your work!"}</span>
            </span>
            <span className="inline-flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              <span className="font-bold">{status.message || "Heads up - maintenance incoming. Save your work!"}</span>
            </span>
            <span className="inline-flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              <span className="font-bold">{status.message || "Heads up - maintenance incoming. Save your work!"}</span>
            </span>
          </div>
        </div>
        <button
          onClick={handleDismiss}
          className="ml-4 p-1 hover:bg-black/10 rounded transition-colors flex-shrink-0"
          data-testid="button-dismiss-maintenance"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
