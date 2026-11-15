"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { friendlyError } from "@/lib/errors";

export type ToastTone = "error" | "success" | "info";

export type ToastAction = {
  label: string;
  onClick: () => void;
};

export type Toast = {
  id: number;
  tone: ToastTone;
  message: string;
  action?: ToastAction;
};

type ToastOptions = {
  action?: ToastAction;
  duration?: number;
};

type ToastContextValue = {
  toasts: Toast[];
  push: (tone: ToastTone, message: string, options?: ToastOptions) => void;
  success: (message: string, options?: ToastOptions) => void;
  error: (message: string, options?: ToastOptions) => void;
  info: (message: string, options?: ToastOptions) => void;
  dismiss: (id: number) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

const toneStyles: Record<ToastTone, string> = {
  error: "border-[#DC2626]/40 bg-[#fdf2f2] text-[#B91C1C]",
  success: "border-[#16A34A]/35 bg-[#f0faf3] text-[#15803D]",
  info: "border-[#d2dbe8] bg-[#f8fafe] text-[#2e3338]",
};

const toneMarks: Record<ToastTone, string> = {
  error: "!",
  success: "✓",
  info: "·",
};

const DEFAULT_DURATION: Record<ToastTone, number> = {
  error: 7000,
  success: 4000,
  info: 4500,
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(1);
  const timers = useRef<Map<number, ReturnType<typeof setTimeout>>>(
    new Map()
  );

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));

    const timer = timers.current.get(id);

    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
  }, []);

  const push = useCallback(
    (tone: ToastTone, message: string, options: ToastOptions = {}) => {
      const id = nextId.current++;

      setToasts((current) => [
        ...current.slice(-3),
        { id, tone, message, action: options.action },
      ]);

      const duration = options.duration ?? DEFAULT_DURATION[tone];
      const timer = setTimeout(() => dismiss(id), duration);

      timers.current.set(id, timer);
    },
    [dismiss]
  );

  const value = useMemo<ToastContextValue>(
    () => ({
      toasts,
      push,
      dismiss,
      success: (message, options) => push("success", message, options),
      error: (message, options) => push("error", message, options),
      info: (message, options) => push("info", message, options),
    }),
    [toasts, push, dismiss]
  );

  useEffect(() => {
    function onRejection(event: PromiseRejectionEvent) {
      const message = friendlyError(
        event.reason,
        "Something went wrong. Please try again."
      );

      push("error", message);
    }

    function onError(event: ErrorEvent) {
      if (!event.message) return;

      push("error", friendlyError(event.error, event.message));
    }

    window.addEventListener("unhandledrejection", onRejection);
    window.addEventListener("error", onError);

    return () => {
      window.removeEventListener("unhandledrejection", onRejection);
      window.removeEventListener("error", onError);
    };
  }, [push]);

  useEffect(() => {
    const pending = timers.current;

    return () => {
      pending.forEach((timer) => clearTimeout(timer));
      pending.clear();
    };
  }, []);

  return (
    <ToastContext.Provider value={value}>
      {children}

      <div
        aria-live="polite"
        aria-atomic="false"
        className="pointer-events-none fixed inset-x-0 bottom-0 z-[60] flex flex-col items-center gap-2 px-4 pb-4 sm:inset-x-auto sm:right-4 sm:items-end sm:px-0"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            role="status"
            className={`pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-2xl border px-4 py-3 shadow-[0_18px_40px_-24px_rgba(46,51,56,0.6)] ${toneStyles[toast.tone]}`}
          >
            <span
              aria-hidden="true"
              className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-current text-[11px] font-bold opacity-80"
            >
              {toneMarks[toast.tone]}
            </span>

            <p className="min-w-0 flex-1 text-sm leading-relaxed">
              {toast.message}
            </p>

            {toast.action && (
              <button
                type="button"
                onClick={() => {
                  toast.action?.onClick();
                  dismiss(toast.id);
                }}
                className="shrink-0 text-xs font-bold uppercase tracking-[0.12em] underline-offset-2 transition-opacity hover:underline"
              >
                {toast.action.label}
              </button>
            )}

            <button
              type="button"
              onClick={() => dismiss(toast.id)}
              aria-label="Dismiss"
              className="-mr-1 -mt-1 shrink-0 rounded-lg px-1.5 py-1 text-xs font-bold opacity-60 transition-opacity hover:opacity-100"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);

  if (!context) {
    throw new Error("useToast must be used inside ToastProvider");
  }

  return context;
}
