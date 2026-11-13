import type { Accessory, AccessoryCategory } from "@/data/accessories";
import type { Prebuild } from "@/data/prebuilds";
import type { Laptop, LaptopCategory } from "@/data/laptops";

export type CartKind = "laptop" | "accessory" | "prebuild";

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
  };
}

export function cartItemFromAccessory(
  accessory: Accessory,
  category: AccessoryCategory
): CartItem {
  return {
    id: `accessory-${accessory.id}`,
    kind: "accessory",
    productId: accessory.id,
    name: accessory.name,
    meta: accessory.specs[0] ?? accessory.description,
    category: category.label,
    price: accessory.price,
    quantity: 1,
    href: `/accessories#${accessory.category}`,
    accent: category.accent,
    artCategory: accessory.category,
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
  };
}

export const cartPromoCodes: Record<string, number> = {
  PCM10: 0.1,
  PCMART15: 0.15,
  WELCOME: 0.05,
};
