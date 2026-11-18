"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { CartItem } from "@/data/cart";
import { fetchMyPromo } from "@/lib/api";
import { useAccount } from "@/components/AccountProvider";

const CART_KEY = "genericpcs.cart";
const PROMO_KEY = "genericpcs.promo";

export type AppliedPromo = {
  code: string;
  rate: number;
};

type CartContextValue = {
  items: CartItem[];
  count: number;
  subtotal: number;
  promo: AppliedPromo | null;
  ready: boolean;
  applyPromo: (code: string) => string | null;
  clearPromo: () => void;
  add: (item: CartItem) => void;
  remove: (id: string) => void;
  setQuantity: (id: string, quantity: number) => void;
  clear: () => void;
  quantityOf: (id: string) => number;
};

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const { token, ready: accountReady } = useAccount();
  const [items, setItems] = useState<CartItem[]>([]);
  const [promo, setPromo] = useState<AppliedPromo | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const stored = window.localStorage.getItem(CART_KEY);

        if (stored) {
          setItems(JSON.parse(stored) as CartItem[]);
        }

      } catch {
        window.localStorage.removeItem(CART_KEY);
        window.localStorage.removeItem(PROMO_KEY);
      }

      setReady(true);
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  // Load the signed-in user's assigned promo from the server. This is the
  // authoritative source; the cart only uses it for display.
  useEffect(() => {
    if (!accountReady) return;

    if (!token) {
      const timer = window.setTimeout(() => {
        setPromo(null);
        window.localStorage.removeItem(PROMO_KEY);
      }, 0);
      return () => window.clearTimeout(timer);
    }

    let cancelled = false;

    fetchMyPromo(token)
      .then((result) => {
        if (cancelled) return;

        if (result.promo?.active && result.promo.discount > 0) {
          setPromo({ code: result.promo.code, rate: result.promo.discount / 100 });
        } else {
          setPromo(null);
          window.localStorage.removeItem(PROMO_KEY);
        }
      })
      .catch(() => {
        if (!cancelled) setPromo(null);
      });

    return () => {
      cancelled = true;
    };
  }, [accountReady, token]);

  const persist = useCallback((next: CartItem[]) => {
    setItems(next);
    window.localStorage.setItem(CART_KEY, JSON.stringify(next));
  }, []);

  const applyPromo = useCallback(
    (rawCode: string): string | null => {
      const code = rawCode.trim().toUpperCase();

      if (!code) return "Enter a promo code.";

      if (!promo) return "Sign in to use a promo code.";

      if (promo.code.toUpperCase() !== code) {
        return "That code is not assigned to your account.";
      }

      // The rate already came from the server.
      window.localStorage.setItem(PROMO_KEY, JSON.stringify(promo));
      return null;
    },
    [promo]
  );

  const clearPromo = useCallback(() => {
    setPromo(null);
    window.localStorage.removeItem(PROMO_KEY);
  }, []);

  const value = useMemo<CartContextValue>(() => {
    const count = items.reduce((sum, item) => sum + item.quantity, 0);
    const subtotal = items.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );

    return {
      items,
      count,
      subtotal,
      promo,
      ready,
      applyPromo,
      clearPromo,
      add: (item: CartItem) => {
        const existing = items.find((entry) => entry.id === item.id);

        persist(
          existing
            ? items.map((entry) =>
                entry.id === item.id
                  ? { ...entry, quantity: entry.quantity + 1 }
                  : entry
              )
            : [...items, { ...item, quantity: 1 }]
        );
      },
      remove: (id: string) => persist(items.filter((entry) => entry.id !== id)),
      setQuantity: (id: string, quantity: number) => {
        if (quantity <= 0) {
          persist(items.filter((entry) => entry.id !== id));
          return;
        }

        persist(
          items.map((entry) =>
            entry.id === id ? { ...entry, quantity } : entry
          )
        );
      },
      clear: () => {
        persist([]);
        clearPromo();
      },
      quantityOf: (id: string) =>
        items.find((entry) => entry.id === id)?.quantity ?? 0,
    };
  }, [items, ready, persist, promo, applyPromo, clearPromo]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);

  if (!context) {
    throw new Error("useCart must be used inside a CartProvider");
  }

  return context;
}
