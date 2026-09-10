import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const projects = defineCollection({
  loader: glob({
    pattern: '**/*.mdoc',
    base: './src/content/projects',
    // Keep every source record so duplicate canonical IDs/slugs can be rejected.
    // This loader key is internal; data.id is the stable domain identity.
    generateId: ({ entry }) => entry,
  }),
  schema: ({ image }) =>
    z.object({
      id: z
        .string()
        .regex(/^project-[0-9]{4,}$/, 'Use a stable ID such as project-0001.'),
      slug: z
        .string()
        .regex(
          /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
          'Use a lowercase URL slug with hyphens.',
        ),
      title: z.string().trim().min(1),
      summary: z.string().trim().min(1),
      status: z.enum(['draft', 'published', 'archived']),
      publishedAt: z.coerce.date(),
      hero: z.object({
        src: image(),
        alt: z.string().trim().min(1),
        caption: z.string().trim().min(1).optional(),
        credit: z.string().trim().min(1).optional(),
      }),
    }),
});

export const collections = { projects };
