/**
 * getBaseUrl()
 *
 * Resolves the canonical base URL for the application in this priority:
 *
 *  1. NEXT_PUBLIC_SITE_URL — set this in Vercel / production env vars
 *  2. VERCEL_URL          — automatically injected by Vercel at build/runtime
 *  3. http://localhost:3000 — development fallback ONLY (never in production)
 *
 * Usage:
 *   import { getBaseUrl } from "@/lib/get-base-url";
 *   const url = `${getBaseUrl()}/callback`;
 *
 * Environment variable setup:
 *   - In Vercel: set NEXT_PUBLIC_SITE_URL = https://your-domain.com
 *   - In .env.local: set NEXT_PUBLIC_SITE_URL = http://localhost:3000 (for dev)
 */
export function getBaseUrl(): string {
  // Priority 1: Explicit canonical URL set by developer/ops
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
  }

  // Priority 2: Vercel automatically injects VERCEL_URL (no protocol prefix)
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`.replace(/\/$/, "");
  }

  // Priority 3: Local development fallback
  return "http://localhost:3000";
}

/**
 * getCallbackUrl()
 *
 * Returns the full auth callback URL.
 * Optionally accepts a `next` path and `type` to append as query params.
 *
 * Examples:
 *   getCallbackUrl()                          → https://example.com/callback
 *   getCallbackUrl("/seller-hub/onboarding") → https://example.com/callback?next=%2Fseller-hub%2Fonboarding
 *   getCallbackUrl("/reset", "recovery")      → https://example.com/callback?type=recovery&next=%2Freset
 */
export function getCallbackUrl(next?: string, type?: string): string {
  const base = getBaseUrl();
  const params = new URLSearchParams();
  if (type) params.set("type", type);
  if (next) params.set("next", next);
  const qs = params.toString();
  return qs ? `${base}/callback?${qs}` : `${base}/callback`;
}
