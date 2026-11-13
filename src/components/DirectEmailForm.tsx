"use client";

import { useEffect, useRef, useState } from "react";
import { CheckIcon } from "@/components/BuildIcons";
import { MailIcon, SendIcon } from "@/components/SupportIcons";
import { ownersEmail } from "@/data/support";

type Field = "name" | "email" | "subject" | "message";

type Errors = Partial<Record<Field, string>>;

const baseField =
  "w-full rounded-lg border bg-[#f8fafe] px-3.5 text-sm text-[#2e3338] outline-none transition-colors placeholder:text-[#80848e] focus:border-[#5865F2]";

export default function DirectEmailForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [errors, setErrors] = useState<Errors>({});
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timer.current) {
        clearTimeout(timer.current);
      }
    };
  }, []);

  function validate(): Errors {
    const next: Errors = {};

    if (!name.trim()) next.name = "Tell us who you are.";

    if (!email.trim()) {
      next.email = "We need an address to reply to.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      next.email = "That email address does not look right.";
    }

    if (!subject.trim()) next.subject = "Add a short subject.";

    if (!message.trim()) {
      next.message = "Write the details of your request.";
    } else if (message.trim().length < 10) {
      next.message = "Add a little more detail (10 characters or more).";
    }

    return next;
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const nextErrors = validate();

    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    setSending(true);

    timer.current = setTimeout(() => {
      setSending(false);
      setSent(true);
    }, 700);
  }

  if (sent) {
    return (
      <div className="flex h-full flex-col items-center justify-center rounded-2xl border border-[#dce3ee] bg-[#eaf0f8] p-8 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[#16A34A]/10 text-[#15803D]">
          <CheckIcon className="h-7 w-7" />
        </span>
        <h3 className="mt-5 text-xl font-bold tracking-tight text-[#2e3338]">
          Message sent
        </h3>
        <p className="mt-2 max-w-sm text-sm leading-relaxed text-[#5c5e66]">
          Your note is on its way to the owners at{" "}
          <span className="font-semibold text-[#2e3338]">{ownersEmail}</span>.
          Replies come from the same address within one business day.
        </p>
        <button
          type="button"
          onClick={() => {
            setSent(false);
            setMessage("");
            setSubject("");
          }}
          className="mt-6 inline-flex h-11 items-center justify-center rounded-lg border border-[#d2dbe8] bg-[#f8fafe] px-5 text-sm font-semibold text-[#5c5e66] transition-colors hover:border-[#b8c4d6] hover:text-[#2e3338]"
        >
          Send another message
        </button>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="rounded-2xl border border-[#dce3ee] bg-[#eaf0f8] p-6 sm:p-8"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-xl font-bold tracking-tight text-[#2e3338]">
          Email the owners directly
        </h3>
        <span className="inline-flex items-center gap-2 rounded-full border border-[#d2dbe8] bg-[#f8fafe] px-3 py-1.5 text-xs font-semibold text-[#5c5e66]">
          <MailIcon className="h-3.5 w-3.5 text-[#5865F2]" />
          {ownersEmail}
        </span>
      </div>

      <p className="mt-2 text-sm leading-relaxed text-[#5c5e66]">
        This goes straight to the people who run Pcmart — no ticket queue, no
        forwarding.
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div>
          <label
            htmlFor="support-name"
            className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.14em] text-[#80848e]"
          >
            Your name
          </label>
          <input
            id="support-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Ada Lovelace"
            aria-invalid={Boolean(errors.name)}
            aria-describedby={errors.name ? "support-name-error" : undefined}
            className={`${baseField} h-11 ${
              errors.name ? "border-[#DC2626]" : "border-[#d2dbe8]"
            }`}
          />
          {errors.name && (
            <p id="support-name-error" className="mt-1.5 text-xs text-[#B91C1C]">
              {errors.name}
            </p>
          )}
        </div>

        <div>
          <label
            htmlFor="support-email"
            className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.14em] text-[#80848e]"
          >
            Reply-to email
          </label>
          <input
            id="support-email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
            aria-invalid={Boolean(errors.email)}
            aria-describedby={errors.email ? "support-email-error" : undefined}
            className={`${baseField} h-11 ${
              errors.email ? "border-[#DC2626]" : "border-[#d2dbe8]"
            }`}
          />
          {errors.email && (
            <p id="support-email-error" className="mt-1.5 text-xs text-[#B91C1C]">
              {errors.email}
            </p>
          )}
        </div>
      </div>

      <div className="mt-4">
        <label
          htmlFor="support-subject"
          className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.14em] text-[#80848e]"
        >
          Subject
        </label>
        <input
          id="support-subject"
          value={subject}
          onChange={(event) => setSubject(event.target.value)}
          placeholder="Order #PC-20418 — delivery status"
          aria-invalid={Boolean(errors.subject)}
          aria-describedby={errors.subject ? "support-subject-error" : undefined}
          className={`${baseField} h-11 ${
            errors.subject ? "border-[#DC2626]" : "border-[#d2dbe8]"
          }`}
        />
        {errors.subject && (
          <p id="support-subject-error" className="mt-1.5 text-xs text-[#B91C1C]">
            {errors.subject}
          </p>
        )}
      </div>

      <div className="mt-4">
        <label
          htmlFor="support-message"
          className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.14em] text-[#80848e]"
        >
          Message
        </label>
        <textarea
          id="support-message"
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          rows={6}
          placeholder="Tell us what you need. Include order numbers, part names, or anything that helps us act fast."
          aria-invalid={Boolean(errors.message)}
          aria-describedby={errors.message ? "support-message-error" : undefined}
          className={`${baseField} resize-y py-3 ${
            errors.message ? "border-[#DC2626]" : "border-[#d2dbe8]"
          }`}
        />
        {errors.message && (
          <p id="support-message-error" className="mt-1.5 text-xs text-[#B91C1C]">
            {errors.message}
          </p>
        )}
      </div>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs leading-relaxed text-[#80848e]">
          We only use this address to reply to your request.
        </p>
        <button
          type="submit"
          disabled={sending}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-[#5865F2] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#4752C4] disabled:opacity-70"
        >
          <SendIcon className="h-4 w-4" />
          {sending ? "Sending…" : "Send email"}
        </button>
      </div>
    </form>
  );
}
