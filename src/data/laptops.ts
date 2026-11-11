export type LaptopCategoryId = "gaming" | "creator" | "business";

export type LaptopCategory = {
  id: LaptopCategoryId;
  label: string;
  navLabel: string;
  tagline: string;
  description: string;
  accent: string;
};

export type LaptopSpec = {
  label: string;
  value: string;
};

export type Laptop = {
  id: string;
  category: LaptopCategoryId;
  name: string;
  tagline: string;
  description: string;
  price: number;
  badge?: string;
  stock: "in-stock" | "built-in-order";
  specs: LaptopSpec[];
  highlights: string[];
};

export const laptopCategories: LaptopCategory[] = [
  {
    id: "gaming",
    label: "Gaming Laptops",
    navLabel: "Gaming",
    tagline: "Desktop-class frames, laptop-form freedom.",
    description:
      "High-refresh panels, discrete graphics, and cooling that keeps up with long sessions.",
    accent: "#5865F2",
  },
  {
    id: "creator",
    label: "Creator Laptops",
    navLabel: "Creator",
    tagline: "Colour-accurate panels that ship with the work.",
    description:
      "Wide-gamut displays, fast silicon, and battery life for editing on the move.",
    accent: "#EC4899",
  },
  {
    id: "business",
    label: "Business & Everyday",
    navLabel: "Business",
    tagline: "Quiet, light, and ready for a full day.",
    description:
      "Secure, efficient laptops built for offices, campuses, and everything between.",
    accent: "#10B981",
  },
];

