export type AccountUser = {
  id: string;
  name: string;
  email: string;
  phone: string;
  tier: string;
  memberSince: string;
};

export type AccountOrderStatus = "Delivered" | "Building" | "In transit";

export type AccountOrder = {
  id: string;
  date: string;
  title: string;
  detail: string;
  total: number;
  status: AccountOrderStatus;
  href: string;
};

export type SavedItem = {
  id: string;
  name: string;
  detail: string;
  price: number;
  href: string;
  kind: string;
};

export const demoUser: AccountUser = {
  id: "acct-20418",
  name: "Wayne Adebayo",
  email: "wayne@example.com",
  phone: "+234-907649842",
  tier: "Gold member",
  memberSince: "2021",
};

export const accountOrders: AccountOrder[] = [
  {
    id: "PC-20418",
    date: "12 Mar 2025",
    title: "Ryzen Titan — Custom Build",
    detail: "Ryzen 9 7900X3D · RX 7900 XT 20GB · 32GB DDR5 · 2TB NVMe",
    total: 2999,
    status: "Delivered",
    href: "/custom-builds",
  },
  {
    id: "LT-88310",
    date: "02 Feb 2025",
    title: "Apex 16",
    detail: "RTX 5080 Laptop · 32GB DDR5 · 2TB NVMe",
    total: 2499,
    status: "Delivered",
    href: "/laptops",
  },
  {
    id: "PR-55120",
    date: "19 Jan 2025",
    title: "Ryzen Strike",
    detail: "Ryzen 5 7600 · RX 7600 8GB · 16GB DDR5 · 1TB NVMe",
    total: 1449,
    status: "Building",
    href: "/prebuilds",
  },
  {
    id: "AC-40982",
    date: "05 Dec 2024",
    title: "Keyforge 75 HE",
    detail: "Hot-swap magnetic switches · 8K polling",
    total: 149,
    status: "In transit",
    href: "/accessories",
  },
];

export const savedItems: SavedItem[] = [
  {
    id: "canvas-16-pro",
    name: "Canvas 16 Pro",
    detail: "Creator laptop · RTX 4070 · 32GB DDR5",
    price: 2299,
    href: "/laptops#creator",
    kind: "Laptop",
  },
  {
    id: "nova-27-qhd",
    name: "Nova 27 QHD 240Hz",
    detail: "27-inch QHD IPS · 240Hz · HDR400",
    price: 449,
    href: "/accessories#monitors",
    kind: "Monitor",
  },
  {
    id: "volt-850-gold",
    name: "Volt 850W Gold",
    detail: "80+ Gold · ATX 3.1 · fully modular",
    price: 129,
    href: "/accessories#power-adaptors",
    kind: "Power",
  },
];

export const accountBenefits = [
  "Track every build, prebuild and order in one place",
  "Saved configurations for the machines you are planning",
  "Lifetime labour coverage and priority support",
];
