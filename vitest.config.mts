import { defineConfig } from "vitest/config";
import path from "path";
import { fileURLToPath } from "url";

const dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    testTimeout: 120_000, // pipeline + isolation tests hit real Claude/Neon, not mocked
    hookTimeout: 30_000,
  },
  resolve: {
    alias: {
      "@": path.resolve(dirname, "./src"),
      // See tests/stubs/server-only.ts — the real package throws outside Next's bundler.
      "server-only": path.resolve(dirname, "./tests/stubs/server-only.ts"),
    },
  },
});
