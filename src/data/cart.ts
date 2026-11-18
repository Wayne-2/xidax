import type { Console, ConsoleCategory } from "@/data/consoles";
import type { Prebuild } from "@/data/prebuilds";
import type { Laptop, LaptopCategory } from "@/data/laptops";

export type CartKind = "laptop" | "console" | "prebuild";

export type CartItem = {
  id: string;
  kind: CartKind;
  productId: string;
  name: string;
  meta: string;
  category: string;
  price: number;
  quantity: number;
  href: string;
  accent: string;
  artCategory: string;
  image?: string;
  promoCode?: string | null;
  promoDiscount?: number;
  promoEnabled?: boolean;
};

export const freeShippingThreshold = 99;
export const flatShippingRate = 19;

export function cartItemFromLaptop(
  laptop: Laptop,
  category: LaptopCategory
): CartItem {
  return {
    id: `laptop-${laptop.id}`,
    kind: "laptop",
    productId: laptop.id,
    name: laptop.name,
    meta: `${laptop.tagline} · ${laptop.specs[0]?.value ?? ""}`,
    category: category.label,
    price: laptop.price,
    quantity: 1,
    href: `/laptops#${laptop.category}`,
    accent: category.accent,
    artCategory: laptop.category,
    image: laptop.image,
    promoCode: laptop.promoCode ?? null,
    promoDiscount: laptop.promoDiscount ?? 0,
    promoEnabled: laptop.promoEnabled === true,
  };
}

export function cartItemFromConsole(
  console: Console,
  category: ConsoleCategory
): CartItem {
  return {
    id: `console-${console.id}`,
    kind: "console",
    productId: console.id,
    name: console.name,
    meta: console.specs[0]?.value ?? console.description,
    category: category.label,
    price: console.price,
    quantity: 1,
    href: `/consoles#${console.category}`,
    accent: category.accent,
    artCategory: console.category,
    image: console.images?.[0],
    promoCode: console.promoCode ?? null,
    promoDiscount: console.promoDiscount ?? 0,
    promoEnabled: console.promoEnabled === true,
  };
}

export function cartItemFromPrebuild(prebuild: Prebuild): CartItem {
  return {
    id: `prebuild-${prebuild.id}`,
    kind: "prebuild",
    productId: prebuild.id,
    name: prebuild.name,
    meta: prebuild.specs,
    category: prebuild.brand === "intel" ? "Intel prebuilt" : "AMD prebuilt",
    price: prebuild.price,
    quantity: 1,
    href: "/prebuilds",
    accent: prebuild.brand === "intel" ? "#0068B5" : "#C8102E",
    artCategory: prebuild.brand,
    image: prebuild.image,
    promoCode: prebuild.promoCode ?? null,
    promoDiscount: prebuild.promoDiscount ?? 0,
    promoEnabled: prebuild.promoEnabled === true,
  };
}

export const cartPromoCodes: Record<string, number> = {
  PCM10: 0.1,
  PCMART15: 0.15,
  GENERICPCS15: 0.15,
  WELCOME: 0.05,
};
