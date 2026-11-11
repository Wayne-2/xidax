export type AccessoryCategoryId =
  | "monitors"
  | "mice"
  | "keyboards"
  | "headsets"
  | "desk-mats"
  | "power-adaptors"
  | "other";

export type AccessoryBadge = "Best seller" | "New" | "Sale" | "Pro pick";

export type AccessoryCategory = {
  id: AccessoryCategoryId;
  label: string;
  navLabel: string;
  description: string;
  accent: string;
};

export type Accessory = {
  id: string;
  category: AccessoryCategoryId;
  name: string;
  description: string;
  price: number;
  specs: string[];
  badge?: AccessoryBadge;
};

export const accessoryCategories: AccessoryCategory[] = [
  {
    id: "monitors",
    label: "Monitors",
    navLabel: "Monitors",
    description:
      "High-refresh displays tuned for competitive play and immersive worlds.",
    accent: "#5865F2",
  },
  {
    id: "mice",
    label: "Mice",
    navLabel: "Mice",
    description:
      "Precision sensors, lightweight shells, and shapes for every grip.",
    accent: "#0EA5E9",
  },
  {
    id: "keyboards",
    label: "Keyboards",
    navLabel: "Keyboards",
    description:
      "Mechanical feel and fast actuation, from compact to full-size.",
    accent: "#8B5CF6",
  },
  {
    id: "headsets",
    label: "Headsets",
    navLabel: "Headsets",
    description: "Immersive audio and clear comms for long sessions.",
    accent: "#F59E0B",
  },
  {
    id: "desk-mats",
    label: "Desk Mats",
    navLabel: "Desk Mats",
    description:
      "A clean, consistent surface that ties the whole setup together.",
    accent: "#10B981",
  },
  {
    id: "power-adaptors",
    label: "Power Adaptors",
    navLabel: "Power",
    description:
      "Clean, reliable power for your build and your peripherals.",
    accent: "#EF4444",
  },
  {
    id: "other",
    label: "Other Accessories",
    navLabel: "Other",
    description: "The finishing touches that make a setup feel complete.",
    accent: "#EC4899",
  },
];

