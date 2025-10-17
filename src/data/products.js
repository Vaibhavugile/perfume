// src/data/products.js
// Central product list used across the app (dummy data).
// price value is in paise (i.e. price 49900 -> ₹499.00)

const PRODUCTS = [
  {
    id: "p-rose-oud",
    name: "Rose Oud",
    price: 49900,
    featured: true,
    tags: ["oriental", "floral", "romantic"],
    image: "/bottle-rose-oud.png", // replace with your real bottles or generated transparent PNGs
    description: "Warm amber & rose on a luxurious oud base.",
    notes: ["Top: Rose", "Heart: Oud", "Base: Amber"],
  },
  {
    id: "p-citrus-bloom",
    name: "Citrus Bloom",
    price: 34900,
    featured: true,
    tags: ["fresh", "citrus", "bright"],
    image: "/bottle-citrus-bloom.png",
    description: "Bright citrus with sparkling florals for daytime wear.",
    notes: ["Top: Bergamot", "Heart: Neroli", "Base: White Musk"],
  },
  {
    id: "p-velvet-noir",
    name: "Velvet Noir",
    price: 59900,
    featured: false,
    tags: ["woody", "mysterious", "oriental"],
    image: "/bottle-velvet-noir.png",
    description: "Smoky vanilla and leather for an evening signature.",
    notes: ["Top: Smoke", "Heart: Leather", "Base: Vanilla"],
  },
  {
    id: "p-sunlit-veil",
    name: "Sunlit Veil",
    price: 27900,
    featured: false,
    tags: ["bright", "fresh"],
    image: "/bottle-sunlit-veil.png",
    description: "A light veil of citrus and orange blossom.",
    notes: ["Top: Orange", "Heart: Orange Blossom", "Base: Cedar"],
  },
  {
    id: "p-cozy-amber",
    name: "Cozy Amber",
    price: 42900,
    featured: true,
    tags: ["comfort", "amber"],
    image: "/bottle-cozy-amber.png",
    description: "Cuddly amber and vanilla for cosy evenings.",
    notes: ["Top: Spice", "Heart: Amber", "Base: Vanilla"],
  },
  // add as many as you'd like...
];

// Helpers for other components
export function getProducts() {
  return PRODUCTS.slice();
}
export function getFeaturedProducts() {
  return PRODUCTS.filter((p) => p.featured);
}
export function getProductById(id) {
  return PRODUCTS.find((p) => p.id === id);
}
export function formatPrice(n) {
  if (typeof n !== "number") return "";
  return `₹${(n / 100).toFixed(2)}`;
}
export function getAllTags() {
  const set = new Set();
  PRODUCTS.forEach((p) => (p.tags || []).forEach((t) => set.add(t)));
  return Array.from(set);
}

export default PRODUCTS;
