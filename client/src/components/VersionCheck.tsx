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
          window.location.reload();
        }
      } catch (e) {
      }
    }

    checkVersion();
    const interval = setInterval(checkVersion, 30000);
    return () => clearInterval(interval);
  }, []);

  return null;
}
