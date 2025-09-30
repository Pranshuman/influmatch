import { useEffect, useRef, useState } from "react";

type Options = {
  method?: string;
  headers?: Record<string, string>;
  body?: any;
  timeoutMs?: number;
  cache?: RequestCache;
};

export function useApi<T = unknown>(url: string, opts: Options = {}) {
  const { method = "GET", headers, body, timeoutMs = 15000, cache = "no-store" } = opts;
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return; // prevent double-run in StrictMode
    started.current = true;

    const ctrl = new AbortController();
    const id = setTimeout(() => ctrl.abort("timeout"), timeoutMs);

    (async () => {
      try {
        console.log(`[useApi] Starting ${method} request to:`, url);
        
        const res = await fetch(url, {
          method,
          headers: { "Content-Type": "application/json", ...(headers || {}) },
          body: body ? JSON.stringify(body) : undefined,
          signal: ctrl.signal,
          cache,
        });

        console.log(`[useApi] Response status:`, res.status, res.statusText);

        if (!res.ok) {
          const txt = await res.text().catch(() => "");
          throw new Error(`HTTP ${res.status} ${res.statusText}: ${txt.slice(0, 200)}`);
        }

        // Try JSON, fall back to text for debugging
        const contentType = res.headers.get("content-type") || "";
        console.log(`[useApi] Content-Type:`, contentType);
        
        const payload = contentType.includes("application/json")
          ? await res.json()
          : await res.text();

        console.log(`[useApi] Response data:`, payload);
        setData(payload as T);
      } catch (e: any) {
        console.error(`[useApi] Error:`, e);
        setError(e?.name === "AbortError" ? new Error("Request timed out") : e);
      } finally {
        clearTimeout(id);
        setLoading(false);
        console.log(`[useApi] Request completed`);
      }
    })();

    return () => {
      clearTimeout(id);
      ctrl.abort("unmount");
    };
  }, [url, method, JSON.stringify(headers), JSON.stringify(body), timeoutMs, cache]);

  return { data, loading, error };
}


