#!/usr/bin/env node
/**
 * Pre-generates responsive image variants and uploads them to the bucket.
 *
 * Scans content/ for bucket image URLs, and for every image not yet in
 * content/image-manifest.json:
 *   1. downloads the original,
 *   2. generates AVIF variants at several widths with sharp,
 *   3. uploads them next to the original under `_opt/<key>/w<width>.avif`,
 *   4. records dimensions + variant list in the manifest (committed to git).
 *
 * The site then serves <img srcset> from the manifest — no runtime image
 * optimization anywhere, so it costs nothing and never hits plan limits.
 *
 * Requires S3-compatible credentials in the environment (.env is fine):
 *   IMAGES_S3_ENDPOINT   e.g. https://<account>.r2.cloudflarestorage.com
 *                         or  https://s3.eu-central-003.backblazeb2.com
 *   IMAGES_S3_REGION     e.g. auto (R2) / eu-central-003 (B2)
 *   IMAGES_S3_BUCKET     e.g. diversnotes-images
 *   IMAGES_S3_KEY_ID
 *   IMAGES_S3_SECRET
 *
 * Usage: pnpm images:sync [--dry-run] [--limit N]
 */
import { readFile, writeFile, readdir } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const WIDTHS = [480, 800, 1200, 1920];
const QUALITY = 60; // AVIF; visually near-lossless for photos
// Where to download originals from: the CDN domain once images live behind it,
// falling back to the legacy Backblaze endpoint.
const SOURCE_HOST =
  (process.env.PUBLIC_IMAGE_CDN?.replace(/\/$/, "") ??
    "https://f003.backblazeb2.com/file/diversnotes-images") + "/";
const MANIFEST = new URL("../content/image-manifest.json", import.meta.url);

const dryRun = process.argv.includes("--dry-run");
const limitArg = process.argv.indexOf("--limit");
const limit = limitArg > -1 ? Number(process.argv[limitArg + 1]) : Infinity;

async function* mdFiles(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) yield* mdFiles(full);
    else if (/\.(md|json)$/.test(entry.name)) yield full;
  }
}

async function collectKeys() {
  const keys = new Set();
  const re =
    /https:\/\/(?:f003\.backblazeb2\.com\/file\/diversnotes-images|diversnotes-images\.s3\.eu-central-003\.backblazeb2\.com)\/([^\s"')]+)/g;
  const contentDir = new URL("../content", import.meta.url).pathname;
  for await (const file of mdFiles(contentDir)) {
    const text = await readFile(file, "utf8");
    for (const m of text.matchAll(re)) keys.add(decodeURIComponent(m[1]));
  }
  return [...keys];
}

function s3() {
  const { IMAGES_S3_ENDPOINT, IMAGES_S3_REGION, IMAGES_S3_KEY_ID, IMAGES_S3_SECRET } =
    process.env;
  if (!IMAGES_S3_ENDPOINT || !IMAGES_S3_KEY_ID || !IMAGES_S3_SECRET) {
    console.error("Missing IMAGES_S3_* environment variables — see script header.");
    process.exit(1);
  }
  return new S3Client({
    endpoint: IMAGES_S3_ENDPOINT,
    region: IMAGES_S3_REGION ?? "auto",
    credentials: {
      accessKeyId: IMAGES_S3_KEY_ID,
      secretAccessKey: IMAGES_S3_SECRET,
    },
  });
}

const manifest = JSON.parse(await readFile(MANIFEST, "utf8"));
const keys = await collectKeys();
const pending = keys.filter((k) => !manifest[k]).slice(0, limit);
console.log(`${keys.length} images in content, ${pending.length} to process`);

if (dryRun) {
  pending.forEach((k) => console.log("  " + k));
  process.exit(0);
}

const client = pending.length ? s3() : null;
const bucket = process.env.IMAGES_S3_BUCKET ?? "diversnotes-images";

for (const key of pending) {
  try {
    const res = await fetch(SOURCE_HOST + encodeURI(key));
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const original = Buffer.from(await res.arrayBuffer());
    const meta = await sharp(original).metadata();

    const variants = [];
    for (const w of WIDTHS.filter((w) => w <= meta.width)) {
      const buf = await sharp(original)
        .resize(w)
        .avif({ quality: QUALITY })
        .toBuffer();
      const file = `_opt/${key.replace(/\.[^.]+$/, "")}/w${w}.avif`;
      await client.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: file,
          Body: buf,
          ContentType: "image/avif",
          CacheControl: "public, max-age=31536000, immutable",
        }),
      );
      variants.push({ w, file });
    }
    // Always keep at least one variant so small images get AVIF too.
    if (variants.length === 0) {
      const buf = await sharp(original).avif({ quality: QUALITY }).toBuffer();
      const file = `_opt/${key.replace(/\.[^.]+$/, "")}/w${meta.width}.avif`;
      await client.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: file,
          Body: buf,
          ContentType: "image/avif",
          CacheControl: "public, max-age=31536000, immutable",
        }),
      );
      variants.push({ w: meta.width, file });
    }

    manifest[key] = { width: meta.width, height: meta.height, variants };
    await writeFile(MANIFEST, JSON.stringify(manifest, null, 2) + "\n");
    console.log(`✓ ${key} (${variants.length} variants)`);
  } catch (err) {
    console.error(`✗ ${key}: ${err.message}`);
  }
}
