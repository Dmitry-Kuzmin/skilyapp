import { defineCollection, z } from 'astro:content';

const blog = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string(),
    pubDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    canonical: z.string(),
    ogImage: z.string().optional(),
    author: z.string().default('Команда Sdadim'),
    tags: z.array(z.string()).default([]),
    readingTime: z.number().optional(),
  }),
});

export const collections = { blog };
