import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { viteSingleFile } from "vite-plugin-singlefile";

// Separate build for the standalone 3D avatar scene: bundled as a single
// self-contained HTML file (no external JS/CSS references) so it can be
// `require()`'d as one Expo asset and loaded in a mobile WebView without
// needing to preserve a relative directory of sibling files.
export default defineConfig({
  plugins: [react(), viteSingleFile()],
  build: {
    outDir: "dist-avatar",
    rollupOptions: {
      input: "avatar.html",
    },
    emptyOutDir: true,
  },
});
