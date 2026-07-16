import type { APIRoute } from "astro";
import { buildRss } from "@/lib/rss";

export const GET: APIRoute = (context) => buildRss("ru", context.site!);
