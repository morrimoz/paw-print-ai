const CACHE_TTL = 30 * 60 * 1000; // 30 minutes
const cache = new Map<string, { data: unknown; ts: number }>();

function getCached<T>(key: string): T | null {
  const entry = cache.get(key);
  if (entry && Date.now() - entry.ts < CACHE_TTL) return entry.data as T;
  cache.delete(key);
  return null;
}

function setCache(key: string, data: unknown) {
  cache.set(key, { data, ts: Date.now() });
}

// In-flight request dedup so concurrent identical fetches share one network call.
const inflight = new Map<string, Promise<unknown>>();

class PrintfulRateLimitError extends Error {
  retryAfter: number;
  constructor(retryAfter: number) {
    super(`Rate limited; retry after ${retryAfter}s`);
    this.retryAfter = retryAfter;
  }
}

async function callPrintful(action: string, params: Record<string, string> = {}, body?: unknown) {
  const queryParams = new URLSearchParams({ action, ...params });
  const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
  const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

  const dedupKey = `${action}:${queryParams.toString()}:${body ? JSON.stringify(body) : ""}`;
  const existing = inflight.get(dedupKey);
  if (existing) return existing;

  const p = (async () => {
    const response = await fetch(
      `https://${projectId}.supabase.co/functions/v1/printful?${queryParams}`,
      {
        method: body ? "POST" : "GET",
        headers: {
          "Content-Type": "application/json",
          apikey: anonKey,
          Authorization: `Bearer ${anonKey}`,
        },
        body: body ? JSON.stringify(body) : undefined,
      }
    );

    if (response.status === 429) {
      const retryHeader = response.headers.get("Retry-After");
      const retryAfter = parseInt(retryHeader || "60", 10);
      throw new PrintfulRateLimitError(retryAfter);
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Printful API error: ${response.status}`);
    }

    return response.json();
  })().finally(() => inflight.delete(dedupKey));

  inflight.set(dedupKey, p);
  return p;
}

export interface PrintfulCategory {
  id: number;
  parent_id: number;
  image_url: string;
  size: string;
  title: string;
}

export interface PrintfulProduct {
  id: number;
  type: string;
  type_name: string;
  title: string;
  brand: string;
  model: string;
  image: string;
  variant_count: number;
  currency: string;
  files: { id: string; type: string; title: string }[];
  options: unknown[];
  is_discontinued: boolean;
  description: string;
}

export interface PrintfulVariant {
  id: number;
  product_id: number;
  name: string;
  size: string;
  color: string | null;
  color_code: string | null;
  color_code2: string | null;
  image: string;
  price: string;
  in_stock: boolean;
  availability_status: { region: string; status: string }[];
}

export interface PrintfulProductDetail {
  product: PrintfulProduct;
  variants: PrintfulVariant[];
}

/** V2 mockup style group (one per placement). */
export interface MockupStyleGroup {
  placement: string;
  technique?: string;
  display_name?: string;
  print_area_width?: number;
  print_area_height?: number;
  mockup_styles?: { id: number; view_name: string; category_name: string }[];
}

export interface MockupStylesResponse {
  data: MockupStyleGroup[];
  supported: boolean;
  placements: string[];
}

export async function fetchCategories(): Promise<PrintfulCategory[]> {
  const cached = getCached<{ result: { categories: PrintfulCategory[] } }>("categories");
  if (cached) return cached.result?.categories || (cached.result as unknown as PrintfulCategory[]);

  const data = await callPrintful("categories");
  setCache("categories", data);
  return data.result?.categories || data.result || [];
}

export async function fetchProducts(categoryId?: number): Promise<PrintfulProduct[]> {
  const key = `products-${categoryId || "all"}`;
  const cached = getCached<{ result: PrintfulProduct[] }>(key);
  if (cached) return cached.result || [];

  const params: Record<string, string> = {};
  if (categoryId) params.category_id = String(categoryId);

  const data = await callPrintful("products", params);
  setCache(key, data);
  return data.result || [];
}

export async function fetchProductDetail(productId: number): Promise<PrintfulProductDetail> {
  const key = `product-${productId}`;
  const cached = getCached<{ result: PrintfulProductDetail }>(key);
  if (cached) return cached.result;

  const data = await callPrintful("product", { product_id: String(productId) });
  setCache(key, data);
  return data.result;
}

// =================== V2 MOCKUPS ===================

/**
 * Returns the V2 mockup styles for a product (and whether mockups are supported at all).
 * The response shape from the API is:
 *   { data: [ { placement, technique, mockup_styles: [...] }, ... ] }
 * Our edge function enriches it with `supported` and `placements` (the unique placement keys).
 */
export async function fetchMockupStyles(productId: number): Promise<MockupStylesResponse> {
  const key = `mockup-styles-${productId}`;
  const cached = getCached<MockupStylesResponse>(key);
  if (cached) return cached;
  try {
    const res = await callPrintful("mockup-styles", { product_id: String(productId) });
    const out: MockupStylesResponse = {
      data: res.data || [],
      supported: !!res.supported,
      placements: res.placements || [],
    };
    setCache(key, out);
    return out;
  } catch {
    return { data: [], supported: false, placements: [] };
  }
}

/** Truthful check that this product supports V2 mockup generation. */
export async function checkMockupSupport(productId: number): Promise<boolean> {
  const styles = await fetchMockupStyles(productId);
  return styles.supported;
}

/** Distinct placements available for a product (variant-aware via mockup-styles). */
export async function fetchPlacementsForVariant(
  productId: number,
  _variantId: number
): Promise<string[]> {
  // mockup-styles already gives us the canonical list of placements that support
  // mockup generation for this product. It's variant-agnostic in V2 unless
  // restricted_to_variants is set on individual styles — for placement selection
  // this is the right list to show.
  const styles = await fetchMockupStyles(productId);
  return styles.placements;
}

/** Create a mockup task and poll until completed. */
export async function generateMockup(opts: {
  productId: number;
  variantId: number;
  placement: string;
  imageUrl: string;
  format?: "jpg" | "png";
}): Promise<{ mockupUrl: string | null; placement: string }> {
  const { productId, variantId, placement, imageUrl, format = "jpg" } = opts;

  const created = await callPrintful("create-mockup-task", {}, {
    catalog_product_id: productId,
    catalog_variant_id: variantId,
    placement,
    image_url: imageUrl,
    format,
  });

  const task = created?.data || created;
  const taskId = task?.id || task?.task_id;
  if (!taskId) {
    console.warn("No task id from create-mockup-task", created);
    return { mockupUrl: null, placement };
  }

  // Poll up to ~30s.
  for (let i = 0; i < 15; i++) {
    await new Promise((r) => setTimeout(r, 2000));
    const statusRes = await callPrintful("get-mockup-task", { task_id: String(taskId) });
    const t = statusRes?.data || statusRes;
    const status = t?.status;
    if (status === "completed") {
      const mockups = t?.catalog_variant_mockups || t?.mockups || [];
      for (const m of mockups) {
        const placements = m?.mockups || m?.placements || [];
        for (const p of placements) {
          if (p?.mockup_url) return { mockupUrl: p.mockup_url, placement };
          if (p?.url) return { mockupUrl: p.url, placement };
        }
        if (m?.mockup_url) return { mockupUrl: m.mockup_url, placement };
      }
      return { mockupUrl: null, placement };
    }
    if (status === "failed") {
      console.warn("Mockup task failed:", t);
      return { mockupUrl: null, placement };
    }
  }
  return { mockupUrl: null, placement };
}

export async function createOrder(
  items: { variant_id: number; quantity: number; files: { url: string; type: string }[] }[],
  shippingAddress: {
    name: string;
    address1: string;
    city: string;
    state_code?: string;
    country_code: string;
    zip: string;
  }
) {
  const data = await callPrintful("create-order", {}, {
    items,
    shipping_address: shippingAddress,
  });
  return data.result;
}

export { PrintfulRateLimitError };
