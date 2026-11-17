export type ConsoleCategoryId =
  | "gaming"
  | "creator"
  | "ultrawide"
  | "office"
  | "monitors"
  | "mice"
  | "keyboards"
  | "headsets"
  | "desk-mats"
  | "power-adaptors"
  | "other";

export type ConsoleBadge = "Best seller" | "New" | "Sale" | "Pro pick";

export type ConsoleCategory = {
  id: ConsoleCategoryId;
  label: string;
  navLabel: string;
  description: string;
  tagline: string;
  accent: string;
};

export type Console = {
  id: string;
  category: ConsoleCategoryId;
  name: string;
  tagline: string;
  description: string;
  images?: string[];
  price: number;
  originalPrice?: number;
  badge?: ConsoleBadge;
  stock: "in-stock" | "built-to-order";
  specs: { label: string; value: string }[];
  highlights: string[];
};

export const consoleCategories: ConsoleCategory[] = [
  {
    id: "gaming",
    label: "Gaming displays",
    navLabel: "Gaming",
    tagline: "Built for the win",
    description:
      "High-refresh panels with low response times for competitive play.",
    accent: "#5865F2",
  },
  {
    id: "creator",
    label: "Creator displays",
    navLabel: "Creator",
    tagline: "Colour you can trust",
    description:
      "Factory-calibrated panels with wide colour gamut for creative work.",
    accent: "#7C3AED",
  },
  {
    id: "ultrawide",
    label: "Ultrawide",
    navLabel: "Ultrawide",
    tagline: "More room to work",
    description:
      "Expansive aspect ratios for immersive play and multi-window workflows.",
    accent: "#0EA5E9",
  },
  {
    id: "office",
    label: "Everyday",
    navLabel: "Everyday",
    tagline: "Comfort for long days",
    description:
      "Sharp, comfortable displays for work, study and everyday use.",
    accent: "#16A34A",
  },
];

const IMG = {
  a: "/display_section.png",
  b: "/display_section2.png",
  c: "/catalogue_image.png",
  d: "/catalogue_image2.png",
  e: "/hero_image.png",
  f: "/terms_image.png",
};

