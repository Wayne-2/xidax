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
import {
  addToCartRemote,
  clearCartRemote,
  fetchCart,
  removeFromCartRemote,
  updateCartItemRemote,
} from "@/lib/api";
import { fetchMyPromo } from "@/lib/api";
import { useAccount } from "@/components/AccountProvider";

const PROMO_KEY = "genericpcs.promo";
const CACHE_KEY = "genericpcs.cart.cache";

export type AppliedPromo = { code: string; rate: number };

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

  // Load cart from the Worker.
  useEffect(() => {
    if (!accountReady) return;

    let cancelled = false;

    // Render the cached cart immediately so a refresh never looks empty.
    const cacheTimer = window.setTimeout(() => {
      try {
        const cached = window.localStorage.getItem(CACHE_KEY);
        if (cached && !cancelled) setItems(JSON.parse(cached) as CartItem[]);
      } catch {
        // Ignore malformed cache.
      }
    }, 0);

    fetchCart(token)
      .then((result) => {
        if (!cancelled) {
          setItems(result.items ?? []);
          window.localStorage.setItem(CACHE_KEY, JSON.stringify(result.items ?? []));
        }
      })
      .catch(() => {
        // Keep the cached items on failure instead of clearing the cart.
      })
      .finally(() => {
        if (!cancelled) setReady(true);
      });

    return () => {
      cancelled = true;
      window.clearTimeout(cacheTimer);
    };
  }, [accountReady, token]);

  // Load the signed-in user's assigned promo.
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
          setPromo({
            code: result.promo.code,
            rate: result.promo.discount / 100,
          });
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

  const applyPromo = useCallback(
    (rawCode: string): string | null => {
      const code = rawCode.trim().toUpperCase();

      if (!code) return "Enter a promo code.";
      if (!promo) return "Sign in to use a promo code.";
      if (promo.code.toUpperCase() !== code) {
        return "That code is not assigned to your account.";
      }

      window.localStorage.setItem(PROMO_KEY, JSON.stringify(promo));
      return null;
    },
    [promo]
  );

  const clearPromo = useCallback(() => {
    setPromo(null);
    window.localStorage.removeItem(PROMO_KEY);
  }, []);

  const sync = useCallback((next: CartItem[]) => {
    setItems(next);
    window.localStorage.setItem(CACHE_KEY, JSON.stringify(next));
  }, []);

  const add = useCallback(
    (item: CartItem) => {
      addToCartRemote(item, token)
        .then((result) => sync(result.items))
        .catch(() => {
          // Offline fallback: update locally so the UI still responds.
          setItems((current) => {
            const existing = current.find((entry) => entry.id === item.id);
            return existing
              ? current.map((entry) =>
                  entry.id === item.id
                    ? {
                        ...entry,
                        quantity: Math.min(99, entry.quantity + Math.max(1, item.quantity)),
                      }
                    : entry
                )
              : [...current, { ...item, quantity: Math.max(1, item.quantity) }];
          });
        });
    },
    [token, sync]
  );

  const remove = useCallback(
    (id: string) => {
      removeFromCartRemote(id, token)
        .then((result) => sync(result.items))
        .catch(() => {
          setItems((current) => current.filter((entry) => entry.id !== id));
        });
    },
    [token, sync]
  );

  const setQuantity = useCallback(
    (id: string, quantity: number) => {
      updateCartItemRemote(id, quantity, token)
        .then((result) => sync(result.items))
        .catch(() => {
          setItems((current) => {
            if (quantity <= 0) {
              return current.filter((entry) => entry.id !== id);
            }
            return current.map((entry) =>
              entry.id === id ? { ...entry, quantity } : entry
            );
          });
        });
    },
    [token, sync]
  );

  const clear = useCallback(() => {
    clearCartRemote(token)
      .then((result) => sync(result.items))
      .catch(() => {
        setItems([]);
        window.localStorage.removeItem(CACHE_KEY);
      });
    clearPromo();
  }, [token, sync, clearPromo]);

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
      add,
      remove,
      setQuantity,
      clear,
      quantityOf: (id: string) =>
        items.find((entry) => entry.id === id)?.quantity ?? 0,
    };
  }, [items, ready, promo, applyPromo, clearPromo, add, remove, setQuantity, clear]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);

  if (!context) {
    throw new Error("useCart must be used inside a CartProvider");
  }

  return context;
}
