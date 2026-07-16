import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

const blog = defineCollection({
  loader: glob({
    pattern: "**/*.md",
    base: "./content/blog",
    generateId: ({ entry }) => entry.replace(/\.md$/, ""),
  }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    slug: z.string(),
    date: z.coerce.date(),
    updatedAt: z.coerce.date().optional(),
    cover: z.string().optional(),
    tags: z.array(z.string()).default([]),
    draft: z.boolean().default(false),
    series: z.string().optional(),
  }),
});

const marineLife = defineCollection({
  loader: glob({
    pattern: "**/*.md",
    base: "./content/marine-life",
    generateId: ({ entry }) => entry.replace(/\.md$/, ""),
  }),
  schema: z.object({
    slug: z.string(),
    title: z.string(),
    nameEn: z.string().optional(),
    latinName: z.string().optional(),
    description: z.string(),
    depthRange: z.string().optional(),
    locations: z.array(z.string()).default([]),
    images: z.array(z.string()).default([]),
    tags: z.array(z.string()).default([]),
    size: z.string().optional(),
    family: z.string().optional(),
    category: z.string().optional(),
    activity: z.string().optional(),
    conservationStatus: z.string().optional(),
  }),
});

export const collections = { blog, marineLife };
