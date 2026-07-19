# Деплой Diver's Notes: пошаговая инструкция

Цель: сайт на Cloudflare Pages (бесплатно, безлимитный трафик), картинки в Cloudflare R2
за CDN (около $0.15/мес за ~20 ГБ сверх бесплатных 10). Никаких лимитов на оптимизацию
изображений — всё генерируется заранее скриптом.

Понадобится ~1–2 часа, из них большая часть — ожидание DNS и заливка картинок.

---

## Шаг 0. Что нужно иметь

- Аккаунт GitHub (есть).
- Аккаунт Cloudflare — зарегистрироваться на <https://dash.cloudflare.com/sign-up>
  (бесплатный план Free, карта не нужна).
- Доступ к регистратору домена `diversnotes.com` (где он куплен) — понадобится
  один раз поменять NS-серверы.
- Node 24 + pnpm локально (есть) — для заливки картинок.

## Шаг 1. Репозиторий на GitHub

1. На GitHub: **New repository** → имя, например, `diversnotes-astro`, приватный или
   публичный — не важно. Без README (репозиторий уже готов локально).
2. Локально из папки проекта:

   ```sh
   git remote add origin git@github.com:Muratov-Egor/diversnotes-astro.git
   git push -u origin main
   ```

## Шаг 2. Подключить домен к Cloudflare

Это нужно и для сайта, и для картинок (CDN работает только на доменах в Cloudflare).

1. В Cloudflare Dashboard: **Add a domain** → ввести `diversnotes.com` → план **Free**.
2. Cloudflare покажет два NS-сервера (вида `xxx.ns.cloudflare.com`). Зайти к регистратору
   домена и заменить текущие NS-серверы на эти.
3. Cloudflare импортирует существующие DNS-записи автоматически — проверить, что записи
   почты (MX), если есть, переехали.
4. Подождать активации (обычно минуты—часы, максимум сутки). Статус в дашборде
   сменится на **Active**.

⚠️ Пока домен не переключён, старый сайт на Vercel продолжает работать — простоя не будет.

## Шаг 3. Хранилище картинок — Cloudflare R2

1. В дашборде Cloudflare: **R2 Object Storage** → **Create bucket**:
   - имя: `diversnotesimages` (дефисы Cloudflare не разрешает)
   - регион: автоматически (или Eastern Europe).
2. Открыть бакет → **Settings** → **Custom Domains** → **Connect domain** →
   ввести `images.diversnotes.com`. Cloudflare сам создаст DNS-запись и включит CDN-кэш.
3. Создать ключи API: **R2 → Manage API Tokens → Create API Token**:
   - Permissions: **Object Read & Write**, только для бакета `diversnotesimages`.
   - Записать `Access Key ID` и `Secret Access Key` (показываются один раз),
     а также `endpoint` вида `https://<account_id>.r2.cloudflarestorage.com`.

### Перенос картинок из Backblaze B2 в R2

Самый простой способ — `rclone` (10 ГБ прольются за один запуск, трафик B2→интернет
до 3× объёма хранилища в месяц бесплатен):

```sh
brew install rclone
rclone config   # создать два remote: b2 (по ключам Backblaze) и r2 (тип s3, провайдер Cloudflare)
rclone copy b2:diversnotes-images r2:diversnotesimages --progress --transfers 16
```

Альтернатива без переноса: оставить картинки в B2 и просто поставить Cloudflare перед ним
(CNAME `images` → `f003.backblazeb2.com` + Transform Rule, переписывающий путь на
`/file/diversnotes-images/...`). Трафик B2→Cloudflare бесплатный (Bandwidth Alliance).
R2 проще в поддержке, поэтому основной вариант — перенос.

## Шаг 4. Сгенерировать оптимизированные варианты картинок

> ✅ Уже сделано: варианты сгенерированы и залиты в R2, `content/image-manifest.json`
> закоммичен (`e3c09f4`). Пункты ниже — только для добавления новых картинок в будущем.

Один раз для существующих ~400 картинок (и потом при добавлении новых).

