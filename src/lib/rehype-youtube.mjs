import { visit } from "unist-util-visit";

const YT_TAG = /<YouTube\s+id=["']([\w-]+)["']\s*\/?>(?:\s*<\/YouTube>)?/gi;

function embed(id, lang) {
  return (
    `<iframe class="yt-embed" src="https://www.youtube-nocookie.com/embed/${id}?hl=${lang}"` +
    ` title="YouTube video" loading="lazy" allowfullscreen` +
    ` allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"></iframe>`
  );
}

/**
 * Content still uses the old MDX <YouTube id="..." /> tag. The markdown
 * pipeline passes it through as a raw-HTML node; browsers then treat it as an
 * unknown empty element. Rewrite it into a responsive iframe embed. Player UI
 * language follows the content locale (from the file path), not the browser.
 * Note: the content-layer cache (.astro/) must be cleared for plugin changes
 * to apply to already-rendered markdown.
 */
export function rehypeYoutube() {
  return (tree, file) => {
    const lang = String(file?.path ?? "").includes("/en/") ? "en" : "ru";
    visit(tree, "raw", (node) => {
      if (node.value?.includes("<YouTube")) {
        node.value = node.value.replace(YT_TAG, (_, id) => embed(id, lang));
      }
    });
  };
}