export const accessories: Accessory[] = [
  {
    id: "nova-27-qhd",
    category: "monitors",
    name: "Nova 27 QHD 240Hz",
    description:
      "A fast IPS panel with crisp 1440p detail and buttery-smooth motion.",
    price: 449,
    badge: "Best seller",
    specs: ["27-inch QHD IPS", "240Hz / 1ms response", "HDR400 + FreeSync Premium"],
  },
  {
    id: "nova-34-ultrawide",
    category: "monitors",
    name: "Nova 34 Ultrawide 165Hz",
    description:
      "Wrap-around immersion for racing, sims, and wide-screen productivity.",
    price: 699,
    badge: "Pro pick",
    specs: ["34-inch curved UWQHD", "165Hz / 1ms response", "USB-C with 90W charging"],
  },
  {
    id: "pulse-24-fhd",
    category: "monitors",
    name: "Pulse 24 FHD 180Hz",
    description:
      "A compact competitive display built for high frame rates and low latency.",
    price: 229,
    specs: ["24-inch FHD fast IPS", "180Hz / 0.5ms response", "Height-adjustable stand"],
  },
  {
    id: "apex-32-4k",
    category: "monitors",
    name: "Apex 32 4K 144Hz",
    description:
      "Sharp 4K visuals and high-refresh speed for work and play.",
    price: 799,
    specs: ["32-inch 4K IPS", "144Hz / 1ms response", "DisplayHDR 600 + USB hub"],
  },
  {
    id: "vortex-pro-wireless",
    category: "mice",
    name: "Vortex Pro Wireless",
    description:
      "A 58g symmetrical flagship with a top-tier sensor and long battery life.",
    price: 89,
    badge: "Best seller",
    specs: ["26,000 DPI optical sensor", "58g ultralight shell", "90-hour wireless battery"],
  },
  {
    id: "vortex-lite-wired",
    category: "mice",
    name: "Vortex Lite Wired",
    description:
      "Lightweight wired precision with a flexible cable and smooth feet.",
    price: 39,
    specs: ["18,000 DPI optical sensor", "61g ultralight shell", "Paracord cable + PTFE feet"],
  },
  {
    id: "glide-mmo",
    category: "mice",
    name: "Glide MMO 12-Button",
    description:
      "A thumb-button grid built for MMOs, macros, and complex rotations.",
    price: 79,
    specs: ["12 programmable side buttons", "26,000 DPI optical sensor", "RGB thumb grid"],
  },
  {
    id: "glide-mini-wireless",
    category: "mice",
    name: "Glide Mini Wireless",
    description:
      "A compact symmetrical shape for claw and fingertip grips.",
    price: 59,
    specs: ["Compact symmetrical shape", "22,000 DPI optical sensor", "70-hour wireless battery"],
  },
  {
    id: "keyforge-75-he",
    category: "keyboards",
    name: "Keyforge 75 HE",
    description:
      "Magnetic switches with rapid trigger for split-second inputs.",
    price: 149,
    badge: "New",
    specs: ["Hot-swap magnetic switches", "Rapid trigger + 8K polling", "Aluminum top plate"],
  },
  {
    id: "keyforge-tkl-rgb",
    category: "keyboards",
    name: "Keyforge TKL RGB",
    description:
      "A tenkeyless mechanical board with a crisp, satisfying feel.",
    price: 109,
    specs: ["Hot-swap mechanical switches", "Per-key RGB lighting", "Double-shot PBT keycaps"],
  },
  {
    id: "keyforge-60-wireless",
    category: "keyboards",
    name: "Keyforge 60 Wireless",
    description:
      "A compact tri-mode board that keeps more room for the mouse.",
    price: 99,
    specs: ["60% compact layout", "Bluetooth / 2.4G / USB-C", "100-hour battery life"],
  },
  {
    id: "keyforge-fullsize-pro",
    category: "keyboards",
    name: "Keyforge Fullsize Pro",
    description:
      "A full-size workhorse with a media dial and magnetic wrist rest.",
    price: 129,
    specs: ["Full-size 104-key layout", "Aluminum media dial", "Magnetic wrist rest"],
  },
  {
    id: "echo-x7-wireless",
    category: "headsets",
    name: "Echo X7 Wireless",
    description:
      "Dual-wireless audio with deep bass and a clear boom microphone.",
    price: 159,
    badge: "Best seller",
    specs: ["50mm neodymium drivers", "2.4G + Bluetooth", "60-hour battery life"],
  },
  {
    id: "echo-x5-wired",
    category: "headsets",
    name: "Echo X5 Wired",
    description:
      "A dependable wired headset with virtual surround and plush cushions.",
    price: 89,
    specs: ["Virtual 7.1 surround", "Detachable boom mic", "Memory foam ear cups"],
  },
  {
    id: "echo-studio-usb",
    category: "headsets",
    name: "Echo Studio USB",
    description:
      "Studio-tuned sound and a broadcast-grade mic in a plug-and-play package.",
    price: 119,
    specs: ["Broadcast-grade microphone", "40mm studio drivers", "USB-C plug and play"],
  },
  {
    id: "echo-air-open",
    category: "headsets",
    name: "Echo Air Open",
    description:
      "An open-back headset with a wide soundstage and featherweight comfort.",
    price: 129,
    specs: ["Open-back soundstage", "240g lightweight frame", "40-hour wireless battery"],
  },
  {
    id: "terrain-xxl",
    category: "desk-mats",
    name: "Terrain XXL Desk Mat",
    description:
      "A full-desk surface with stitched edges and a spill-resistant top.",
    price: 39,
    badge: "Best seller",
    specs: ["900 x 400mm surface", "Anti-fray stitched edges", "Spill-resistant coating"],
  },
  {
    id: "terrain-compact",
    category: "desk-mats",
    name: "Terrain Compact Mat",
    description:
      "A low-profile mat sized for tighter desks and compact setups.",
    price: 29,
    specs: ["700 x 300mm surface", "Non-slip rubber base", "Low-profile stitched edge"],
  },
  {
    id: "terrain-rgb",
    category: "desk-mats",
    name: "Terrain RGB Mat",
    description:
      "A soft gaming surface with a customizable RGB edge.",
    price: 59,
    badge: "New",
    specs: ["14 lighting zones", "800 x 300mm surface", "USB-powered controller"],
  },
  {
    id: "volt-850-gold",
    category: "power-adaptors",
    name: "Volt 850W Gold",
    description:
      "Fully modular ATX 3.1 power with headroom for modern GPUs.",
    price: 129,
    badge: "Pro pick",
    specs: ["850W 80+ Gold", "ATX 3.1 / PCIe 5.1", "Fully modular cables"],
  },
  {
    id: "volt-1000-platinum",
    category: "power-adaptors",
    name: "Volt 1000W Platinum",
    description:
      "High-efficiency power for flagship builds and heavy workloads.",
    price: 199,
    specs: ["1000W 80+ Platinum", "ATX 3.1 ready", "135mm fluid bearing fan"],
  },
  {
    id: "surge-8-outlet",
    category: "power-adaptors",
    name: "Surge 8-Outlet Protector",
    description:
      "Protect your entire setup with surge protection and fast USB charging.",
    price: 49,
    specs: ["8 surge-protected outlets", "2 x USB-C + 2 x USB-A", "1,800J surge rating"],
  },
  {
    id: "volt-sfx-750",
    category: "power-adaptors",
    name: "Volt SFX 750W",
    description:
      "Compact SFX power for small-form-factor builds with big GPUs.",
    price: 149,
    specs: ["750W SFX 80+ Gold", "ATX 3.1 ready", "SFX-to-ATX bracket included"],
  },
  {
    id: "pcmart-controller-pro",
    category: "other",
    name: "Pcmart Controller Pro",
    description:
      "Hall-effect sticks and back paddles for precise, drift-free control.",
    price: 69,
    badge: "New",
    specs: ["Hall-effect thumbsticks", "4 remappable back paddles", "Tri-mode connection"],
  },
  {
    id: "streamcam-4k",
    category: "other",
    name: "StreamCam 4K",
    description:
      "A sharp 4K webcam with auto-framing and dual noise-cancelling mics.",
    price: 129,
    specs: ["4K30 / 1080p60 video", "Auto-framing + HDR", "Dual noise-cancelling mics"],
  },
  {
    id: "hub-7-in-1",
    category: "other",
    name: "Hub 7-in-1 USB-C",
    description:
      "Expand your setup with display, storage, and charging in one hub.",
    price: 59,
    specs: ["HDMI 4K60 output", "100W USB-C pass-through", "SD / microSD + 3 x USB-A"],
  },
  {
    id: "cable-kit-pro",
    category: "other",
    name: "Cable Kit Pro",
    description:
      "Braided cables and tidy clips for a clean, finished desk.",
    price: 29,
    specs: ["6 braided cables", "Reusable velcro ties", "Cable management clips"],
  },
];

const priceFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

export function formatAccessoryPrice(price: number) {
  return priceFormatter.format(price);
}
