import { z } from "zod";
import type { CreatePollData, UpdatePollData, PollActionResult } from "../types/poll";

// Validation schemas
export const pollFormSchema = z.object({
  title: z
    .string()
    .min(5, "Title must be at least 5 characters long")
    .max(200, "Title must be at most 200 characters long")
    .trim(),
  description: z
    .string()
    .max(1000, "Description must be at most 1000 characters long")
    .optional()
    .transform(val => val?.trim() || undefined),
  options: z
    .array(z.object({ 
      text: z
        .string()
        .min(1, "Option cannot be empty")
        .max(100, "Option must be at most 100 characters long")
        .trim()
    }))
    .min(2, "You must provide at least two options")
    .max(10, "You cannot have more than 10 options")
    .refine(
      (options) => {
        const texts = options.map(opt => opt.text.toLowerCase());
        return new Set(texts).size === texts.length;
      },
      "All options must be unique"
    ),
});

export const updatePollSchema = z.object({
  title: z
    .string()
    .min(5, "Title must be at least 5 characters long")
    .max(200, "Title must be at most 200 characters long")
    .trim(),
  description: z
    .string()
    .max(1000, "Description must be at most 1000 characters long")
    .optional()
    .transform(val => val?.trim() || undefined),
  options: z
    .array(z.object({ 
      id: z.string().optional(),
      text: z
        .string()
        .min(1, "Option cannot be empty")
        .max(100, "Option must be at most 100 characters long")
        .trim()
    }))
    .min(2, "You must provide at least two options")
    .max(10, "You cannot have more than 10 options")
    .refine(
      (options) => {
        const texts = options.map(opt => opt.text.toLowerCase());
        return new Set(texts).size === texts.length;
      },
      "All options must be unique"
    ),
});

/**
 * Validate poll creation data from FormData
 * @param formData - Form data from the client
 * @returns Validation result with parsed data or errors
 */
export function validateCreatePollData(formData: FormData): {
  success: boolean;
  data?: CreatePollData;
  errors?: Record<string, string[]>;
} {
  const rawFormData = {
    title: formData.get("title"),
    description: formData.get("description") || undefined,
    options: Array.from(formData.getAll("options")).map((o) => ({
      text: o.toString(),
    })),
  };

  const result = pollFormSchema.safeParse(rawFormData);

  if (!result.success) {
    return {
      success: false,
      errors: result.error.flatten().fieldErrors,
    };
  }

  return {
    success: true,
    data: result.data,
  };
}

/**
 * Validate poll update data from FormData
 * @param formData - Form data from the client
 * @returns Validation result with parsed data or errors
 */
export function validateUpdatePollData(formData: FormData): {
  success: boolean;
  data?: UpdatePollData;
  errors?: Record<string, string[]>;
} {
  const rawFormData = {
    title: formData.get("title"),
    description: formData.get("description") || undefined,
    options: JSON.parse(formData.get("options") as string || "[]"),
  };

  const result = updatePollSchema.safeParse(rawFormData);

  if (!result.success) {
    return {
      success: false,
      errors: result.error.flatten().fieldErrors,
    };
  }

  return {
    success: true,
    data: result.data as UpdatePollData,
  };
}

/**
 * Sanitize text input to prevent XSS and normalize whitespace
 * @param input - Raw text input
 * @returns Sanitized text
 */
export function sanitizeText(input: string): string {
  return input
    .trim()
    .replace(/\s+/g, ' ') // Normalize whitespace
    .replace(/[<>]/g, ''); // Basic XSS protection
}

/**
 * Validate and sanitize poll options
 * @param options - Array of poll options
 * @returns Cleaned and validated options
 */
export function validateAndSanitizeOptions(options: { text: string }[]): { text: string }[] {
  return options
    .map(option => ({
      text: sanitizeText(option.text)
    }))
    .filter(option => option.text.length > 0);
}
