import { defineConfig } from "vitest/config";
import path from "path";

// Separate config for tests that hit a real (local) Postgres database,
// rather than jsdom-based unit tests. Run with: npm run test:integration
// Requires the local `which_pet_shines_test` database (see README.md).
export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    include: ["src/**/*.integration.test.ts"],
    setupFiles: ["./vitest.integration.setup.ts"],
    testTimeout: 20000,
    fileParallelism: false, // tests share one DB; keep them sequential
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "server-only": path.resolve(__dirname, "./src/lib/__tests__/serverOnlyStub.ts"),
    },
  },
});
