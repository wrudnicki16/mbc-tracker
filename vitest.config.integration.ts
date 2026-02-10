import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    include: ["src/**/*.integration.test.ts"],
    setupFiles: ["src/lib/__tests__/integration/setup.ts"],
    testTimeout: 30000, // 30 seconds for database operations
    hookTimeout: 60000, // 60 seconds for setup/teardown
    fileParallelism: false, // Run test files sequentially
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
