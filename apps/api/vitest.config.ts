import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    setupFiles: ["./src/test/setupEnv.ts"],
    hookTimeout: 30000,
    testTimeout: 30000,
    // All integration tests share one Postgres test database and truncate it between tests,
    // so test files must not run concurrently against it.
    fileParallelism: false,
    // Vitest's default include glob also matches compiled output — without this, running
    // `pnpm run build` before `pnpm run test` silently double-runs every test (src/*.test.ts
    // + dist/*.test.js against the same DB).
    exclude: ["**/node_modules/**", "**/dist/**"],
  },
});
