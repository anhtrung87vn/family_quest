import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
    globals: true,
    // The default 5s starves legitimately slow cases (scrypt/argon2 hashing) when
    // the whole suite runs in parallel, producing failures that pass in isolation.
    testTimeout: 20000,
    hookTimeout: 20000,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
});
