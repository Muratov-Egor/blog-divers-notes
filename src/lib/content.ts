import { getCollection, type CollectionEntry } from "astro:content";
import type { Locale } from "./i18n";
import tagsJson from "../../content/tags.json";

export type BlogPost = CollectionEntry<"blog">;
export type MarineEntry = CollectionEntry<"marineLife">;

export interface TagMeta {
  slug: string;
  ru: string;
  en: string;
}

export const allTags = tagsJson as TagMeta[];

export function tagBySlug(slug: string): TagMeta | undefined {
  return allTags.find((t) => t.slug === slug);
}

export function tagByName(name: string): TagMeta | undefined {
  return allTags.find((t) => t.ru === name || t.en === name);
}

export function tagLabel(name: string, locale: Locale): string {
  const meta = tagByName(name);
  return meta ? meta[locale] : name;
}

/** Published blog posts for a locale, newest first. */
export async function getBlogPosts(locale: Locale): Promise<BlogPost[]> {
  const posts = await getCollection(
    "blog",
    (p) => p.filePath?.includes(`/blog/${locale}/`) && !p.data.draft,
  );
  return posts.sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf());
}

/** Marine life entries for a locale, sorted by title. */
export async function getMarineLife(locale: Locale): Promise<MarineEntry[]> {
  const entries = await getCollection("marineLife", (e) =>
    e.filePath?.includes(`/marine-life/${locale}/`),
  );
  return entries.sort((a, b) => a.data.title.localeCompare(b.data.title));
}

/** Reading time in minutes at ~180 wpm (Cyrillic-friendly). */
export function readingTime(body: string | undefined): number {
  const words = (body ?? "").split(/\s+/).length;
  return Math.max(1, Math.round(words / 180));
}

/** Related posts: same series (10 pts) + shared tags (3 pts each). */
export function relatedPosts(post: BlogPost, all: BlogPost[], limit = 3): BlogPost[] {
  return all
    .filter((p) => p.data.slug !== post.data.slug)
    .map((p) => {
      let score = 0;
      if (post.data.series && p.data.series === post.data.series) score += 10;
      score += p.data.tags.filter((t) => post.data.tags.includes(t)).length * 3;
      return { post: p, score };
    })
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((r) => r.post);
}
