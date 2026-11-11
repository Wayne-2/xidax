export type PrebuildBrand = "intel" | "amd";
export type PrebuildStock = "in-stock" | "built-to-order";

export type Prebuild = {
  id: string;
  name: string;
  image: string;
  brand: PrebuildBrand;
  price: number;
  stock: PrebuildStock;
  flagship: boolean;
  specs: string;
};

export const prebuilds: Prebuild[] = [
  {
    id: "starter-intel",
    name: "Starter Intel",
    image: "/hero_image.png",
    brand: "intel",
    price: 1299,
    stock: "in-stock",
    flagship: false,
    specs:
      "Intel Core i5-14400F · GeForce RTX 4060 8GB · 16GB DDR5 · 1TB NVMe SSD",
  },
  {
    id: "ryzen-strike",
    name: "Ryzen Strike",
    image: "/display_section2.png",
    brand: "amd",
    price: 1449,
    stock: "in-stock",
    flagship: false,
    specs:
      "AMD Ryzen 5 7600 · Radeon RX 7600 8GB · 16GB DDR5 · 1TB NVMe SSD",
  },
  {
    id: "core-ascend",
    name: "Core Ascend",
    image: "/display_section.png",
    brand: "intel",
    price: 1899,
    stock: "built-to-order",
    flagship: false,
    specs:
      "Intel Core i7-14700F · GeForce RTX 4070 12GB · 32GB DDR5 · 1TB NVMe SSD",
  },
  {
    id: "ryzen-surge",
    name: "Ryzen Surge",
    image: "/terms_image.png",
    brand: "amd",
    price: 2199,
    stock: "in-stock",
    flagship: false,
    specs:
      "AMD Ryzen 7 7800X3D · Radeon RX 7800 XT 16GB · 32GB DDR5 · 2TB NVMe SSD",
  },
  {
    id: "core-prime",
    name: "Core Prime",
    image: "/display_section.png",
    brand: "intel",
    price: 2499,
    stock: "in-stock",
    flagship: false,
    specs:
      "Intel Core i7-14700K · GeForce RTX 4070 Ti SUPER 16GB · 32GB DDR5 · 2TB NVMe SSD",
  },
  {
    id: "ryzen-titan",
    name: "Ryzen Titan",
    image: "/display_section2.png",
    brand: "amd",
    price: 2999,
    stock: "built-to-order",
    flagship: true,
    specs:
      "AMD Ryzen 9 7900X · Radeon RX 7900 XT 20GB · 32GB DDR5 · 2TB NVMe SSD",
  },
  {
    id: "core-titan",
    name: "Core Titan",
    image: "/hero_image.png",
    brand: "intel",
    price: 3499,
    stock: "in-stock",
    flagship: true,
    specs:
      "Intel Core i9-14900K · GeForce RTX 4080 SUPER 16GB · 32GB DDR5 · 2TB NVMe SSD",
  },
  {
    id: "ryzen-apex",
    name: "Ryzen Apex",
    image: "/terms_image.png",
    brand: "amd",
    price: 3999,
    stock: "built-to-order",
    flagship: true,
    specs:
      "AMD Ryzen 9 7950X3D · Radeon RX 7900 XTX 24GB · 64GB DDR5 · 4TB NVMe SSD",
  },
  {
    id: "core-apex",
    name: "Core Apex",
    image: "/display_section.png",
    brand: "intel",
    price: 4499,
    stock: "built-to-order",
    flagship: true,
    specs:
      "Intel Core i9-14900KS · GeForce RTX 4090 24GB · 64GB DDR5 · 4TB NVMe SSD",
  },
];
