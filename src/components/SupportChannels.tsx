"use client";

import { useState } from "react";
import { ChatIcon, MailIcon, PhoneIcon } from "@/components/SupportIcons";
import LiveChatPanel from "@/components/LiveChatPanel";
import {
  supportChannels,
  supportEmail,
  supportPhoneHref,
} from "@/data/support";

export default function SupportChannels() {
  const [chatOpen, setChatOpen] = useState(false);

  return (
    <>
      <div className="grid gap-5 md:grid-cols-3">
        {supportChannels.map((channel, index) => (
          <article
            key={channel.id}
            data-reveal="up"
            style={{ animationDelay: `${index * 120}ms` }}
            className="flex flex-col rounded-2xl border border-[#dce3ee] bg-[#eaf0f8] p-6 transition-colors hover:border-[#5865F2]/50"
          >
            <span
              className="flex h-12 w-12 items-center justify-center rounded-xl border border-[#d2dbe8]"
              style={{
                backgroundColor: `${channel.accent}14`,
                color: channel.accent,
              }}
            >
              {channel.id === "phone" && <PhoneIcon className="h-6 w-6" />}
              {channel.id === "chat" && <ChatIcon className="h-6 w-6" />}
              {channel.id === "email" && <MailIcon className="h-6 w-6" />}
            </span>

            <h3 className="mt-5 text-lg font-bold tracking-tight text-[#2e3338]">
              {channel.title}
            </h3>

            <p className="mt-2 text-sm leading-relaxed text-[#5c5e66]">
              {channel.description}
            </p>

            <ul className="mt-4 space-y-1.5 border-t border-[#d2dbe8] pt-4">
              {channel.details.map((detail) => (
                <li
                  key={detail}
                  className="text-xs font-medium tracking-wide text-[#5c5e66]"
                >
                  {detail}
                </li>
              ))}
            </ul>

            <div className="mt-auto pt-6">
              {channel.id === "phone" && (
                <a
                  href={supportPhoneHref}
                  className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#5865F2] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#4752C4]"
                >
                  <PhoneIcon className="h-4 w-4" />
                  {channel.action}
                </a>
              )}

              {channel.id === "email" && (
                <a
                  href={`mailto:${supportEmail}`}
                  className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#5865F2] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#4752C4]"
                >
                  <MailIcon className="h-4 w-4" />
                  {channel.action}
                </a>
              )}

              {channel.id === "chat" && (
                <button
                  type="button"
                  onClick={() => setChatOpen(true)}
                  className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#5865F2] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#4752C4]"
                >
                  <ChatIcon className="h-4 w-4" />
                  {channel.action}
                </button>
              )}
            </div>
          </article>
        ))}
      </div>

      <LiveChatPanel open={chatOpen} onClose={() => setChatOpen(false)} />
    </>
  );
}
