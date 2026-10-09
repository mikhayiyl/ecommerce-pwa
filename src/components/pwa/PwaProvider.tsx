"use client";

import { useEffect, useSyncExternalStore } from "react";

function subscribe(cb: () => void) {
  window.addEventListener("online", cb);
  window.addEventListener("offline", cb);
  return () => {
    window.removeEventListener("online", cb);
    window.removeEventListener("offline", cb);
  };
}

export function useOnline() {
  return useSyncExternalStore(
    subscribe,
    () => navigator.onLine,
    () => true,
  );
}

export default function PwaProvider() {
  const online = useOnline();

  useEffect(() => {
    if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);

  if (online) return null;
  return (
    <div
      role="status"
      className="fixed inset-x-0 bottom-0 z-50 bg-amber-500 px-4 py-2 text-center text-sm font-medium text-black"
    >
      You&apos;re offline. Browsing cached pages and cart edits still work; checkout needs a connection.
    </div>
  );
}
