"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  defaultSettings,
  demoUser,
  type AccountSettings,
  type AccountUser,
} from "@/data/account";

const SESSION_KEY = "pcmart.account";
const SETTINGS_KEY = "pcmart.settings";

type AccountContextValue = {
  user: AccountUser | null;
  settings: AccountSettings;
  ready: boolean;
  signIn: (email: string) => void;
  signUp: (
    name: string,
    email: string,
    country: string,
    postalCode: string
  ) => void;
  signOut: () => void;
  updateProfile: (patch: Partial<AccountUser>) => void;
  saveSettings: (patch: Partial<AccountSettings>) => void;
  resetSettings: () => void;
};

const AccountContext = createContext<AccountContextValue | null>(null);

function readStored<T>(key: string): T | null {
  try {
    const stored = window.localStorage.getItem(key);
    return stored ? (JSON.parse(stored) as T) : null;
  } catch {
    window.localStorage.removeItem(key);
    return null;
  }
}

export function AccountProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [user, setUser] = useState<AccountUser | null>(null);
  const [settings, setSettings] = useState<AccountSettings>(defaultSettings);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const storedUser = readStored<AccountUser>(SESSION_KEY);

      if (storedUser) {
        setUser(storedUser);
      }

      const storedSettings = readStored<Partial<AccountSettings>>(SETTINGS_KEY);

      if (storedSettings) {
        setSettings({ ...defaultSettings, ...storedSettings });
      }

      setReady(true);
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  const persistUser = useCallback((next: AccountUser | null) => {
    setUser(next);

    if (next) {
      window.localStorage.setItem(SESSION_KEY, JSON.stringify(next));
    } else {
      window.localStorage.removeItem(SESSION_KEY);
    }
  }, []);

  const value = useMemo<AccountContextValue>(
    () => ({
      user,
      settings,
      ready,
      signIn: (email: string) =>
        persistUser({ ...demoUser, email: email.trim() || demoUser.email }),
      signUp: (
        name: string,
        email: string,
        country: string,
        postalCode: string
      ) =>
        persistUser({
          ...demoUser,
          name: name.trim() || email.split("@")[0] || demoUser.name,
          email: email.trim() || demoUser.email,
          country: country.trim() || demoUser.country,
          postalCode: postalCode.trim() || demoUser.postalCode,
        }),
      signOut: () => persistUser(null),
      updateProfile: (patch: Partial<AccountUser>) => {
        setUser((current) => {
          if (!current) return current;

          const next = { ...current, ...patch };
          window.localStorage.setItem(SESSION_KEY, JSON.stringify(next));
          return next;
        });
      },
      saveSettings: (patch: Partial<AccountSettings>) => {
        setSettings((current) => {
          const next = { ...current, ...patch };
          window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
          return next;
        });
      },
      resetSettings: () => {
        window.localStorage.removeItem(SETTINGS_KEY);
        setSettings(defaultSettings);
      },
    }),
    [user, settings, ready, persistUser]
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
