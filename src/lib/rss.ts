import rss from "@astrojs/rss";
import { t, localePath, type Locale } from "./i18n";
import { getBlogPosts } from "./content";

export async function buildRss(locale: Locale, site: URL) {
  const posts = await getBlogPosts(locale);
  return rss({
    title: "Diver's Notes",
    description: t(locale, "metadata.siteDescription"),
    site,
    items: posts.map((post) => ({
      title: post.data.title,
      description: post.data.description,
      pubDate: post.data.date,
      link: localePath(locale, `/blog/${post.data.slug}`),
    })),
    customData: `<language>${locale}</language>`,
  });
}
