/** Routes reachable without Supabase session — keep in sync with onboarding/catalog UX. */
export const isPublicAppRoute = (pathname: string): boolean =>
  pathname === "/login" ||
  pathname.startsWith("/auth/") ||
  pathname === "/api/health" ||
  pathname === "/api/internal/geoapify-smoke" ||
  pathname === "/api/catalog/vehicles" ||
  pathname === "/api/catalog/supported" ||
  pathname.startsWith("/design-preview");
