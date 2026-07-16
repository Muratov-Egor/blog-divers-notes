# Diver's Notes — agent notes

Static Astro 7 bilingual diving blog. See README.md for architecture and deploy.

- Content lives in `content/` (markdown + json), NOT in `src/`. Frontmatter `slug`
  is a data field; collection ids are file paths via `generateId` (both locales
  share slugs — do not remove `generateId` or entries collide).
- Locale routing: shared views in `src/views/`, thin routes in `src/pages` (ru)
  and `src/pages/en`. Add new pages in both trees.
- Images: never commit binaries; content references bucket URLs. Run
  `pnpm images:sync` after adding images so `content/image-manifest.json`
  gets srcset variants. `PUBLIC_IMAGE_CDN` rewrites the host at build time.
- i18n strings: `messages/{ru,en}.json` via `t(locale, "dot.path")`.
- Build: `pnpm build` (includes Pagefind index). Search UI only works on the
  built site, not in `pnpm dev`.
- pnpm has a `minimumReleaseAge` supply-chain policy — freshly published
  package versions are rejected; pin an older version if install fails.
