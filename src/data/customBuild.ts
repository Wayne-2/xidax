export type BuildPathId = "desktop" | "laptop";

export type BuildModelId =
  | "gaming-desktop"
  | "workstation"
  | "gaming-laptop"
  | "creator-laptop";

export type BuildModel = {
  id: BuildModelId;
  label: string;
  description: string;
  tags: string[];
};

export type BuildPath = {
  id: BuildPathId;
  label: string;
  models: BuildModel[];
};

export type BuildPart = {
  id: string;
  category: string;
  name: string;
  description: string;
  price: number;
  specs: string[];
};

export const buildPaths: BuildPath[] = [
  {
    id: "desktop",
    label: "Desktops",
    models: [
      {
        id: "gaming-desktop",
        label: "Gaming Desktop",
        description: "High-refresh gaming at 1440p and beyond.",
        tags: ["1440p gaming", "High refresh", "VR-ready"],
      },
      {
        id: "workstation",
        label: "Workstation",
        description: "Render, compile, and create without limits.",
        tags: ["3D rendering", "Video editing", "AI workloads"],
      },
    ],
  },
  {
    id: "laptop",
    label: "Laptops",
    models: [
      {
        id: "gaming-laptop",
        label: "Gaming Laptop",
        description: "Desktop-class performance on the move.",
        tags: ["Portable gaming", "High refresh", "LAN-ready"],
      },
      {
        id: "creator-laptop",
        label: "Creator Laptop",
        description: "A full studio that fits in your backpack.",
        tags: ["Photo editing", "Video production", "On-location work"],
      },
    ],
  },
];

const priceFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

export function formatPrice(value: number) {
  return priceFormatter.format(value);
}

