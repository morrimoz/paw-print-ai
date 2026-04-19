import { useEffect, useState } from "react";
import { detectUserCurrency } from "@/utils/pricing";

interface CurrencyState {
  code: string; // e.g. "EUR"
  rate: number; // 1 USD = rate * target
  ready: boolean;
}

let cached: CurrencyState | null = null;
let inflight: Promise<CurrencyState> | null = null;

async function loadRate(): Promise<CurrencyState> {
  if (cached) return cached;
  if (inflight) return inflight;

  const code = detectUserCurrency();
  if (code === "USD") {
    cached = { code: "USD", rate: 1, ready: true };
    return cached;
  }

  inflight = (async () => {
    try {
      // Free, no-key public FX API. Falls back gracefully on failure.
      const res = await fetch(`https://open.er-api.com/v6/latest/USD`);
      if (!res.ok) throw new Error("fx fail");
      const json = await res.json();
      const rate = json?.rates?.[code];
      if (typeof rate !== "number") throw new Error("no rate");
      cached = { code, rate, ready: true };
      return cached;
    } catch {
      cached = { code: "USD", rate: 1, ready: true };
      return cached;
    } finally {
      inflight = null;
    }
  })();

  return inflight;
}

/** Returns the user's local currency + a USD->local conversion rate. */
export function useCurrency(): CurrencyState {
  const [state, setState] = useState<CurrencyState>(
    cached ?? { code: "USD", rate: 1, ready: false },
  );

  useEffect(() => {
    let cancelled = false;
    loadRate().then((s) => {
      if (!cancelled) setState(s);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
