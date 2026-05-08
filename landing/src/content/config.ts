import { defineCollection, z } from "astro:content";

const blog = defineCollection({
  type: "content",
  schema: z.object({
    slug: z.string(),
    lang: z.enum(["ru", "en", "es"]),
    title: z.string(),
    description: z.string(),
  }),
});

export const collections = { blog };
