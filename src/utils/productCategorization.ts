export interface UICategory {
  id: string;
  label: string;
  icon: string;
  printfulCategoryIds: number[];
}

// Map Printful category IDs to our UI categories
// These are common Printful category IDs
export const UI_CATEGORIES: UICategory[] = [
  {
    id: "wall-art",
    label: "Wall Art",
    icon: "🖼️",
    printfulCategoryIds: [55, 56, 57, 58, 65], // Posters, Canvas, Framed posters
  },
  {
    id: "clothing",
    label: "Clothing",
    icon: "👕",
    printfulCategoryIds: [24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 5, 6, 7], // T-shirts, hoodies, etc.
  },
  {
    id: "drinkware",
    label: "Drinkware",
    icon: "☕",
    printfulCategoryIds: [41, 42, 43, 44, 126], // Mugs, bottles, etc.
  },
  {
    id: "accessories",
    label: "Accessories",
    icon: "🎒",
    printfulCategoryIds: [46, 47, 48, 49, 50, 51, 52, 53, 54], // Phone cases, bags, etc.
  },
  {
    id: "home-living",
    label: "Home & Living",
    icon: "🏠",
    printfulCategoryIds: [36, 37, 38, 39, 40, 45, 59, 60], // Pillows, blankets, etc.
  },
];

/**
 * Get UI category for a Printful category ID
 */
export function getUICategoryForPrintful(printfulCategoryId: number): UICategory | undefined {
  return UI_CATEGORIES.find((cat) => cat.printfulCategoryIds.includes(printfulCategoryId));
}

/**
 * Assign a product to a UI category based on its type or Printful category
 */
export function categorizeProduct(productTitle: string, productType: string): string {
  const title = productTitle.toLowerCase();
  const type = productType.toLowerCase();

  if (title.includes("poster") || title.includes("canvas") || title.includes("framed") || title.includes("print") || type.includes("poster")) {
    return "wall-art";
  }
  if (title.includes("mug") || title.includes("tumbler") || title.includes("bottle") || title.includes("cup")) {
    return "drinkware";
  }
  if (title.includes("shirt") || title.includes("hoodie") || title.includes("sweatshirt") || title.includes("tank") || title.includes("dress") || type.includes("shirt")) {
    return "clothing";
  }
  if (title.includes("pillow") || title.includes("blanket") || title.includes("towel") || title.includes("apron") || title.includes("coaster")) {
    return "home-living";
  }
  return "accessories";
}

// Featured product IDs for the artwork preview page
// These are well-known Printful products that work great with custom images
export const FEATURED_PRODUCT_IDS = [
  1, // Unisex Staple T-Shirt (Bella+Canvas 3001)
  380, // Canvas (stretched)
  171, // Poster
  19, // Unisex Hoodie
  88, // Mug 11oz
  318, // Framed Poster
];
