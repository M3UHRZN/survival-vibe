import { resolve } from "node:path";
import { defineConfig } from "vite";

const projectRoot = resolve(__dirname, "..");

export default defineConfig({
  resolve: {
    alias: {
      "@shared": resolve(projectRoot, "shared"),
    },
  },
  server: {
    port: 5173,
    fs: {
      allow: [projectRoot],
    },
  },
});
