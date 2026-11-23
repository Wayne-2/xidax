/**
 * Standard specification tags per product category.
 *
 * The admin picks a tag from this list and enters the specific value for the
 * product, so data stays consistent across the catalog while still allowing
 * each product to describe its own variation.
 */
export type SpecTag = { label: string; placeholder: string };

export type ProductKind = "prebuild" | "laptop" | "console";

export const SPEC_TAGS: Record<ProductKind, SpecTag[]> = {
  prebuild: [
    { label: "Processor", placeholder: "Intel Core i7-14700K" },
    { label: "Graphics card", placeholder: "GeForce RTX 4070 12GB" },
    { label: "FPS", placeholder: "144 FPS on Ultra settings" },
    { label: "Memory", placeholder: "32GB DDR5 6000MHz" },
    { label: "Storage", placeholder: "1TB NVMe SSD" },
    { label: "Motherboard", placeholder: "Z790 ATX" },
    { label: "Power supply", placeholder: "850W 80+ Gold" },
    { label: "Cooling", placeholder: "240mm AIO liquid" },
    { label: "Case", placeholder: "Mid-tower ATX" },
    { label: "Operating system", placeholder: "Windows 11 Pro" },
    { label: "Warranty", placeholder: "3 years labour" },
  ],
  laptop: [
    { label: "Processor", placeholder: "Intel Core i9-14900HX" },
    { label: "Graphics card", placeholder: "GeForce RTX 4080 Laptop" },
    { label: "FPS", placeholder: "120 FPS on High settings" },
    { label: "Memory", placeholder: "32GB DDR5 5600MHz" },
    { label: "Storage", placeholder: "2TB NVMe SSD" },
    { label: "Display", placeholder: '16" QHD+ 240Hz' },
    { label: "Battery", placeholder: "99Wh" },
    { label: "Weight", placeholder: "2.1 kg" },
    { label: "Operating system", placeholder: "Windows 11 Pro" },
    { label: "Warranty", placeholder: "2 years" },
  ],
  console: [
    { label: "Panel", placeholder: '27" IPS' },
    { label: "Resolution", placeholder: "2560 × 1440 (QHD)" },
    { label: "Refresh rate", placeholder: "240Hz" },
    { label: "Response time", placeholder: "1ms GtG" },
    { label: "Colour gamut", placeholder: "99% sRGB" },
    { label: "HDR", placeholder: "HDR600" },
    { label: "Sync", placeholder: "G-Sync Compatible" },
    { label: "Connectivity", placeholder: "HDMI 2.1 · DisplayPort 1.4 · USB-C" },
    { label: "Stand", placeholder: "Height adjustable" },
    { label: "Warranty", placeholder: "3 years" },
  ],
};

/**
 * Iconify icon name (mdi set) per standard spec tag, so every tag renders its
 * own exact icon wherever specs are displayed — storefront lists, product
 * detail pages, and the admin spec inputs.
 */
export const SPEC_TAG_ICONS: Record<string, string> = {
  // Prebuild
  Processor: "mdi:cpu-64-bit",
  "Graphics card": "mdi:expansion-card",
  FPS: "mdi:speedometer",
  Memory: "mdi:memory",
  Storage: "mdi:harddisk",
  Motherboard: "mdi:integrated-circuit-chip",
  "Power supply": "mdi:power-plug",
  Cooling: "mdi:fan",
  Case: "mdi:desktop-tower",
  "Operating system": "mdi:microsoft-windows",
  Warranty: "mdi:shield-check",
  // Laptop
  Display: "mdi:monitor",
  Battery: "mdi:battery",
  Weight: "mdi:weight-kilogram",
  // Console
  Panel: "mdi:television",
  Resolution: "mdi:aspect-ratio",
  "Refresh rate": "mdi:refresh",
  "Response time": "mdi:timer",
  "Colour gamut": "mdi:palette-swatch",
  HDR: "mdi:hdr",
  Sync: "mdi:sync",
  Connectivity: "mdi:lan",
  Stand: "mdi:desk",
};

/** Builds the flat display string used by legacy card layouts. */
export function specsToSummary(
  specs: { label: string; value: string }[]
): string {
  return specs
    .filter((spec) => spec.label && spec.value)
    .map((spec) => `${spec.label}: ${spec.value}`)
    .join(" · ");
}