export const consoles: Console[] = [
  {
    id: "nova-27-qhd",
    category: "gaming",
    name: "Nova 27 QHD 240Hz",
    tagline: "Competitive clarity",
    description:
      "A 27-inch QHD IPS panel with a 240Hz refresh rate and 1ms response for fast-paced play.",
    images: [IMG.a, IMG.b, IMG.c],
    price: 449,
    originalPrice: 549,
    badge: "Best seller",
    stock: "in-stock",
    specs: [
      { label: "Panel", value: "27-inch QHD IPS" },
      { label: "Refresh rate", value: "240Hz" },
      { label: "Response", value: "1ms GtG" },
      { label: "Sync", value: "G-Sync Compatible" },
    ],
    highlights: ["240Hz refresh rate", "QHD resolution", "1ms response", "Height-adjustable stand"],
  },
  {
    id: "apex-32-4k",
    category: "gaming",
    name: "Apex 32 4K 144Hz",
    tagline: "Big-screen speed",
    description:
      "A 32-inch 4K display that pairs crisp detail with a 144Hz refresh rate for a premium setup.",
    images: [IMG.b, IMG.c, IMG.d],
    price: 899,
    originalPrice: 1049,
    badge: "New",
    stock: "in-stock",
    specs: [
      { label: "Panel", value: "32-inch 4K IPS" },
      { label: "Refresh rate", value: "144Hz" },
      { label: "Response", value: "1ms GtG" },
      { label: "HDR", value: "HDR600" },
    ],
    highlights: ["4K resolution", "144Hz refresh rate", "HDR600", "RGB lighting"],
  },
  {
    id: "canvas-27-4k",
    category: "creator",
    name: "Canvas 27 4K Pro",
    tagline: "True-to-life colour",
    description:
      "Factory-calibrated with 99% sRGB coverage for editing, grading and design work.",
    images: [IMG.c, IMG.d, IMG.e],
    price: 749,
    badge: "Pro pick",
    stock: "in-stock",
    specs: [
      { label: "Panel", value: "27-inch 4K IPS" },
      { label: "Colour", value: "99% sRGB" },
      { label: "Bit depth", value: "10-bit" },
      { label: "Calibration", value: "Factory calibrated" },
    ],
    highlights: ["99% sRGB", "10-bit colour", "USB-C 90W", "Factory calibrated"],
  },
  {
    id: "studio-32-uhd",
    category: "creator",
    name: "Studio 32 UHD",
    tagline: "Room to create",
    description:
      "A large-format 4K canvas with wide gamut coverage and a USB-C hub for creative workflows.",
    images: [IMG.d, IMG.e, IMG.f],
    price: 1099,
    stock: "built-to-order",
    specs: [
      { label: "Panel", value: "32-inch 4K IPS" },
      { label: "Colour", value: "98% DCI-P3" },
      { label: "Bit depth", value: "10-bit" },
      { label: "Hub", value: "USB-C 96W" },
    ],
    highlights: ["98% DCI-P3", "USB-C hub", "10-bit colour", "Pivot stand"],
  },
  {
    id: "panorama-34",
    category: "ultrawide",
    name: "Panorama 34 Ultrawide",
    tagline: "See more, do more",
    description:
      "A 34-inch ultrawide display with a 3440x1440 panel for immersive play and wide timelines.",
    images: [IMG.e, IMG.f, IMG.a],
    price: 799,
    originalPrice: 949,
    badge: "Sale",
    stock: "in-stock",
    specs: [
      { label: "Panel", value: "34-inch UWQHD VA" },
      { label: "Refresh rate", value: "165Hz" },
      { label: "Aspect", value: "21:9" },
      { label: "Curve", value: "1500R" },
    ],
    highlights: ["21:9 aspect ratio", "165Hz refresh rate", "Curved panel", " Picture-by-picture"],
  },
  {
    id: "panorama-49",
    category: "ultrawide",
    name: "Panorama 49 Superwide",
    tagline: "The ultimate desk",
    description:
      "A 49-inch superwide display that replaces a dual-monitor setup with one seamless canvas.",
    images: [IMG.f, IMG.a, IMG.b],
    price: 1499,
    stock: "built-to-order",
    specs: [
      { label: "Panel", value: "49-inch DQHD VA" },
      { label: "Refresh rate", value: "120Hz" },
      { label: "Aspect", value: "32:9" },
      { label: "Curve", value: "1800R" },
    ],
    highlights: ["32:9 superwide", "Dual QHD", "120Hz refresh rate", " KVM switch"],
  },
  {
    id: "view-24",
    category: "office",
    name: "View 24 FHD",
    tagline: "Everyday essential",
    description:
      "A reliable 24-inch Full HD display with eye-care features for work and study.",
    images: [IMG.a, IMG.c, IMG.e],
    price: 199,
    stock: "in-stock",
    specs: [
      { label: "Panel", value: "24-inch Full HD IPS" },
      { label: "Refresh rate", value: "75Hz" },
      { label: "Eye care", value: "Flicker-free" },
      { label: "Mount", value: "VESA 75x75" },
    ],
    highlights: ["Full HD", "Flicker-free", "Low blue light", "VESA mountable"],
  },
  {
    id: "view-27-qhd",
    category: "office",
    name: "View 27 QHD",
    tagline: "Comfort at scale",
    description:
      "A 27-inch QHD display with a matte finish and adjustable stand for long working days.",
    images: [IMG.b, IMG.d, IMG.f],
    price: 329,
    stock: "in-stock",
    specs: [
      { label: "Panel", value: "27-inch QHD IPS" },
      { label: "Refresh rate", value: "75Hz" },
      { label: "Finish", value: "Anti-glare" },
      { label: "Stand", value: "Height adjustable" },
    ],
    highlights: ["QHD resolution", "Anti-glare", "Height adjustable", "VESA mountable"],
  },
];

export const featuredConsoleId = "nova-27-qhd";

export function formatConsolePrice(price: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(price);
}
