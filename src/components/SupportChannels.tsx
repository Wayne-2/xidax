"use client";

import { useChat } from "@/components/ChatProvider";
import {
  supportChannels,
  supportEmail,
  supportPhoneHref,
} from "@/data/support";

export default function SupportChannels() {
  const { openChat } = useChat();

  return (
    <>
      <div className="grid gap-5 md:grid-cols-3">
        {supportChannels.map((channel, index) => (
          <article
            key={channel.id}
            data-reveal="up"
            style={{ animationDelay: `${index * 120}ms` }}
            className="flex flex-col rounded-2xl border border-[#dce3ee] bg-[#eaf0f8] shadow-card p-6 transition-colors hover:border-[#5865F2]/50 hover:shadow-card-hover"
          >
            <span
              className="text-[11px] font-bold uppercase tracking-[0.25em]"
              style={{ color: channel.accent }}
            >
              {String(index + 1).padStart(2, "0")}
            </span>

            <h3 className="mt-3 text-lg font-bold tracking-tight text-[#2e3338]">
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
                  {channel.action}
                </a>
              )}

              {channel.id === "email" && (
                <a
                  href={`mailto:${supportEmail}`}
                  className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#5865F2] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#4752C4]"
                >
                  {channel.action}
                </a>
              )}

              {channel.id === "chat" && (
                <button
                  type="button"
                  onClick={openChat}
                  className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#5865F2] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#4752C4]"
                >
                  {channel.action}
                </button>
              )}
            </div>
          </article>
        ))}
      </div>
    </>
  );
}
