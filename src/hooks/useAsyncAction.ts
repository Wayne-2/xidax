"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { friendlyError, isRetryable } from "@/lib/errors";
import { useToast } from "@/components/ToastProvider";

type Options = {
  /** Shown when the action fails. Defaults to the error's own message. */
  fallback?: string;
  /** Turn the failure into a toast with a Retry button. */
  retry?: boolean;
  /** Called after a successful run. */
  onSuccess?: (result: unknown) => void;
  /** Skip the toast entirely and let the caller handle the error. */
  silent?: boolean;
};

/**
 * One place to run an async user action: it blocks double submits, keeps the
 * pending flag, and turns anything that goes wrong into a message the
 * shopper can read.
 */
export function useAsyncAction<Args extends unknown[], Result>(
  action: (...args: Args) => Promise<Result>,
  options: Options = {}
) {
  const toast = useToast();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const running = useRef(false);
  const runRef = useRef<
    ((...args: Args) => Promise<Result | undefined>) | null
  >(null);

  const run = useCallback(
    async (...args: Args): Promise<Result | undefined> => {
      if (running.current) {
        return undefined;
      }

      running.current = true;
      setPending(true);
      setError(null);

      try {
        const result = await action(...args);

        options.onSuccess?.(result);

        return result;
      } catch (caught) {
        const message = friendlyError(caught, options.fallback);

        setError(message);

        if (!options.silent) {
          toast.error(message, {
            action:
              options.retry && isRetryable(caught)
                ? {
                    label: "Retry",
                    onClick: () => {
                      void runRef.current?.(...args);
                    },
                  }
                : undefined,
          });
        }

        return undefined;
      } finally {
        running.current = false;
        setPending(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [action, options.fallback, options.retry, options.silent, toast]
  );

  useEffect(() => {
    runRef.current = run;
  }, [run]);

  return { run, pending, error, setError };
}
