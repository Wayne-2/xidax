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

const CART_KEY = "pcmart.cart";

type CartContextValue = {
  items: CartItem[];
  count: number;
  subtotal: number;
  ready: boolean;
  add: (item: CartItem) => void;
  remove: (id: string) => void;
  setQuantity: (id: string, quantity: number) => void;
  clear: () => void;
  quantityOf: (id: string) => number;
};

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
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
      }

      setReady(true);
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  const persist = useCallback((next: CartItem[]) => {
    setItems(next);
    window.localStorage.setItem(CART_KEY, JSON.stringify(next));
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
      ready,
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
      clear: () => persist([]),
      quantityOf: (id: string) =>
        items.find((entry) => entry.id === id)?.quantity ?? 0,
    };
  }, [items, ready, persist]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);

  if (!context) {
    throw new Error("useCart must be used inside a CartProvider");
  }

  return context;
}
