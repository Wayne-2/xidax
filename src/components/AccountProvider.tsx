"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { demoUser, type AccountUser } from "@/data/account";

const STORAGE_KEY = "pcmart.account";

type AccountContextValue = {
  user: AccountUser | null;
  ready: boolean;
  signIn: (email: string) => void;
  signUp: (name: string, email: string) => void;
  signOut: () => void;
};

const AccountContext = createContext<AccountContextValue | null>(null);

export function AccountProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [user, setUser] = useState<AccountUser | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const stored = window.localStorage.getItem(STORAGE_KEY);

      if (stored) {
        try {
          setUser(JSON.parse(stored) as AccountUser);
        } catch {
          window.localStorage.removeItem(STORAGE_KEY);
        }
      }

      setReady(true);
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  const persist = useCallback((next: AccountUser | null) => {
    setUser(next);

    if (next) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } else {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  const value = useMemo<AccountContextValue>(
    () => ({
      user,
      ready,
      signIn: (email: string) =>
        persist({ ...demoUser, email: email.trim() || demoUser.email }),
      signUp: (name: string, email: string) =>
        persist({
          ...demoUser,
          name: name.trim() || email.split("@")[0] || demoUser.name,
          email: email.trim() || demoUser.email,
        }),
      signOut: () => persist(null),
    }),
    [user, ready, persist]
  );

  return (
    <AccountContext.Provider value={value}>{children}</AccountContext.Provider>
  );
}

export function useAccount() {
  const context = useContext(AccountContext);

  if (!context) {
    throw new Error("useAccount must be used inside an AccountProvider");
  }

  return context;
}
