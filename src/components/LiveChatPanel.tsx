"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useToast } from "@/components/ToastProvider";
import {
  fetchChatHistory,
  sendChatMessage,
  type ChatMessagePayload,
} from "@/lib/api";
import { CloseIcon, SendIcon, ChatIcon } from "@/components/SupportIcons";

const QUICK_REPLIES = [
  "Shipping options",
  "Track my order",
  "Return policy",
  "Payment methods",
  "Product specs",
  "Talk to a human",
];

export default function LiveChatPanel({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [messages, setMessages] = useState<ChatMessagePayload[]>([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>(QUICK_REPLIES);
  const [loading, setLoading] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const toast = useToast();

  // Load conversation when the panel opens.
  useEffect(() => {
    if (!open) return;

    let cancelled = false;

    const timer = window.setTimeout(() => {
      if (!cancelled) setLoading(true);
    }, 0);

    fetchChatHistory()
      .then((result) => {
        if (!cancelled) setMessages(result.messages ?? []);
      })
      .catch(() => {
        if (!cancelled) {
          setMessages([
            {
              id: "local-greeting",
              role: "assistant",
              text: "Hi! I'm the Generic PCs assistant. How can I help?",
              createdAt: new Date().toISOString(),
            },
          ]);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [open]);

  // Focus the input and scroll to the newest message.
  useEffect(() => {
    if (!open) return;

    const timer = window.setTimeout(() => inputRef.current?.focus(), 80);

    return () => window.clearTimeout(timer);
  }, [open]);

  useEffect(() => {
    listRef.current?.scrollTo({
      top: listRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, sending]);

  // Close on Escape.
  useEffect(() => {
    if (!open) return;

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    window.addEventListener("keydown", onKey);

    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const send = useCallback(
    async (text: string) => {
      const question = text.trim();

      if (!question || sending) return;

      setDraft("");
      setSending(true);

      // Optimistic user bubble.
      setMessages((current) => [
        ...current,
        {
          id: `temp-${Date.now()}`,
          role: "user",
          text: question,
          createdAt: new Date().toISOString(),
        },
      ]);

      try {
        const result = await sendChatMessage(question);

        setMessages((current) => [
          ...current.filter((message) => !message.id.startsWith("temp-")),
          {
            id: `reply-${Date.now()}`,
            role: "assistant",
            text: result.answer,
            createdAt: new Date().toISOString(),
          },
        ]);

        if (result.suggestions?.length) setSuggestions(result.suggestions);
      } catch {
        toast.error("Could not reach the assistant. Please try again.");
      } finally {
        setSending(false);
      }
    },
    [sending, toast]
  );

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Support chat"
      className="animate-chat-in fixed bottom-4 right-4 z-[70] flex h-[480px] w-[calc(100vw-2rem)] max-w-sm flex-col overflow-hidden rounded-2xl border border-[#dce3ee] bg-white shadow-2xl sm:bottom-6 sm:right-6"
    >
      <div className="flex shrink-0 items-center justify-between bg-[#2e3338] px-4 py-3 text-white">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#5865F2]">
            <ChatIcon className="h-4 w-4" />
          </span>
          <div>
            <p className="text-sm font-semibold">Generic PCs support</p>
            <p className="flex items-center gap-1.5 text-[11px] text-white/70">
              <span className="h-1.5 w-1.5 rounded-full bg-[#34D399]" />
              Online now
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close chat"
          className="flex h-8 w-8 items-center justify-center rounded-lg text-white/70 transition-colors hover:bg-white/10 hover:text-white"
        >
          <CloseIcon className="h-4 w-4" />
        </button>
      </div>

      <div
        ref={listRef}
        role="log"
        aria-live="polite"
        className="flex-1 space-y-3 overflow-y-auto bg-[#f8fafe] px-3 py-4"
      >
        {loading ? (
          <p className="text-center text-sm text-[#80848e]">Loading chat…</p>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed shadow-card ${
                  message.role === "user"
                    ? "bg-[#5865F2] text-white"
                    : "border border-[#dce3ee] bg-white text-[#2e3338]"
                }`}
              >
                {message.text}
              </div>
            </div>
          ))
        )}

        {sending && (
          <div className="flex justify-start">
            <div className="rounded-2xl border border-[#dce3ee] bg-white px-3.5 py-2.5 text-sm text-[#80848e] shadow-card">
              Typing…
            </div>
          </div>
        )}
      </div>

      <div className="shrink-0 border-t border-[#dce3ee] bg-white px-3 pb-3 pt-2">
        <div className="mb-2 flex gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {suggestions.map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              onClick={() => send(suggestion)}
              disabled={sending}
              className="shrink-0 rounded-full border border-[#d2dbe8] bg-[#f0f4fa] px-2.5 py-1 text-[11px] font-semibold text-[#5c5e66] transition-colors hover:border-[#5865F2]/50 hover:text-[#4752C4] disabled:opacity-50"
            >
              {suggestion}
            </button>
          ))}
        </div>

        <form
          onSubmit={(event) => {
            event.preventDefault();
            void send(draft);
          }}
          className="flex gap-2"
        >
          <input
            ref={inputRef}
            id="chat-message"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Ask us anything…"
            className="h-10 min-w-0 flex-1 rounded-xl border border-[#d2dbe8] bg-[#f0f4fa] px-3 text-sm outline-none transition-colors focus:border-[#5865F2]"
          />
          <button
            type="submit"
            disabled={sending || !draft.trim()}
            aria-label="Send message"
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#5865F2] text-white transition-colors hover:bg-[#4752C4] disabled:opacity-50"
          >
            <SendIcon className="h-4 w-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