export const laptops: Laptop[] = [
  {
    id: "apex-16",
    category: "gaming",
    name: "Apex 16",
    tagline: "The flagship. Everything at max.",
    description:
      "Our most powerful laptop: a full desktop GPU, a 240Hz panel, and a vapour chamber that stays quiet under load.",
    price: 2499,
    badge: "Flagship",
    stock: "in-stock",
    specs: [
      { label: "Processor", value: "Intel Core Ultra 9 285HX" },
      { label: "Graphics", value: "NVIDIA RTX 5080 Laptop 16GB" },
      { label: "Display", value: '16" QHD+ 240Hz' },
      { label: "Memory", value: "32GB DDR5-5600" },
      { label: "Storage", value: "2TB NVMe Gen4" },
      { label: "Battery", value: "90Wh — up to 8 hours" },
      { label: "Weight", value: "2.6 kg" },
      { label: "Ports", value: "2x USB-C, 2x USB-A, HDMI 2.1" },
    ],
    highlights: [
      "240Hz QHD+ display with G-Sync",
      "Vapour chamber cooling, dual fans",
      "Per-key RGB with 4-zone macros",
      "1TB upgrade slot built in",
    ],
  },
  {
    id: "vortex-15",
    category: "gaming",
    name: "Vortex 15",
    tagline: "The performance sweet spot.",
    description:
      "RTX 5070 Ti performance in a 2.1kg chassis, tuned for high-refresh esports and cinematic single-player.",
    price: 1799,
    badge: "Best seller",
    stock: "in-stock",
    specs: [
      { label: "Processor", value: "AMD Ryzen 9 8945HS" },
      { label: "Graphics", value: "NVIDIA RTX 5070 Ti Laptop 12GB" },
      { label: "Display", value: '15.6" FHD 165Hz' },
      { label: "Memory", value: "16GB DDR5-5600" },
      { label: "Storage", value: "1TB NVMe Gen4" },
      { label: "Battery", value: "80Wh — up to 9 hours" },
      { label: "Weight", value: "2.1 kg" },
      { label: "Ports", value: "2x USB-C, 2x USB-A, RJ45" },
    ],
    highlights: [
      "165Hz fast-IPS panel",
      "Dual fans, 0.7mm keyboard",
      "Windows Hello + full HD webcam",
      "Wi-Fi 7 with 2.5GbE",
    ],
  },
  {
    id: "falcon-14",
    category: "gaming",
    name: "Falcon 14",
    tagline: "Real gaming in a 1.7kg frame.",
    description:
      "A compact RTX 4060 laptop for travel, dorm rooms, and LAN nights where portability still matters.",
    price: 1299,
    stock: "in-stock",
    specs: [
      { label: "Processor", value: "AMD Ryzen 7 8845HS" },
      { label: "Graphics", value: "NVIDIA RTX 4060 Laptop 8GB" },
      { label: "Display", value: '14" QHD 165Hz' },
      { label: "Memory", value: "16GB DDR5-5600" },
      { label: "Storage", value: "1TB NVMe Gen4" },
      { label: "Battery", value: "70Wh — up to 10 hours" },
      { label: "Weight", value: "1.7 kg" },
      { label: "Ports", value: "2x USB-C, 2x USB-A, HDMI 2.1" },
    ],
    highlights: [
      "14-inch QHD at 165Hz",
      "Milled aluminium chassis",
      "Quiet mode under 40 dB",
      "Fingerprint reader with IR camera",
    ],
  },
  {
    id: "saber-17",
    category: "gaming",
    name: "Saber 17",
    tagline: "Big screen, big frame.",
    description:
      "A 17-inch display monster for simulation, strategy and streaming, with desktop-class cooling headroom.",
    price: 2199,
    badge: "New",
    stock: "built-in-order",
    specs: [
      { label: "Processor", value: "Intel Core i9-14900HX" },
      { label: "Graphics", value: "NVIDIA RTX 4080 Laptop 12GB" },
      { label: "Display", value: '17.3" FHD 240Hz' },
      { label: "Memory", value: "32GB DDR5-5600" },
      { label: "Storage", value: "1TB NVMe Gen4" },
      { label: "Battery", value: "90Wh — up to 6 hours" },
      { label: "Weight", value: "2.8 kg" },
      { label: "Ports", value: "2x USB-C, 3x USB-A, HDMI 2.1" },
    ],
    highlights: [
      "240Hz 17.3-inch display",
      "Mechanical-feel full-size keyboard",
      "Numerpad and RGB deck lighting",
      "Built-to-order in 5–7 days",
    ],
  },
  {
    id: "canvas-16-pro",
    category: "creator",
    name: "Canvas 16 Pro",
    tagline: "A studio that fits in a backpack.",
    description:
      "A 3K mini-LED panel at 100% DCI-P3 with the silicon to grade, edit, and render without a desk.",
    price: 2299,
    badge: "Pro pick",
    stock: "in-stock",
    specs: [
      { label: "Processor", value: "Intel Core Ultra 9 185H" },
      { label: "Graphics", value: "NVIDIA RTX 4070 Laptop 8GB" },
      { label: "Display", value: '16" 3K 120Hz mini-LED' },
      { label: "Colour", value: "100% DCI-P3, ΔE < 1" },
      { label: "Memory", value: "32GB DDR5-5600" },
      { label: "Storage", value: "2TB NVMe Gen4" },
      { label: "Battery", value: "90Wh — up to 10 hours" },
      { label: "Weight", value: "2.0 kg" },
    ],
    highlights: [
      "Factory-calibrated mini-LED panel",
      "SD card reader and full-size SDIO",
      "Slim aluminium chassis, 2.0 kg",
      "Calibration report included",
    ],
  },
  {
    id: "canvas-14",
    category: "creator",
    name: "Canvas 14",
    tagline: "Light, accurate, ready anywhere.",
    description:
      "A 2.8K OLED creator laptop for photo and motion work, with a colour-accurate panel in every unit.",
    price: 1599,
    stock: "in-stock",
    specs: [
      { label: "Processor", value: "Intel Core Ultra 7 155H" },
      { label: "Graphics", value: "NVIDIA RTX 4050 Laptop 6GB" },
      { label: "Display", value: '14" 2.8K 120Hz OLED' },
      { label: "Colour", value: "100% sRGB, ΔE < 1.5" },
      { label: "Memory", value: "16GB DDR5-5600" },
      { label: "Storage", value: "1TB NVMe Gen4" },
      { label: "Battery", value: "75Wh — up to 12 hours" },
      { label: "Weight", value: "1.6 kg" },
    ],
    highlights: [
      "2.8K OLED at 120Hz",
      "Hardware colour calibration switch",
      "Built-in pen support on the 14-inch panel",
      "1.6 kg all-metal chassis",
    ],
  },
  {
    id: "studio-air-15",
    category: "creator",
    name: "Studio Air 15",
    tagline: "Render on the move.",
    description:
      "Balanced performance and battery for motion designers who render, preview, and deliver from anywhere.",
    price: 1349,
    stock: "in-stock",
    specs: [
      { label: "Processor", value: "AMD Ryzen 7 8845HS" },
      { label: "Graphics", value: "NVIDIA RTX 4060 Laptop 8GB" },
      { label: "Display", value: '15.6" 3K 120Hz' },
      { label: "Colour", value: "99% sRGB, ΔE < 2" },
      { label: "Memory", value: "32GB DDR5-5600" },
      { label: "Storage", value: "1TB NVMe Gen4" },
      { label: "Battery", value: "80Wh — up to 11 hours" },
      { label: "Weight", value: "1.8 kg" },
    ],
    highlights: [
      "3K display with 120Hz refresh",
      "32GB memory for 4K timelines",
      "Silent under 30 dB in office mode",
      "Full-size SD card reader",
    ],
  },
  {
    id: "frame-13",
    category: "creator",
    name: "Frame 13",
    tagline: "Your everyday creative machine.",
    description:
      "A 1.2kg OLED ultrabook for writing, design, and light editing with all-day battery.",
    price: 999,
    stock: "in-stock",
    specs: [
      { label: "Processor", value: "Intel Core Ultra 5 125H" },
      { label: "Graphics", value: "Integrated Arc Graphics" },
      { label: "Display", value: '13.6" 2.8K 120Hz OLED' },
      { label: "Colour", value: "99% sRGB, ΔE < 2" },
      { label: "Memory", value: "16GB LPDDR5X" },
      { label: "Storage", value: "512GB NVMe Gen4" },
      { label: "Battery", value: "52Wh — up to 15 hours" },
      { label: "Weight", value: "1.2 kg" },
    ],
    highlights: [
      "1.2 kg magnesium chassis",
      "15-hour rated battery",
      "Fanless under light workloads",
      "3x USB-C with display output",
    ],
  },
  {
    id: "atlas-14",
    category: "business",
    name: "Atlas 14",
    tagline: "The office standard.",
    description:
      "Dependable, secure, and comfortable for full days of meetings, documents, and spreadsheets.",
    price: 899,
    badge: "Best seller",
    stock: "in-stock",
    specs: [
      { label: "Processor", value: "Intel Core i5-1235U" },
      { label: "Graphics", value: "Intel Iris Xe" },
      { label: "Display", value: '14" FHD IPS 300 nits' },
      { label: "Memory", value: "16GB DDR4-3200" },
      { label: "Storage", value: "512GB NVMe Gen3" },
      { label: "Battery", value: "54Wh — up to 12 hours" },
      { label: "Weight", value: "1.4 kg" },
      { label: "Security", value: "Fingerprint + IR camera" },
    ],
    highlights: [
      "MIL-STD tested chassis",
      "TPM 2.0 and Windows Hello",
      "Numeric-free, spill-resistant keyboard",
      "3-year warranty included",
    ],
  },
  {
    id: "atlas-16",
    category: "business",
    name: "Atlas 16",
    tagline: "More screen, more work.",
    description:
      "A 16-inch business machine with discrete graphics for occasional 3D, CAD, and data work.",
    price: 1199,
    stock: "in-stock",
    specs: [
      { label: "Processor", value: "Intel Core i7-1365U" },
      { label: "Graphics", value: "NVIDIA RTX 2050 Laptop 4GB" },
      { label: "Display", value: '16" FHD IPS 300 nits' },
      { label: "Memory", value: "16GB DDR4-3200" },
      { label: "Storage", value: "1TB NVMe Gen4" },
      { label: "Battery", value: "70Wh — up to 11 hours" },
      { label: "Weight", value: "1.9 kg" },
      { label: "Security", value: "Fingerprint + IR camera" },
    ],
    highlights: [
      "16-inch 16:10 work display",
      "Serviceable RAM and SSD slots",
      "RJ45 and HDMI for the office",
      "3-year warranty included",
    ],
  },
  {
    id: "nomad-13",
    category: "business",
    name: "Nomad 13",
    tagline: "A kilogram of battery life.",
    description:
      "An ARM-powered ultralight that wakes instantly and lasts all day without a charger.",
    price: 749,
    badge: "New",
    stock: "built-in-order",
    specs: [
      { label: "Processor", value: "Snapdragon X Elite" },
      { label: "Graphics", value: "Qualcomm Adreno" },
      { label: "Display", value: '13.3" FHD IPS 400 nits' },
      { label: "Memory", value: "16GB LPDDR5X" },
      { label: "Storage", value: "512GB NVMe Gen4" },
      { label: "Battery", value: "50Wh — up to 18 hours" },
      { label: "Weight", value: "0.98 kg" },
      { label: "Connectivity", value: "Wi-Fi 7 + 5G option" },
    ],
    highlights: [
      "Instant-on, fanless design",
      "18-hour rated battery",
      "5G modem option for field work",
      "0.98 kg — under a kilogram",
    ],
  },
  {
    id: "executive-15",
    category: "business",
    name: "Executive 15",
    tagline: "Built for the boardroom.",
    description:
      "Premium materials, a 2.8K display, and the security features a corporate fleet needs.",
    price: 1599,
    stock: "in-stock",
    specs: [
      { label: "Processor", value: "Intel Core Ultra 7 155H" },
      { label: "Graphics", value: "NVIDIA RTX 4050 Laptop 6GB" },
      { label: "Display", value: '15.6" 2.8K 120Hz' },
      { label: "Memory", value: "32GB DDR5-5600" },
      { label: "Storage", value: "1TB NVMe Gen4" },
      { label: "Battery", value: "80Wh — up to 12 hours" },
      { label: "Weight", value: "1.9 kg" },
      { label: "Security", value: "IR camera + smart card" },
    ],
    highlights: [
      "2.8K high-density display",
      "Smart-card and TPM 2.0 security",
      "Premium glass and aluminium finish",
      "Fleet management ready",
    ],
  },
];

export const featuredLaptopId = "apex-16";

const priceFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

export function formatLaptopPrice(price: number) {
  return priceFormatter.format(price);
}
