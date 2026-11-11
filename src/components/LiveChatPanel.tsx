"use client";

import { useEffect, useRef, useState } from "react";
import { CloseIcon, SendIcon, UserIcon } from "@/components/SupportIcons";

type Message = {
  id: number;
  from: "agent" | "user";
  text: string;
};

type LiveChatPanelProps = {
  open: boolean;
  onClose: () => void;
};

export default function LiveChatPanel({ open, onClose }: LiveChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1,
      from: "agent",
      text: "Hi there. You have reached Pcmart support. Tell us what you need help with and we will pick it up right away.",
    },
  ]);
  const [draft, setDraft] = useState("");
  const [typing, setTyping] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const replyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const counter = useRef(1);

  useEffect(() => {
    if (open) {
      inputRef.current?.focus();
    }
  }, [open]);

  useEffect(() => {
    const list = listRef.current;

    if (list) {
      list.scrollTop = list.scrollHeight;
    }
  }, [messages, typing]);

  useEffect(() => {
    if (!open) return;

    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    window.addEventListener("keydown", handleKey);

    return () => window.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  useEffect(() => {
    return () => {
      if (replyTimer.current) {
        clearTimeout(replyTimer.current);
      }
    };
  }, []);

  function sendMessage(event: React.FormEvent) {
    event.preventDefault();
    const text = draft.trim();

    if (!text) return;

    counter.current += 1;
    setMessages((current) => [...current, { id: counter.current, from: "user", text }]);
    setDraft("");
    setTyping(true);

    if (replyTimer.current) {
      clearTimeout(replyTimer.current);
    }

    replyTimer.current = setTimeout(() => {
      counter.current += 1;
      setTyping(false);
      setMessages((current) => [
        ...current,
        {
          id: counter.current,
          from: "agent",
          text: "Thanks, we have that. A technician will reply here shortly — usually within three minutes.",
        },
      ]);
    }, 900);
  }

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-label="Live chat with Pcmart support"
      className="animate-chat-in fixed bottom-4 right-4 z-50 flex max-h-[min(30rem,calc(100vh-2rem))] w-[min(22rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border border-[#d2dbe8] bg-[#f8fafe] shadow-2xl"
    >
      <div className="flex items-center gap-3 bg-[#2e3338] px-4 py-3 text-white">
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#5865F2] text-xs font-bold">
          PC
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">Pcmart Support</p>
          <p className="flex items-center gap-1.5 text-[11px] text-white/70">
            <span className="h-1.5 w-1.5 rounded-full bg-[#34D399]" />
            Online now
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close live chat"
          className="flex h-8 w-8 items-center justify-center rounded-full text-white/70 transition-colors hover:bg-white/10 hover:text-white"
        >
          <CloseIcon className="h-4 w-4" />
        </button>
      </div>

      <div
        ref={listRef}
        role="log"
        aria-live="polite"
        className="flex flex-1 flex-col gap-3 overflow-y-auto px-4 py-4"
      >
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex max-w-[85%] flex-col gap-1 ${
              message.from === "user" ? "self-end items-end" : "self-start"
            }`}
          >
            {message.from === "user" && (
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#eaf0f8] text-[#5c5e66]">
                <UserIcon className="h-3.5 w-3.5" />
              </span>
            )}
            <p
              className={`rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                message.from === "user"
                  ? "bg-[#5865F2] text-white"
                  : "border border-[#dce3ee] bg-[#eaf0f8] text-[#2e3338]"
              }`}
            >
              {message.text}
            </p>
          </div>
        ))}

        {typing && (
          <p className="self-start rounded-2xl border border-[#dce3ee] bg-[#eaf0f8] px-3.5 py-2.5 text-sm text-[#5c5e66]">
            Typing…
          </p>
        )}
      </div>

      <form onSubmit={sendMessage} className="flex items-center gap-2 border-t border-[#dce3ee] p-3">
        <label htmlFor="chat-message" className="sr-only">
          Message
        </label>
        <input
          id="chat-message"
          ref={inputRef}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Type your message…"
          className="h-10 min-w-0 flex-1 rounded-lg border border-[#d2dbe8] bg-[#f0f4fa] px-3 text-sm text-[#2e3338] outline-none transition-colors placeholder:text-[#80848e] focus:border-[#5865F2]"
        />
        <button
          type="submit"
          aria-label="Send message"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#5865F2] text-white transition-colors hover:bg-[#4752C4] disabled:opacity-50"
          disabled={!draft.trim()}
        >
          <SendIcon className="h-4 w-4" />
        </button>
      </form>
    </div>
  );
}
