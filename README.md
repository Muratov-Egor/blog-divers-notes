# Diver's Notes

Статический блог о дайвинге на [Astro](https://astro.build): [diversnotes.com](https://diversnotes.com).

Переписан с Next.js + Vercel, чтобы уйти от лимитов бесплатного тарифа на оптимизацию изображений: сайт полностью статический, картинки оптимизируются **один раз при добавлении**, а не на каждый запрос.

## Архитектура

- **Astro 7** — статическая генерация, ru в корне, en под `/en`
- **Контент** — markdown в `content/blog/{ru,en}` и `content/marine-life/{ru,en}`, данные в `content/*.json`
- **Стили** — Tailwind CSS 4, тёмная тема (класс `dark` + localStorage)
- **Поиск** — [Pagefind](https://pagefind.app), индекс строится после билда
- **Карта** — Leaflet + OpenStreetMap, данные из `content/dive-sites.json`
- **Хостинг** — Cloudflare Pages (безлимитный трафик, бесплатно)
- **Картинки** — Backblaze B2 / Cloudflare R2 за Cloudflare CDN

## Команды

```sh
pnpm dev          # дев-сервер (поиск работает только в проде-билде)
pnpm build        # astro build + индекс Pagefind
pnpm preview      # предпросмотр собранного сайта
pnpm images:sync  # сгенерировать и залить AVIF-варианты новых картинок
```

## Как работают картинки

Оригиналы (~10 ГБ) живут в бакете и в git не попадают. В git лежит только
`content/image-manifest.json` — размеры и список готовых вариантов каждой картинки.

1. В markdown вставляется обычная ссылка на оригинал в бакете.
2. `pnpm images:sync` находит новые ссылки, скачивает оригиналы, генерирует
   AVIF-варианты (480/800/1200/1920 px) через sharp, заливает их в бакет под
   `_opt/...` и дописывает манифест. Креды — в `.env` (см. `.env.example`).
3. На билде rehype-плагин (`src/lib/rehype-images.mjs`) и компонент `CdnImage`
   переписывают ссылки на `PUBLIC_IMAGE_CDN` и подставляют `srcset` из манифеста.
   Пока варианты не сгенерированы, отдаётся оригинал — сайт работает в любом случае.

Никакой runtime-оптимизации → ноль расходов и лимитов при любом трафике.

## Деплой (один раз)

1. **Cloudflare Pages**: создать проект из git-репозитория.
   Build command: `pnpm build`, output: `dist`.
   Переменная окружения: `PUBLIC_IMAGE_CDN=https://images.diversnotes.com`.
2. **Домен картинок**: в Cloudflare добавить `images.diversnotes.com`:
   - для Backblaze B2 — CNAME на `f003.backblazeb2.com` (proxied) + Transform Rule,
     переписывающий путь на `/file/diversnotes-images/...`; egress B2→Cloudflare
     бесплатный (Bandwidth Alliance);
   - либо перенести бакет в Cloudflare R2 и подключить custom domain одной кнопкой
     (10 ГБ бесплатно, дальше $0.015/ГБ·мес, egress всегда бесплатный).
   Включить кэширование: Cache Rule `Cache Everything` + Edge TTL 1 месяц.
3. **Домен сайта**: `diversnotes.com` → Pages-проект.
4. Прогнать `pnpm images:sync` для существующих 400+ картинок (можно частями,
   `--limit N`; манифест коммитится в git).
