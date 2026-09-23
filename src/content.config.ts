import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';
import { mediaId, mediaSchema } from './content/media/schema';

const mediaFiles = glob({
  pattern: '*.json',
  base: './src/content/media',
  generateId: ({ entry }) => entry,
});
const media = defineCollection({
  loader: {
    name: 'published-media-files',
    async load(context) {
      // Astro's glob loader returns early on an empty directory. Clear cached records
      // first so deleting the last catalog file cannot leave a phantom reference.
      context.store.clear();
      await mediaFiles.load(context);
    },
  },
  schema: mediaSchema,
});

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
      topic: z.string().trim().min(1).max(60),
      authorId: z
        .string()
        .regex(/^author-[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Use a stable author ID.'),
      status: z.enum(['draft', 'published', 'archived']),
      publishedAt: z.coerce.date(),
      sidebarPoster: z
        .object({
          illustration: image(),
          quote: z.string().trim().min(1),
        })
        .strict()
        .optional(),
      hero: z.union([
        z.object({ mediaId }).strict(),
        z
          .object({
            src: image(),
            alt: z.string().trim().min(1),
            caption: z.string().trim().min(1).optional(),
            credit: z.string().trim().min(1).optional(),
          })
          .strict(),
      ]),
      galleryId: z
        .string()
        .regex(/^album-[0-9]{4,}$/)
        .optional(),
      gallery: z.never().optional(),
    }),
});

const albums = defineCollection({
  loader: glob({
    pattern: '*.mdoc',
    base: './src/content/albums',
    generateId: ({ entry }) => entry,
  }),
  schema: ({ image }) =>
    z
      .object({
        id: z.string().regex(/^album-[0-9]{4,}$/),
        slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
        title: z.string().trim().min(1),
        description: z.string().trim().min(1),
        status: z.enum(['draft', 'published', 'archived']),
        publishedAt: z.coerce.date(),
        projectId: z
          .string()
          .regex(/^project-[0-9]{4,}$/)
          .optional(),
        images: z
          .array(
            z.union([
              z.object({ mediaId }).strict(),
              z
                .object({
                  src: image(),
                  alt: z.string().trim().min(1),
                  caption: z.string().trim().min(1).optional(),
                  credit: z.string().trim().min(1).optional(),
                })
                .strict(),
            ]),
          )
          .min(1),
      })
      .strict(),
});

const saleItems = defineCollection({
  loader: glob({
    pattern: '*.mdoc',
    base: './src/content/sale-items',
    generateId: ({ entry }) => entry,
  }),
  schema: ({ image }) =>
    z
      .object({
        id: z.string().regex(/^sale-[0-9]{4,}$/),
        slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
        title: z.string().trim().min(1),
        summary: z.string().trim().min(1),
        category: z.string().trim().min(1),
        status: z.enum(['draft', 'published', 'archived']),
        sample: z.boolean().default(false),
        imagePresentation: z.enum(['photo', 'cutout']).default('photo'),
        unique: z.boolean().default(false),
        availability: z.enum(['available', 'reserved', 'sold']),
        priceCzk: z.number().int().nonnegative().optional(),
        salePriceCzk: z.number().int().nonnegative().optional(),
        variants: z
          .array(
            z
              .object({
                id: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
                label: z.string().trim().min(1),
                priceCzk: z.number().int().nonnegative(),
                salePriceCzk: z.number().int().nonnegative().optional(),
              })
              .strict()
              .refine(
                (v) =>
                  v.salePriceCzk === undefined || v.salePriceCzk < v.priceCzk,
                {
                  message:
                    'Variant discount must be lower than its original price',
                  path: ['salePriceCzk'],
                },
              ),
          )
          .min(1)
          .optional(),
        condition: z.string().trim().min(1),
        handover: z.string().trim().min(1),
        images: z
          .array(
            z.union([
              z.object({ mediaId }).strict(),
              z
                .object({
                  src: image(),
                  alt: z.string().trim().min(1),
                  caption: z.string().trim().min(1).optional(),
                })
                .strict(),
            ]),
          )
          .min(1),
      })
      .strict()
      .refine(
        (item) =>
          item.salePriceCzk === undefined ||
          (item.priceCzk !== undefined && item.salePriceCzk < item.priceCzk),
        {
          message:
            'salePriceCzk requires priceCzk and must be lower than the original price',
          path: ['salePriceCzk'],
        },
      )
      .superRefine((item, ctx) => {
        if (!item.variants) return;
        if (item.priceCzk !== undefined || item.salePriceCzk !== undefined)
          ctx.addIssue({
            code: 'custom',
            message: 'Variant products must keep prices on variants only',
            path: ['variants'],
          });
        const ids = new Set<string>();
        item.variants.forEach((variant, index) => {
          if (ids.has(variant.id))
            ctx.addIssue({
              code: 'custom',
              message: 'Duplicate variant ID',
              path: ['variants', index, 'id'],
            });
          ids.add(variant.id);
        });
      }),
});

const workshops = defineCollection({
  loader: glob({
    pattern: '*.mdoc',
    base: './src/content/workshops',
    generateId: ({ entry }) => entry,
  }),
  schema: ({ image }) =>
    z
      .object({
        id: z.string().regex(/^workshop-[0-9]{4,}$/),
        slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
        status: z.enum(['draft', 'published', 'archived']),
        title: z.string().trim().min(1),
        category: z.string().trim().min(1),
        summary: z.string().trim().min(1),
        hero: z.union([
          z.object({ mediaId }).strict(),
          z.object({ src: image(), alt: z.string().trim().min(1) }).strict(),
        ]),
        hostIds: z
          .array(z.string().regex(/^author-[a-z0-9]+(?:-[a-z0-9]+)*$/))
          .min(1)
          .max(2)
          .refine(
            (ids) => new Set(ids).size === ids.length,
            'Workshop hosts must be distinct.',
          ),
        event: z.discriminatedUnion('state', [
          z.object({ state: z.literal('preparing') }).strict(),
          z
            .object({
              state: z.enum(['open', 'full', 'ended']),
              startsAt: z.iso.datetime({ offset: true }),
              endsAt: z.iso.datetime({ offset: true }),
              location: z.string().trim().min(1),
              capacity: z.number().int().positive(),
              reserved: z.number().int().nonnegative(),
            })
            .strict(),
        ]),
      })
      .strict(),
});
export const collections = { projects, media, albums, saleItems, workshops };
