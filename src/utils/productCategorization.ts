export interface UICategory {
  id: string;
  label: string;
  icon: string;
  // Printful top-level parent category IDs to fetch products from
  printfulCategoryIds: number[];
}

// Map our UI categories to Printful parent category IDs (from /categories API)
export const UI_CATEGORIES: UICategory[] = [
  {
    id: "wall-art",
    label: "Wall Art",
    icon: "🖼️",
    printfulCategoryIds: [28], // Posters, canvas, framed prints (id 28 = "Wall art" parent)
  },
  {
    id: "clothing",
    label: "Clothing",
    icon: "👕",
    printfulCategoryIds: [1, 2], // Men's clothing, Women's clothing
  },
  {
    id: "drinkware",
    label: "Drinkware",
    icon: "☕",
    printfulCategoryIds: [126], // Drinkware
  },
  {
    id: "accessories",
    label: "Accessories",
    icon: "🎒",
    printfulCategoryIds: [4], // Accessories
  },
  {
    id: "home-living",
    label: "Home & Living",
    icon: "🏠",
    printfulCategoryIds: [5], // Home & Living
  },
];

/**
 * Categorize a product by its title / type for fallback assignment
 */
export function categorizeProduct(productTitle: string, productType: string): string {
  const title = productTitle.toLowerCase();
  const type = productType.toLowerCase();

  if (
    title.includes("poster") ||
    title.includes("canvas") ||
    title.includes("framed") ||
    title.includes("print") ||
    type.includes("poster") ||
    type.includes("canvas") ||
    type.includes("framed")
  ) {
    return "wall-art";
  }
  if (title.includes("mug") || title.includes("tumbler") || title.includes("bottle") || title.includes("cup")) {
    return "drinkware";
  }
  if (
    title.includes("shirt") ||
    title.includes("hoodie") ||
    title.includes("sweatshirt") ||
    title.includes("tank") ||
    title.includes("dress") ||
    type.includes("shirt")
  ) {
    return "clothing";
  }
  if (
    title.includes("pillow") ||
    title.includes("blanket") ||
    title.includes("towel") ||
    title.includes("apron") ||
    title.includes("coaster") ||
    title.includes("rug")
  ) {
    return "home-living";
  }
  return "accessories";
}
