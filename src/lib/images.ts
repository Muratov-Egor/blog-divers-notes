import manifest from "../../content/image-manifest.json";

type Variant = { w: number; file: string };
type ManifestEntry = {
  width: number;
  height: number;
  variants: Variant[];
};

const entries = manifest as Record<string, ManifestEntry>;

export const IMAGE_CDN =
  import.meta.env.PUBLIC_IMAGE_CDN?.replace(/\/$/, "") ??
  "https://f003.backblazeb2.com/file/diversnotes-images";

const B2_PREFIXES = [
  "https://f003.backblazeb2.com/file/diversnotes-images/",
  "https://diversnotes-images.s3.eu-central-003.backblazeb2.com/",
];

/** Bucket-relative key for a known image URL, or null for foreign URLs. */
export function imageKey(url: string): string | null {
  for (const prefix of B2_PREFIXES) {
    if (url.startsWith(prefix)) return url.slice(prefix.length);
  }
  if (url.startsWith(IMAGE_CDN + "/")) return url.slice(IMAGE_CDN.length + 1);
  return null;
}

export interface ResolvedImage {
  src: string;
  srcset?: string;
  width?: number;
  height?: number;
}

/**
 * Resolve an image URL from content to what the site should serve.
 * - Foreign URLs pass through untouched.
 * - Bucket URLs are rewritten to the CDN host.
 * - If pre-generated variants exist in the manifest, a srcset is returned.
 */
export function resolveImage(url: string): ResolvedImage {
  const key = imageKey(url);
  if (!key) return { src: url };

  const entry = entries[key];
  if (!entry || entry.variants.length === 0) {
    return { src: `${IMAGE_CDN}/${key}` };
  }

  const srcset = entry.variants
    .map((v) => `${IMAGE_CDN}/${v.file} ${v.w}w`)
    .join(", ");
  const largest = entry.variants[entry.variants.length - 1];
  return {
    src: `${IMAGE_CDN}/${largest.file}`,
    srcset,
    width: entry.width,
    height: entry.height,
  };
}

export const CONTENT_SIZES = "(max-width: 768px) 100vw, 720px";
