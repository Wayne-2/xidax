"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useAccount } from "@/components/AccountProvider";
import { useToast } from "@/components/ToastProvider";
import {
  defaultRegion,
  findRegion,
  formatBase,
  formatDate as formatDateValue,
  formatDateTime as formatDateTimeValue,
  formatMoney as formatMoneyValue,
  formatTime as formatTimeValue,
  isOpenNow,
  localClock,
  regionCountries,
  type Region,
} from "@/lib/regions";

const REGION_KEY = "genericpcs.region";

type RegionContextValue = {
  region: Region;
  countries: string[];
  ready: boolean;
  setCountry: (country: string) => void;
  formatMoney: (amountUsd: number, options?: { exact?: boolean }) => string;
  formatBase: (amountUsd: number) => string;
  formatDateTime: (iso: string) => string;
  formatDate: (iso: string) => string;
  formatTime: (iso: string) => string;
  clock: ReturnType<typeof localClock>;
  isOpen: (
    schedule: { day: string; open: number | null; close: number | null }[]
  ) => boolean;
};

const RegionContext = createContext<RegionContextValue | null>(null);

function guessCountry() {
  if (typeof window === "undefined") return null;

  try {
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

    if (timeZone) {
      const match = regionCountries.find((country) => {
        const region = findRegion(country);

        return region.timeZone === timeZone;
      });

      if (match) return match;
    }

    const locale = navigator.language ?? "";
    const regionCode = locale.split("-")[1]?.toUpperCase();

    if (regionCode) {
      const match = regionCountries.find(
        (country) => findRegion(country).code === regionCode
      );

      if (match) return match;
    }
  } catch {
    return null;
  }

  return null;
}

export function RegionProvider({ children }: { children: React.ReactNode }) {
  const { user, updateProfile } = useAccount();
  const toast = useToast();
  const [guestCountry, setGuestCountry] = useState<string | null>(null);
  const [pending, setPending] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      let stored: string | null = null;

      try {
        stored = window.localStorage.getItem(REGION_KEY);
      } catch {
        stored = null;
      }

      if (stored) {
        setGuestCountry(stored);
      } else {
        const guessed = guessCountry();

        if (guessed) setGuestCountry(guessed);
      }

      setReady(true);
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  const setCountry = useCallback(
    (next: string) => {
      setPending(next);

      try {
        window.localStorage.setItem(REGION_KEY, next);
      } catch {
        // storage is unavailable, the account still holds the choice
      }

      if (user) {
        if (user.country === next) {
          setPending(null);
          return;
        }

        updateProfile({ country: next })
          .catch(() => {
            toast.error(
              "We could not save your country. It will apply again next time."
            );
          })
          .finally(() => setPending(null));
      } else {
        setGuestCountry(next);
        setPending(null);
      }
    },
    [user, updateProfile, toast]
  );

  const country = pending ?? user?.country ?? guestCountry ?? defaultRegion.country;
  const region = useMemo(() => findRegion(country), [country]);

  const value = useMemo<RegionContextValue>(
    () => ({
      region,
      countries: regionCountries,
      ready,
      setCountry,
      formatMoney: (amountUsd, options) =>
        formatMoneyValue(amountUsd, region, options),
      formatBase,
      formatDateTime: (iso) => formatDateTimeValue(iso, region),
      formatDate: (iso) => formatDateValue(iso, region),
      formatTime: (iso) => formatTimeValue(iso, region),
      clock: localClock(region),
      isOpen: (schedule) => isOpenNow(region, schedule),
    }),
    [region, ready, setCountry]
  );

  return (
    <RegionContext.Provider value={value}>{children}</RegionContext.Provider>
  );
}

export function useRegion() {
  const context = useContext(RegionContext);

  if (!context) {
    throw new Error("useRegion must be used inside RegionProvider");
  }

  return context;
}
