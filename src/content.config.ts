import { glob } from 'astro/loaders';
import { defineCollection } from 'astro:content';
import { z } from 'astro/zod';

import { cities, milestoneKinds } from '@/islands/journey/types';

const caseStudies = defineCollection({
  loader: glob({ pattern: '**/*.mdx', base: './src/content/case-studies' }),
  schema: z.object({
    title: z.string(),
    summary: z.string(),
    order: z.number().int(),
    demo: z.enum(['pipeline', 'grounding', 'playground', 'escrow']),
    demoTitle: z.string(),
    context: z.string(),
    tags: z.array(z.string()).default([]),
    numbers: z.array(z.object({ value: z.string(), label: z.string() })).default([]),
  }),
});

const journey = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/journey' }),
  schema: z.object({
    title: z.string(),
    date: z.string(),
    city: z.enum(cities),
    kind: z.enum(milestoneKinds),
    order: z.number().int(),
  }),
});

const pages = defineCollection({
  loader: glob({ pattern: '**/*.mdx', base: './src/content/pages' }),
  schema: z.object({ title: z.string() }),
});

const blog = defineCollection({
  loader: glob({ pattern: '**/*.mdx', base: './src/content/blog' }),
  schema: z.object({
    title: z.string(),
    summary: z.string(),
    date: z.coerce.date(),
    draft: z.boolean().default(false),
  }),
});

export const collections = { caseStudies, journey, pages, blog };
