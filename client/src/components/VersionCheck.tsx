import { useEffect, useRef } from "react";

const MIN_UPTIME_BEFORE_RELOAD_MS = 30000;

export function VersionCheck() {
  const currentVersion = useRef<string | null>(null);
  const mountTime = useRef<number>(Date.now());

  useEffect(() => {
    async function checkVersion() {
      try {
        const res = await fetch("/api/version");
        if (!res.ok) return;

        const data = await res.json();
        const newVersion = data?.version;

        if (currentVersion.current === null) {
          currentVersion.current = newVersion;
          return;
        }
        if (!newVersion || currentVersion.current === newVersion) return;

        const uptime = Date.now() - mountTime.current;
        if (uptime < MIN_UPTIME_BEFORE_RELOAD_MS) return;

        if ("caches" in window) {
          caches.keys().then((names) => names.forEach((n) => caches.delete(n)));
        }
        window.location.href = window.location.href;
      } catch {
        /* ignore */
      }
    }

    checkVersion();
    const interval = setInterval(checkVersion, 60000);
    return () => clearInterval(interval);
  }, []);

  return null;
}
