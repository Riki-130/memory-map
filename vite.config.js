import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// GitHub Pages serves the app under /memory-map/. Firebase Hosting preview channels
// serve it from the root, so `npm run build:preview` sets VITE_BASE=/.
export default defineConfig({
  base: process.env.VITE_BASE || "/memory-map/",
  plugins: [react()]
});
