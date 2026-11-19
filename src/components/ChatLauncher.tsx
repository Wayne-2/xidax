"use client";

import { usePathname } from "next/navigation";
import { useChat } from "@/components/ChatProvider";
import { ChatIcon, CloseIcon } from "@/components/SupportIcons";
import { useEffect, useState } from "react";

/** Floating chat launcher available on every page. */
export default function ChatLauncher() {
  const { open, toggleChat } = useChat();
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setVisible(true), 400);

    return () => window.clearTimeout(timer);
  }, []);

  // Hide the launcher on the checkout page so it does not cover payment steps.
  if (pathname?.startsWith("/checkout")) return null;

  return (
    <button
      type="button"
      onClick={toggleChat}
      aria-label={open ? "Close support chat" : "Open support chat"}
      title="Chat with us"
      className={`fixed bottom-5 right-5 z-[65] flex h-14 w-14 items-center justify-center rounded-full bg-[#5865F2] text-white shadow-[0_8px_30px_rgba(88,101,242,0.45)] transition-all duration-300 hover:scale-105 hover:bg-[#4752C4] focus:outline-none focus-visible:ring-4 focus-visible:ring-[#5865F2]/40 sm:bottom-6 sm:right-6 ${
        visible ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-4 opacity-0"
      }`}
    >
      {open ? <CloseIcon className="h-6 w-6" /> : <ChatIcon className="h-6 w-6" />}

      {!open && (
        <span className="absolute -right-0.5 -top-0.5 h-3.5 w-3.5 rounded-full border-2 border-white bg-[#34D399]" aria-hidden="true" />
      )}
    </button>
  );
}
