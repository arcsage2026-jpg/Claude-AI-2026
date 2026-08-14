import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  root: "secondbrain",
  plugins: [react()],
  server: {
    port: 5174,
    proxy: {
      "/api": "http://localhost:5175",
    },
  },
  build: {
    outDir: "../dist-secondbrain",
    emptyOutDir: true,
  },
});
