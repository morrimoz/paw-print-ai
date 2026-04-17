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
  mockup_styles?: {
    id: number;
    view_name?: string;
    category_name?: string;
    restricted_to_variants?: number[];
  }[];
}

export interface MockupStylesResponse {
  data: MockupStyleGroup[];
  supported: boolean;
  placements: string[];
}

function extractTask(taskResponse: unknown): Record<string, unknown> {
  const payload = taskResponse as Record<string, unknown>;
  if (Array.isArray(payload?.data)) return (payload.data[0] as Record<string, unknown>) || {};
  return (payload?.data as Record<string, unknown>) || payload;
}

function extractMockupUrl(taskResponse: unknown): string | null {
  const task = extractTask(taskResponse);
  const direct = [task?.mockup_url, task?.url].find(
    (value): value is string => typeof value === "string" && value.length > 0
  );
  if (direct) return direct;

  const variantMockups = [
    ...(Array.isArray(task?.catalog_variant_mockups) ? task.catalog_variant_mockups : []),
    ...(Array.isArray(task?.mockups) ? task.mockups : []),
  ] as Record<string, unknown>[];

  for (const variantMockup of variantMockups) {
    const nested = [variantMockup?.mockup_url, variantMockup?.url].find(
      (value): value is string => typeof value === "string" && value.length > 0
    );
    if (nested) return nested;

    const placements = [
      ...(Array.isArray(variantMockup?.placements) ? variantMockup.placements : []),
      ...(Array.isArray(variantMockup?.mockups) ? variantMockup.mockups : []),
    ] as Record<string, unknown>[];

    for (const placement of placements) {
      const placementUrl = [placement?.mockup_url, placement?.url].find(
        (value): value is string => typeof value === "string" && value.length > 0
      );
      if (placementUrl) return placementUrl;
    }
  }

  return null;
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
  variantId: number
): Promise<string[]> {
  const styles = await fetchMockupStyles(productId);

  const placements = styles.data
    .filter((group) => {
      const styleList = group.mockup_styles || [];
      if (styleList.length === 0) return false;

      return styleList.some((style) => {
        const restricted = style.restricted_to_variants;
        return !restricted || restricted.length === 0 || restricted.includes(variantId);
      });
    })
    .map((group) => group.placement);

  return [...new Set(placements)];
}

function resolveMockupConfig(
  styles: MockupStylesResponse,
  placement: string,
  variantId: number
): { mockupStyleId: number; technique: string } | null {
  const group = styles.data.find((g) => g.placement === placement);
  if (!group) return null;

  const style =
    (group.mockup_styles || []).find((s) => {
      const restricted = s.restricted_to_variants;
      return !restricted || restricted.length === 0 || restricted.includes(variantId);
    }) || group.mockup_styles?.[0];

  if (!style?.id || !group.technique) return null;

  return {
    mockupStyleId: style.id,
    technique: group.technique,
  };
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

  const styles = await fetchMockupStyles(productId);
  const config = resolveMockupConfig(styles, placement, variantId);

  if (!config) {
    console.warn("No valid Printful mockup config found", { productId, variantId, placement });
    return { mockupUrl: null, placement };
  }

  const created = await callPrintful("create-mockup-task", {}, {
    catalog_product_id: productId,
    catalog_variant_ids: [variantId],
    placement,
    image_url: imageUrl,
    format,
    mockup_style_id: config.mockupStyleId,
    technique: config.technique,
  });

  const task = extractTask(created);
  const taskId = task?.id || task?.task_id;
  if (!taskId) {
    console.warn("No task id from create-mockup-task", created);
    return { mockupUrl: null, placement };
  }

  for (let i = 0; i < 15; i++) {
    await new Promise((r) => setTimeout(r, 2000));
    const statusRes = await callPrintful("get-mockup-task", { task_id: String(taskId) });
    const t = extractTask(statusRes);
    const status = t?.status;

    if (status === "completed") {
      const variantMockups = [
        ...(Array.isArray(t?.catalog_variant_mockups) ? t.catalog_variant_mockups : []),
        ...(Array.isArray(t?.mockups) ? t.mockups : []),
      ] as Record<string, unknown>[];

      for (const variantEntry of variantMockups) {
        const placementEntries = [
          ...(Array.isArray(variantEntry?.mockups) ? variantEntry.mockups : []),
          ...(Array.isArray(variantEntry?.placements) ? variantEntry.placements : []),
        ] as Record<string, unknown>[];

        for (const p of placementEntries) {
          if (p?.placement === placement && typeof p?.mockup_url === "string") {
            return { mockupUrl: p.mockup_url, placement };
          }
          if (p?.placement === placement && typeof p?.url === "string") {
            return { mockupUrl: p.url, placement };
          }
        }

        if (typeof variantEntry?.mockup_url === "string") {
          return { mockupUrl: variantEntry.mockup_url, placement };
        }
      }

      // Fallback: any URL anywhere in the response.
      return { mockupUrl: extractMockupUrl(statusRes), placement };
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
