import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: [
        "src/import/enrich-vehicleos-import.ts",
        "src/import/enrich-vehicleos-import-with-lookup.ts",
        "src/import/infer-shop-location.ts",
        "src/import/merge-shop-locations-from-import.ts",
        "src/import/nominatim-shop-location.ts",
        "src/import/normalize-carfax-line-items.ts",
        "src/import/record-import-row-verification.ts",
        "src/import/resolve-shop-location-with-lookup.ts",
        "src/import/shop-location-keys.ts",
        "src/import/shop-location-hints.ts",
        "src/import/shop-pack.ts",
        "src/import/stub-lookup-shop-location.ts",
        "src/import/tier-import-rows.ts",
      ],
      exclude: ["src/import/**/*.test.ts"],
      thresholds: {
        lines: 95,
        functions: 95,
        branches: 89,
        statements: 95,
      },
    },
  },
});
