"use client";

import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import LiveChatPanel from "@/components/LiveChatPanel";

type ChatContextValue = {
  open: boolean;
  openChat: () => void;
  closeChat: () => void;
  toggleChat: () => void;
};

const ChatContext = createContext<ChatContextValue | null>(null);

/** Provides a single, site-wide chat panel and its open state. */
export function ChatProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);

  const value = useMemo<ChatContextValue>(
    () => ({
      open,
      openChat: () => setOpen(true),
      closeChat: () => setOpen(false),
      toggleChat: () => setOpen((current) => !current),
    }),
    [open]
  );

  return (
    <ChatContext.Provider value={value}>
      {children}
      <LiveChatPanel open={open} onClose={() => setOpen(false)} />
    </ChatContext.Provider>
  );
}

export function useChat() {
  const context = useContext(ChatContext);

  if (!context) {
    throw new Error("useChat must be used inside a ChatProvider");
  }

  return context;
}
