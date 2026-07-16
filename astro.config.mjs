// @ts-check
import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";
import tailwindcss from "@tailwindcss/vite";
import rehypeSlug from "rehype-slug";
import { rehypeImages } from "./src/lib/rehype-images.mjs";
import { rehypeYoutube } from "./src/lib/rehype-youtube.mjs";

export default defineConfig({
  site: "https://diversnotes.com",
  trailingSlash: "never",
  i18n: {
    defaultLocale: "ru",
    locales: ["ru", "en"],
    routing: { prefixDefaultLocale: false },
  },
  integrations: [sitemap()],
  vite: { plugins: [tailwindcss()] },
  markdown: {
    rehypePlugins: [rehypeSlug, rehypeImages, rehypeYoutube],
  },
});
