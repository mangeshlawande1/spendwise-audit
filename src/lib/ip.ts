import { createHash } from "crypto";

/**
 * Hashes an IP address using SHA-256 so we never store raw IPs.
 */
export async function hashIP(ip: string): Promise<string> {
  return createHash("sha256")
    .update(`spendwise:${ip}`)
    .digest("hex");
}

/**
 * Extracts the real IP from a Next.js request,
 * handling common proxy headers (Vercel, Cloudflare, etc.)
 */
export function getClientIP(req: Request): string {
  const headers = req instanceof Request ? req.headers : new Headers();

  return (
    headers.get("x-real-ip") ??
    headers.get("cf-connecting-ip") ??
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown"
  );
}