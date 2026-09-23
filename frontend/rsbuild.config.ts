import { defineConfig } from "@rsbuild/core";
import { pluginReact } from "@rsbuild/plugin-react";
import { pluginTailwindcss } from "@rsbuild/plugin-tailwindcss";

export default defineConfig({
  plugins: [pluginReact(), pluginTailwindcss()],
  source: {
    entry: {
      index: "./src/index.tsx",
    },
  },
  resolve: {
    alias: {
      "@": "./src",
    },
  },
  html: {
    title: "SignBridge — агент тарифных кампаний",
  },
  server: {
    port: 3000,
    proxy: {
      "/api": "http://127.0.0.1:8765",
    },
  },
});
