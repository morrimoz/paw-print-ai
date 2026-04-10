export interface UICategory {
  id: string;
  label: string;
  icon: string;
  // Printful category IDs to fetch products from
  printfulCategoryIds: number[];
}

// Map our UI categories to actual Printful category IDs (from /categories API)
export const UI_CATEGORIES: UICategory[] = [
  {
    id: "wall-art",
    label: "Wall Art",
    icon: "🖼️",
    printfulCategoryIds: [21], // "Wall art" subcategory under Home & Living
  },
  {
    id: "clothing",
    label: "Clothing",
    icon: "👕",
    printfulCategoryIds: [24, 28], // T-shirts (men), Hoodies (men)
  },
  {
    id: "drinkware",
    label: "Drinkware",
    icon: "☕",
    printfulCategoryIds: [112], // "Drinkware & coasters" under Home & Living
  },
  {
    id: "accessories",
    label: "Accessories",
    icon: "🎒",
    printfulCategoryIds: [16, 15], // Bags, All hats
  },
  {
    id: "home-living",
    label: "Home & Living",
    icon: "🏠",
    printfulCategoryIds: [5], // Home & Living parent
  },
];

/**
 * Categorize a product by its title / type for fallback assignment
 */
export function categorizeProduct(productTitle: string, productType: string): string {
  const title = productTitle.toLowerCase();
  const type = productType.toLowerCase();

  if (
    title.includes("poster") || title.includes("canvas") || title.includes("framed") ||
    title.includes("print") || type.includes("poster") || type.includes("canvas")
  ) {
    return "wall-art";
  }
  if (title.includes("mug") || title.includes("tumbler") || title.includes("bottle") || title.includes("cup")) {
    return "drinkware";
  }
  if (
    title.includes("shirt") || title.includes("hoodie") || title.includes("sweatshirt") ||
    title.includes("tank") || title.includes("dress")
  ) {
    return "clothing";
  }
  if (
    title.includes("pillow") || title.includes("blanket") || title.includes("towel") ||
    title.includes("apron") || title.includes("coaster") || title.includes("rug")
  ) {
    return "home-living";
  }
  return "accessories";
}
