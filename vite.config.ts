import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import fs from "node:fs";
import path from "path";
import { defineConfig } from "vite";
import { vitePluginManusRuntime } from "vite-plugin-manus-runtime";

const projectRoot = path.resolve(import.meta.dirname);
const srcDir = path.resolve(projectRoot, "src");
const sharedDir = path.resolve(projectRoot, "..", "egp-backend", "shared");
const publicDir = path.resolve(projectRoot, "public");
const distDir = path.resolve(projectRoot, "dist");

const plugins = [react(), tailwindcss(), vitePluginManusRuntime()];

export default defineConfig({
  plugins,
  resolve: {
    alias: {
      "@": srcDir,
      "@shared": sharedDir,
      "@backend": path.resolve(projectRoot, "..", "egp-backend"),
    },
  },
  envDir: projectRoot,
  root: projectRoot,
  publicDir,
  build: {
    outDir: distDir,
    emptyOutDir: true,
  },
  server: {
    host: true,
    allowedHosts: [
      ".manuspre.computer",
      ".manus.computer",
      ".manus-asia.computer",
      ".manuscomputer.ai",
      ".manusvm.computer",
      "localhost",
      "127.0.0.1",
    ],
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
  },
});
