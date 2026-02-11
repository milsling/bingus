import { useEffect, useRef } from "react";

export function VersionCheck() {
  const currentVersion = useRef<string | null>(null);

  useEffect(() => {
    async function checkVersion() {
      try {
        const res = await fetch("/api/version");
        if (!res.ok) return;
        
        const data = await res.json();
        
        if (currentVersion.current === null) {
          currentVersion.current = data.version;
        } else if (currentVersion.current !== data.version) {
          // Clear all caches and force hard reload
          if ('caches' in window) {
            caches.keys().then(names => {
              names.forEach(name => {
                caches.delete(name);
              });
            });
          }
          window.location.href = window.location.href; // Force bypass cache
        }
      } catch (e) {
      }
    }

    checkVersion();
    const interval = setInterval(checkVersion, 10000);
    return () => clearInterval(interval);
  }, []);

  return null;
}
