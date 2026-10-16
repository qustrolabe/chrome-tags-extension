export type TagColorMode = "none" | "v1";

export const TAG_COLOR_MODES: readonly TagColorMode[] = ["none", "v1"];

export const TAG_COLOR_MODE_LABELS: Record<TagColorMode, string> = {
  none: "None",
  v1: "v1 (colored)",
};

const V1_PALETTE = [
  "244 63 94",
  "249 115 22",
  "245 158 11",
  "234 179 8",
  "132 204 22",
  "34 197 94",
  "16 185 129",
  "20 184 166",
  "6 182 212",
  "14 165 233",
  "59 130 246",
  "99 102 241",
  "139 92 246",
  "168 85 247",
  "217 70 239",
  "236 72 153",
  "100 116 139",
] as const;

function hashTag(tag: string): number {
  let hash = 2166136261;

  for (let i = 0; i < tag.length; i++) {
    hash ^= tag.charCodeAt(i);
    hash = (hash * 16777619) >>> 0;
  }

  return hash;
}

export function tagColorClass(mode: TagColorMode, tag: string): string {
  if (mode !== "v1") return "";

  const index = hashTag(tag.toLowerCase()) % V1_PALETTE.length;

  return `tag-color-${String(index)}`;
}

// Legacy helpers for callers expecting style objects.
export function tagCapsuleStyle(mode: TagColorMode, tag: string): React.CSSProperties | undefined {
  const rgb = V1_PALETTE[hashTag(tag.toLowerCase()) % V1_PALETTE.length];

  if (mode !== "v1") return undefined;

  return { backgroundColor: `rgb(${rgb} / 0.32)` };
}

export function tagTitleStyle(mode: TagColorMode, tag: string): React.CSSProperties | undefined {
  const rgb = V1_PALETTE[hashTag(tag.toLowerCase()) % V1_PALETTE.length];

  if (mode !== "v1") return undefined;

  return { backgroundColor: `rgb(${rgb} / 0.30)` };
}
