import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
  },
  resolve: {
    alias: {
      "@slidein/shared": path.resolve(__dirname, "../../packages/shared/src"),
      "@slidein/db": path.resolve(__dirname, "../../packages/db/src"),
      "@slidein/meta-sdk": path.resolve(
        __dirname,
        "../../packages/meta-sdk/src",
      ),
    },
  },
});
