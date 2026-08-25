/**
 * Bound parsing for date / number / id comparisons.
 *
 * Grammar of a bound value:
 *   bound       := comparison+
 *   comparison  := (">" | "<" | ">=" | "<=")? amount
 *   amount      := number unit?        // unit required for dates
 *
 * Examples:
 *   ">10"        visits greater than 10
 *   "<1w"        younger than one week (dates compare against AGE)
 *   ">2mo<1y"    older than 2 months but younger than 1 year
 *   "123"        exact match (id)
 */

export type CompareOp = ">" | "<" | ">=" | "<=" | "=";

export interface Comparison {
  op: CompareOp;
  /** Numeric value: milliseconds for durations, raw number otherwise. */
  value: number;
}

export type Bounds = Comparison[];

const UNIT_MS: Record<string, number> = {
  min: 60_000,
  h: 3_600_000,
  d: 86_400_000,
  w: 604_800_000,
  mo: 2_629_800_000, // average month (year / 12)
  y: 31_557_600_000, // average year
};

export const DATE_UNITS = Object.keys(UNIT_MS);

/** Parse a duration like "30min", "2d", "1y". Returns ms or null. */
export const parseDuration = (raw: string): number | null => {
  const m = /^(\d+(?:\.\d+)?)(min|h|d|w|mo|y)$/.exec(raw);
  if (!m || !m[1] || !m[2]) return null;
  const unitMs = UNIT_MS[m[2]];
  return parseFloat(m[1]) * (unitMs ?? 0);
};

const COMPARE_OPS = [">=", "<=", ">", "<"] as const;

const parseComparison = (
  raw: string,
  requireUnit: boolean,
): Comparison | null => {
  let op: CompareOp = "=";
  let rest = raw;

  if (rest.startsWith("=")) {
    rest = rest.slice(1);
  } else {
    const twoCharOp = COMPARE_OPS.find((candidate) => rest.startsWith(candidate));
    if (twoCharOp) {
      op = twoCharOp;
      rest = rest.slice(twoCharOp.length);
    }
  }

  const m = /^(\d+(?:\.\d+)?)(min|h|d|w|mo|y)?$/.exec(rest);
  if (!m || !m[1]) return null;
  if (requireUnit && !m[2]) return null;
  if (!requireUnit && m[2]) return null;

  const unitMs = m[2] ? UNIT_MS[m[2]] : undefined;
  const value = parseFloat(m[1]) * (unitMs ?? 1);
  return { op, value };
};

/**
 * Parse a full bounds string into a list of comparisons.
 * Returns null when nothing in the string is a valid bound.
 */
export const parseBounds = (
  raw: string,
  opts: { requireUnit: boolean },
): Bounds | null => {
  // Split into comparison chunks: each starts with an optional operator.
  const chunkRegex = /(>=|<=|=|>|<)?(\d+(?:\.\d+)?(?:min|h|d|w|mo|y)?)/g;
  const bounds: Bounds = [];
  let consumed = 0;
  let match: RegExpExecArray | null;

  while ((match = chunkRegex.exec(raw)) !== null) {
    if (match.index !== consumed) return null; // garbage between chunks
    consumed = chunkRegex.lastIndex;
    const comparison = parseComparison(match[0], opts.requireUnit);
    if (!comparison) return null;
    bounds.push(comparison);
  }

  if (bounds.length === 0 || consumed !== raw.length) return null;
  return bounds;
};

const holds = (subject: number, { op, value }: Comparison): boolean => {
  switch (op) {
    case ">":
      return subject > value;
    case "<":
      return subject < value;
    case ">=":
      return subject >= value;
    case "<=":
      return subject <= value;
    case "=":
      return subject === value;
  }
};

/**
 * Check that the subject satisfies every bound.
 */
export const matchesBounds = (
  subject: number,
  bounds: Bounds,
): boolean => bounds.every((bound) => holds(subject, bound));
