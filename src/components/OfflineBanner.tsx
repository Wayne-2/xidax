"use client";

import { useEffect, useState } from "react";

export default function OfflineBanner() {
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    const update = () => setOffline(navigator.onLine === false);

    update();

    window.addEventListener("online", update);
    window.addEventListener("offline", update);

    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  if (!offline) {
    return null;
  }

  return (
    <div
      role="status"
      className="border-b border-[#B45309]/40 bg-[#B45309]/10 px-4 py-2 text-center text-[11px] font-semibold uppercase tracking-[0.16em] text-[#B45309]"
    >
      You are offline — checkout and account changes need a connection
    </div>
  );
}