1. В корне проекта создать `.env` по образцу `.env.example`:

   ```sh
   PUBLIC_IMAGE_CDN=https://images.diversnotes.com
   IMAGES_S3_ENDPOINT=https://<account_id>.r2.cloudflarestorage.com
   IMAGES_S3_REGION=auto
   IMAGES_S3_BUCKET=diversnotesimages
   IMAGES_S3_KEY_ID=<Access Key ID>
   IMAGES_S3_SECRET=<Secret Access Key>
   ```

2. Запустить (можно частями через `--limit 50`):

   ```sh
   pnpm images:sync --dry-run   # посмотреть, что будет обработано
   pnpm images:sync             # скачает оригиналы, зальёт AVIF-варианты в бакет
   ```

3. Скрипт обновит `content/image-manifest.json` — закоммитить и запушить:

   ```sh
   git add content/image-manifest.json && git commit -m "chore: image variants" && git push
   ```

После этого статьи начнут отдавать лёгкие AVIF нужной ширины, а лайтбокс — оригиналы.

## Шаг 5. Сайт на Cloudflare Pages

1. Дашборд Cloudflare: **Workers & Pages → Create → Pages → Connect to Git** →
   авторизовать GitHub → выбрать репозиторий `diversnotes-astro`.
2. Настройки сборки:
   - Framework preset: **Astro**
   - Build command: `pnpm build`
   - Build output directory: `dist`
3. **Environment variables** (для Production и Preview):
   - `PUBLIC_IMAGE_CDN` = `https://images.diversnotes.com`
4. **Save and Deploy** — первый билд займёт пару минут, сайт появится на
   `<project>.pages.dev`. Проверить его.
5. Привязать домен: в проекте Pages → **Custom domains** → **Set up a custom domain** →
   `diversnotes.com`, затем ещё раз для `www.diversnotes.com` (Cloudflare сам сделает
   редирект и выпишет сертификаты).

С этого момента каждый `git push` в `main` автоматически пересобирает и выкладывает сайт.

## Шаг 6. Кэш картинок (по желанию, но стоит)

Custom domain у R2 уже кэшируется, но можно прижать сильнее:

1. Cloudflare → домен → **Caching → Cache Rules → Create rule**:
   - When: `Hostname equals images.diversnotes.com`
   - Then: **Cache eligibility: Eligible for cache**, Edge TTL: **1 month**,
     Browser TTL: **1 month**.

Варианты и так заливаются с `Cache-Control: immutable`, правило добавляет кэш и оригиналам.

## Шаг 7. Финальная проверка

- [ ] `https://diversnotes.com` открывается, обе языковые версии работают (`/en`)
- [ ] Картинки грузятся с `images.diversnotes.com` (видно в DevTools → Network),
      в статьях приходят `.avif`
- [ ] Поиск работает (⌘K), карта открывается, тёмная тема переключается
- [ ] `https://diversnotes.com/rss.xml` и `/sitemap-index.xml` отвечают
- [ ] Лайтбокс по клику открывает оригинал
- [ ] В Google Search Console обновить sitemap: `https://diversnotes.com/sitemap-index.xml`

## Шаг 8. Прибраться

- Удалить проект на Vercel (Dashboard → проект → Settings → Delete Project).
- Backblaze: после переноса и пары недель проверки — удалить бакет, чтобы не платить.
- Аналитика: `@vercel/analytics` больше нет; включить бесплатную
  **Cloudflare Web Analytics**. ✅ Сниппет уже вшит в `src/layouts/BaseLayout.astro`
  (`c5eeb1b`) и подключается автоматически при заданном токене. Осталось:
  1. Dashboard → Analytics → Web Analytics → **Add site** для `diversnotes.com`.
  2. В проекте Pages → **Settings → Environment variables** добавить
     `PUBLIC_CF_ANALYTICS_TOKEN` со значением токена из выданного Cloudflare сниппета
     (`data-cf-beacon` → `token`) и пересобрать.

  Без переменной скрипт не грузится (в т.ч. в dev).

---

## Как добавлять контент после деплоя

1. Новая статья: `content/blog/ru/<slug>.md` (+ перевод в `en/`), фронтматтер как у соседей.
2. Картинки: залить оригиналы в бакет (через дашборд R2 или `rclone`), в markdown
   вставить обычные ссылки `https://images.diversnotes.com/<путь>`.
3. `pnpm images:sync` → закоммитить манифест.
4. `git push` — Cloudflare Pages соберёт и выложит сам.
