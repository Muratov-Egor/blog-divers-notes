import { visit } from "unist-util-visit";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const manifestPath = fileURLToPath(
  new URL("../../content/image-manifest.json", import.meta.url),
);
const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));

const CDN = (
  process.env.PUBLIC_IMAGE_CDN ??
  "https://f003.backblazeb2.com/file/diversnotes-images"
).replace(/\/$/, "");

const B2_PREFIXES = [
  "https://f003.backblazeb2.com/file/diversnotes-images/",
  "https://diversnotes-images.s3.eu-central-003.backblazeb2.com/",
];

function bucketKey(url) {
  for (const prefix of B2_PREFIXES) {
    if (url.startsWith(prefix)) return url.slice(prefix.length);
  }
  return null;
}

/**
 * Rewrites bucket image URLs in markdown to the CDN host, adds lazy loading,
 * and — when pre-generated variants exist in the image manifest — a srcset.
 */
export function rehypeImages() {
  return (tree) => {
    visit(tree, "element", (node) => {
      if (node.tagName !== "img" || typeof node.properties?.src !== "string")
        return;

      const key = bucketKey(node.properties.src);
      node.properties.loading = "lazy";
      node.properties.decoding = "async";
      if (!key) return;

      const entry = manifest[key];
      if (entry?.variants?.length) {
        const largest = entry.variants[entry.variants.length - 1];
        node.properties.src = `${CDN}/${largest.file}`;
        node.properties.srcSet = entry.variants
          .map((v) => `${CDN}/${v.file} ${v.w}w`)
          .join(", ");
        node.properties.sizes = "(max-width: 768px) 100vw, 720px";
        node.properties.width = entry.width;
        node.properties.height = entry.height;
      } else {
        node.properties.src = `${CDN}/${key}`;
      }
    });
  };
}
