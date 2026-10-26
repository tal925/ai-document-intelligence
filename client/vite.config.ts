
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

const testSetupPath = fileURLToPath(
  new URL("./src/testSetup.ts", import.meta.url),
);

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: [testSetupPath],
  },
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:3000",
        changeOrigin: true,
      },
    },
  },
});