export const partsByModel: Record<BuildModelId, BuildPart[]> = {
  "gaming-desktop": [
    {
      id: "gaming-desktop-cpu",
      category: "Processor",
      name: "AMD Ryzen 7 9800X3D",
      description: "The fastest gaming CPU with 3D V-Cache.",
      price: 479,
      specs: ["8 cores / 16 threads", "Up to 5.2GHz boost", "96MB L3 cache"],
    },
    {
      id: "gaming-desktop-gpu",
      category: "Graphics Card",
      name: "NVIDIA GeForce RTX 5070 Ti",
      description: "16GB of GDDR7 for high-frame-rate 1440p.",
      price: 749,
      specs: ["16GB GDDR7 memory", "DLSS 4 + ray tracing", "Triple-fan cooling"],
    },
    {
      id: "gaming-desktop-motherboard",
      category: "Motherboard",
      name: "ASUS ROG Strix X870E-E",
      description: "AM5 platform with PCIe 5.0 and Wi-Fi 7.",
      price: 399,
      specs: ["AM5 socket", "DDR5 / PCIe 5.0", "Wi-Fi 7 + 2.5G LAN"],
    },
    {
      id: "gaming-desktop-memory",
      category: "Memory",
      name: "32GB DDR5-6000",
      description: "Dual-channel kit tuned for Ryzen.",
      price: 129,
      specs: ["2 x 16GB modules", "CL30 timings", "Addressable RGB"],
    },
    {
      id: "gaming-desktop-storage",
      category: "Storage",
      name: "2TB NVMe Gen4 SSD",
      description: "Fast storage for games, apps, and projects.",
      price: 149,
      specs: ["7,400MB/s read", "6,900MB/s write", "5-year warranty"],
    },
    {
      id: "gaming-desktop-psu",
      category: "Power Supply",
      name: "850W 80+ Gold",
      description: "Fully modular ATX 3.1 power.",
      price: 129,
      specs: ["80+ Gold efficiency", "ATX 3.1 ready", "Fully modular cables"],
    },
    {
      id: "gaming-desktop-case",
      category: "Case",
      name: "NZXT H7 Flow RGB",
      description: "High-airflow mid-tower with tempered glass.",
      price: 139,
      specs: ["Mesh front panel", "3 x RGB fans included", "Tempered glass side"],
    },
    {
      id: "gaming-desktop-cooling",
      category: "Cooling",
      name: "360mm AIO Liquid Cooler",
      description: "Quiet, high-capacity liquid cooling.",
      price: 179,
      specs: ["360mm radiator", "Low-noise pump", "ARGB fans"],
    },
  ],
  workstation: [
    {
      id: "workstation-cpu",
      category: "Processor",
      name: "AMD Ryzen 9 9950X",
      description: "16 cores for heavy multi-threaded work.",
      price: 649,
      specs: ["16 cores / 32 threads", "Up to 5.7GHz boost", "64MB L3 cache"],
    },
    {
      id: "workstation-gpu",
      category: "Graphics Card",
      name: "NVIDIA RTX 5080",
      description: "Studio-grade graphics and AI acceleration.",
      price: 999,
      specs: ["16GB GDDR7 memory", "DLSS 4 + ray tracing", "Quad-display support"],
    },
    {
      id: "workstation-motherboard",
      category: "Motherboard",
      name: "ASUS ProArt X870E-Creator",
      description: "Creator-focused AM5 board with dual LAN.",
      price: 499,
      specs: ["AM5 socket", "DDR5 / PCIe 5.0", "Dual LAN + Wi-Fi 7"],
    },
    {
      id: "workstation-memory",
      category: "Memory",
      name: "64GB DDR5-5600",
      description: "Large ECC-ready kit for demanding workloads.",
      price: 249,
      specs: ["2 x 32GB modules", "ECC-ready", "Low-profile heatspreaders"],
    },
    {
      id: "workstation-storage",
      category: "Storage",
      name: "4TB NVMe Gen4 SSD",
      description: "High-capacity scratch and project storage.",
      price: 299,
      specs: ["7,000MB/s read", "6,800MB/s write", "5-year warranty"],
    },
    {
      id: "workstation-psu",
      category: "Power Supply",
      name: "1000W 80+ Platinum",
      description: "Quiet, efficient power for sustained loads.",
      price: 229,
      specs: ["80+ Platinum efficiency", "ATX 3.1 ready", "Fully modular cables"],
    },
    {
      id: "workstation-case",
      category: "Case",
      name: "Fractal Design North XL",
      description: "Full-tower airflow with sound dampening.",
      price: 179,
      specs: ["Full-tower layout", "Sound-dampened panels", "USB-C front I/O"],
    },
    {
      id: "workstation-cooling",
      category: "Cooling",
      name: "420mm AIO Liquid Cooler",
      description: "High-capacity cooling for all-core loads.",
      price: 219,
      specs: ["420mm radiator", "Low-noise pump", "Premium fans"],
    },
  ],
  "gaming-laptop": [
    {
      id: "gaming-laptop-cpu",
      category: "Processor",
      name: "Intel Core Ultra 9 285HX",
      description: "24 cores built for laptop gaming and creation.",
      price: 549,
      specs: ["24 cores / 24 threads", "Up to 5.5GHz boost", "Built-in NPU"],
    },
    {
      id: "gaming-laptop-gpu",
      category: "Graphics",
      name: "NVIDIA RTX 5080 Laptop",
      description: "16GB GDDR7 with a 175W power budget.",
      price: 1099,
      specs: ["16GB GDDR7 memory", "175W max graphics power", "DLSS 4 + ray tracing"],
    },
    {
      id: "gaming-laptop-memory",
      category: "Memory",
      name: "32GB DDR5-6400",
      description: "Fast dual-channel laptop memory.",
      price: 149,
      specs: ["2 x 16GB modules", "6400MT/s", "Dual-channel"],
    },
    {
      id: "gaming-laptop-storage",
      category: "Storage",
      name: "2TB NVMe Gen4 SSD",
      description: "Room for a large game library.",
      price: 179,
      specs: ["7,000MB/s read", "6,500MB/s write", "5-year warranty"],
    },
    {
      id: "gaming-laptop-display",
      category: "Display",
      name: '16" QHD+ 240Hz',
      description: "Mini-LED panel with vivid color.",
      price: 349,
      specs: ["2560 x 1600 resolution", "240Hz refresh rate", "100% DCI-P3"],
    },
    {
      id: "gaming-laptop-battery",
      category: "Battery",
      name: "99Wh 4-cell",
      description: "All-day capacity with fast charging.",
      price: 129,
      specs: ["99Wh capacity", "Fast charge support", "Up to 8 hours"],
    },
  ],
  "creator-laptop": [
    {
      id: "creator-laptop-cpu",
      category: "Processor",
      name: "AMD Ryzen AI 9 HX 370",
      description: "12 cores with a dedicated AI engine.",
      price: 499,
      specs: ["12 cores / 24 threads", "Up to 5.1GHz boost", "50 TOPS NPU"],
    },
    {
      id: "creator-laptop-gpu",
      category: "Graphics",
      name: "NVIDIA RTX 5070 Laptop",
      description: "8GB GDDR7 for creative apps.",
      price: 799,
      specs: ["8GB GDDR7 memory", "115W max graphics power", "DLSS 4 + ray tracing"],
    },
    {
      id: "creator-laptop-memory",
      category: "Memory",
      name: "64GB LPDDR5X-7500",
      description: "High-bandwidth memory for large projects.",
      price: 299,
      specs: ["64GB capacity", "7500MT/s", "Soldered dual-channel"],
    },
    {
      id: "creator-laptop-storage",
      category: "Storage",
      name: "4TB NVMe Gen4 SSD",
      description: "Fast, spacious project storage.",
      price: 349,
      specs: ["7,000MB/s read", "6,500MB/s write", "5-year warranty"],
    },
    {
      id: "creator-laptop-display",
      category: "Display",
      name: '16" 4K OLED',
      description: "Color-accurate OLED for creative work.",
      price: 499,
      specs: ["3840 x 2400 resolution", "120Hz refresh rate", "100% DCI-P3"],
    },
    {
      id: "creator-laptop-battery",
      category: "Battery",
      name: "99Wh 6-cell",
      description: "Long runtime for location work.",
      price: 149,
      specs: ["99Wh capacity", "Fast charge support", "Up to 10 hours"],
    },
  ],
};
