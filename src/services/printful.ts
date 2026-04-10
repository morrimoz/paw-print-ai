import { supabase } from "@/integrations/supabase/client";

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

async function callPrintful(action: string, params: Record<string, string> = {}, body?: unknown) {
  const queryParams = new URLSearchParams({ action, ...params });
  
  const options: { method: string; body?: string } = body 
    ? { method: "POST", body: JSON.stringify(body) }
    : { method: "GET" };

  const { data, error } = await supabase.functions.invoke("printful", {
    body: body ? { ...body as object, _action: action, _params: params } : undefined,
    method: body ? "POST" : "POST",
  });

  // Use the edge function via fetch for GET-like requests with query params
  const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
  const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  
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

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Printful API error: ${response.status}`);
  }

  return response.json();
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
  color: string;
  color_code: string;
  color_code2: string | null;
  image: string;
  price: string;
  in_stock: boolean;
  availability_status: string;
}

export interface PrintfulProductDetail {
  product: PrintfulProduct;
  variants: PrintfulVariant[];
}

export async function fetchCategories(): Promise<PrintfulCategory[]> {
  const cached = getCached<{ result: { categories: PrintfulCategory[] } }>("categories");
  if (cached) return cached.result.categories || cached.result as unknown as PrintfulCategory[];

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

export async function createMockup(
  productId: number,
  imageUrl: string,
  variantIds?: number[]
): Promise<{ mockups: { placement: string; variant_ids: number[]; mockup_url: string }[]; fallback?: boolean }> {
  const data = await callPrintful("create-mockup", {}, {
    product_id: productId,
    image_url: imageUrl,
    variant_ids: variantIds,
  });
  return data.result;
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
