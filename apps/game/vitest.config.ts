import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

// Only the platform-free logic in src/core is unit tested here, so plain node is enough.
export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  test: { environment: "node", include: ["test/**/*.test.ts"] },
});
