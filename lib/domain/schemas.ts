import { z } from "zod";

/**
 * Form validation rules (spec §20).
 * Shared between the client forms and the server actions.
 */

export const TITLE_MAX = 120;
export const DESCRIPTION_MAX = 5000;

export const titleSchema = z
  .string()
  .trim()
  .min(1, "Title is required.")
  .max(TITLE_MAX, `Title must be ${TITLE_MAX} characters or fewer.`);

/**
 * Payload for creating or editing an item.
 * The client always sends plain strings ("" for empty description / no link).
 */
export const itemFormSchema = z.object({
  title: titleSchema,
  description: z
    .string()
    .trim()
    .max(DESCRIPTION_MAX, `Description must be ${DESCRIPTION_MAX.toLocaleString()} characters or fewer.`),
  /** Project id to link an idea to; empty string means "no project". */
  linkedProjectId: z.string(),
});

export type ItemFormValues = z.infer<typeof itemFormSchema>;
