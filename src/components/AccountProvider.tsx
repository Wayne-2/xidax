"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useToast } from "@/components/ToastProvider";
import { friendlyError } from "@/lib/errors";
import {
  createAccountProduct,
  deleteAccountProduct,
  fetchAccount,
  fetchAccountOrders,
  fetchAccountProducts,
  loginAccount,
  logoutAccount,
  registerAccount,
  updateAccount,
  updateAccountSettings,
  type AccountOrderPayload,
  type AccountProductPayload,
  type AccountSettingsPayload,
  type AccountUserPayload,
} from "@/lib/api";

const TOKEN_KEY = "generic-pcs.session";

type AccountContextValue = {
  user: AccountUserPayload | null;
  settings: AccountSettingsPayload;
  orders: AccountOrderPayload[];
  products: AccountProductPayload[];
  ready: boolean;
  busy: boolean;
  error: string;
  signIn: (email: string, password: string) => Promise<string | null>;
  signUp: (input: {
    name: string;
    email: string;
    phone: string;
    country: string;
    postalCode: string;
    password: string;
  }) => Promise<string | null>;
  signOut: () => Promise<void>;
  updateProfile: (patch: Partial<AccountUserPayload>) => Promise<void>;
  saveSettings: (patch: Partial<AccountSettingsPayload>) => Promise<void>;
  resetSettings: () => Promise<void>;
  addProduct: (input: {
    kind: "pc" | "laptop";
    name: string;
    orderNumber: string;
    purchasedOn: string;
  }) => Promise<AccountProductPayload | string>;
  removeProduct: (id: string) => Promise<void>;
  refresh: () => Promise<void>;
};

const defaultSettings: AccountSettingsPayload = {
  orderUpdates: true,
  dropNotifications: true,
  marketingEmails: false,
  language: "English (Nigeria)",
  currency: "USD ($)",
};

const AccountContext = createContext<AccountContextValue | null>(null);

