"use client";

import { useEffect } from "react";

const sessionKey = "ucp:sw-guard:ran";

export function ServiceWorkerGuard() {
  useEffect(() => {
    if (process.env.NODE_ENV === "production") {
      return;
    }

    if (typeof window === "undefined") {
      return;
    }

    if (window.sessionStorage.getItem(sessionKey) === "true") {
      return;
    }

    const unregister = async () => {
      if (!("serviceWorker" in navigator)) {
        return;
      }

      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(
        registrations.map((registration) => registration.unregister()),
      );

      if ("caches" in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map((key) => caches.delete(key)));
      }
    };

    window.sessionStorage.setItem(sessionKey, "true");
    void unregister();
  }, []);

  return null;
}
