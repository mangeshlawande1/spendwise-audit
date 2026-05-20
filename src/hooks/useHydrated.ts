"use client";

import { useEffect, useState } from "react";

/**
 * Prevents Zustand persist hydration mismatch.
 * Next.js renders on server first (no localStorage) then hydrates on client.
 * Without this, the server renders default state, client renders stored state → mismatch error.
 *
 * Usage: wrap any component that reads from a persisted Zustand store.
 *   const hydrated = useHydrated();
 *   if (!hydrated) return <Skeleton />;
 */
export function useHydrated(): boolean {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  return hydrated;
}