export function AccountProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [user, setUser] = useState<AccountUserPayload | null>(null);
  const [settings, setSettings] =
    useState<AccountSettingsPayload>(defaultSettings);
  const [orders, setOrders] = useState<AccountOrderPayload[]>([]);
  const [products, setProducts] = useState<AccountProductPayload[]>([]);
  const [token, setToken] = useState<string | null>(null);
  const toast = useToast();
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const readToken = useCallback(() => {
    try {
      return window.localStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  }, []);

  const loadSession = useCallback(
    async (activeToken: string | null) => {
      if (!activeToken) {
        setUser(null);
        setOrders([]);
        setProducts([]);
        return;
      }

      const account = await fetchAccount(activeToken);

      if (account.user.emailVerified === false) {
        window.localStorage.removeItem(TOKEN_KEY);
        setToken(null);
        setUser(null);
        setSettings(defaultSettings);
        setOrders([]);
        setProducts([]);
        toast.error("Please verify your email address to continue.");
        return;
      }

      setUser(account.user);
      setSettings(account.settings);

      const [orderResult, productResult] = await Promise.all([
        fetchAccountOrders(activeToken).catch(() => ({ orders: [] })),
        fetchAccountProducts(activeToken).catch(() => ({ products: [] })),
      ]);

      setOrders(orderResult.orders);
      setProducts(productResult.products);
    },
    []
  );

  useEffect(() => {
    const timer = window.setTimeout(async () => {
      const stored = readToken();

      if (stored) {
        try {
          await loadSession(stored);
          setToken(stored);
        } catch {
          window.localStorage.removeItem(TOKEN_KEY);
          setToken(null);
        }
      }

      setReady(true);
    }, 0);

    return () => window.clearTimeout(timer);
  }, [loadSession, readToken]);

  const signIn = useCallback(
    async (email: string, password: string) => {
      setBusy(true);
      setError("");

      try {
        const result = await loginAccount(email, password);

        window.localStorage.setItem(TOKEN_KEY, result.token);
        setToken(result.token);
        await loadSession(result.token);

        return null;
      } catch (requestError) {
        const message = friendlyError(requestError, "We could not sign you in.");

        setError(message);

        return message;
      } finally {
        setBusy(false);
      }
    },
    [loadSession]
  );

  const signUp = useCallback(
    async (input: {
      name: string;
      email: string;
      phone: string;
      country: string;
      postalCode: string;
      password: string;
    }) => {
      setBusy(true);
      setError("");

      try {
        const result = await registerAccount(input);

        window.localStorage.setItem(TOKEN_KEY, result.token);
        setToken(result.token);
        await loadSession(result.token);

        return null;
      } catch (requestError) {
        const message = friendlyError(requestError, "We could not create that account.");

        setError(message);

        return message;
      } finally {
        setBusy(false);
      }
    },
    [loadSession]
  );

  const signOut = useCallback(async () => {
    const active = token ?? readToken();

    if (active) {
      try {
        await logoutAccount(active);
      } catch {
        toast.error(
          "We could not sign you out on the server, but this device is signed out."
        );
      }
    }

    window.localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setUser(null);
    setOrders([]);
    setProducts([]);
    setSettings(defaultSettings);
  }, [token, readToken, toast]);

  const updateProfile = useCallback(
    async (patch: Partial<AccountUserPayload>) => {
      const active = token ?? readToken();

      if (!active) return;

      const result = await updateAccount(active, patch);

      setUser(result.user);
    },
    [token, readToken]
  );

  const saveSettings = useCallback(
    async (patch: Partial<AccountSettingsPayload>) => {
      const active = token ?? readToken();

      if (!active) return;

      const result = await updateAccountSettings(active, patch);

      setSettings(result.settings);
    },
    [token, readToken]
  );

  const addProduct = useCallback(
    async (input: {
      kind: "pc" | "laptop";
      name: string;
      orderNumber: string;
      purchasedOn: string;
    }) => {
      const active = token ?? readToken();

      if (!active) return "You need to sign in first.";

      try {
        const result = await createAccountProduct(active, input);

        setProducts((current) => [result.product, ...current]);

        return result.product;
      } catch (requestError) {
        return requestError instanceof Error
          ? requestError.message
          : "We could not register that machine.";
      }
    },
    [token, readToken]
  );

  const removeProduct = useCallback(
    async (id: string) => {
      const active = token ?? readToken();

      if (!active) return;

      await deleteAccountProduct(active, id);
      setProducts((current) => current.filter((product) => product.id !== id));
    },
    [token, readToken]
  );

  const resetSettings = useCallback(async () => {
    const active = token ?? readToken();

    if (!active) return;

    const result = await updateAccountSettings(active, {
      orderUpdates: defaultSettings.orderUpdates,
      dropNotifications: defaultSettings.dropNotifications,
      marketingEmails: defaultSettings.marketingEmails,
      language: defaultSettings.language,
      currency: defaultSettings.currency,
    });

    setSettings(result.settings);
  }, [token, readToken]);

  const refresh = useCallback(async () => {
    const active = token ?? readToken();

    if (!active) return;

    try {
      await loadSession(active);
    } catch {
      // session expired
      window.localStorage.removeItem(TOKEN_KEY);
      setToken(null);
      setUser(null);
    }
  }, [token, readToken, loadSession]);

  const value = useMemo<AccountContextValue>(
    () => ({
      user,
      settings,
      orders,
      products,
      ready,
      busy,
      error,
      signIn,
      signUp,
      signOut,
      updateProfile,
      saveSettings,
      resetSettings,
      addProduct,
      removeProduct,
      refresh,
    }),
    [
      user,
      settings,
      orders,
      products,
      ready,
      busy,
      error,
      signIn,
      signUp,
      signOut,
      updateProfile,
      saveSettings,
      resetSettings,
      addProduct,
      removeProduct,
      refresh,
    ]
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
