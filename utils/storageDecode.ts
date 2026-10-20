/**
 * Decoders for values that leave and re-enter the extension.
 *
 * `storage.local` is an I/O boundary: keys can be missing, written by an older
 * build, or edited by hand. Readers go through a schema so they branch on a
 * decoded domain value instead of on `typeof`, and malformed data never reaches
 * application state.
 */
import { z } from "zod";

/** Parse a boundary value, or `undefined` when it does not match the schema. */
export const decodeStored = <T>(
  schema: z.ZodType<T>,
  value: any,
): T | undefined => {
  const parsed = schema.safeParse(value);

  return parsed.success ? parsed.data : undefined;
};

export const storedBoolean = z.boolean();
export const storedNumber = z.number();
export const storedString = z.string();
export const storedBooleanRecord = z.record(z.string(), z.boolean());
export const storedNumberRecord = z.record(z.string(), z.number());

const trackingStatSchema = z.object({
  visits: z.number(),
  score: z.number(),
  lastVisited: z.number(),
});

export const trackingStatsSchema = z.record(z.string(), trackingStatSchema);
