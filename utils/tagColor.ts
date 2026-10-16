import React from "react";

export type TagColorMode = "none" | "v1";

export const TAG_COLOR_MODES: readonly TagColorMode[] = ["none", "v1"];

export const TAG_COLOR_MODE_LABELS: Record<TagColorMode, string> = {
  none: "None",
  v1: "v1 (colored)",
};

// RGB triples for the v1 palette (Tailwind-500-ish hues), so tinted
// backgrounds can be applied as inline styles and are not dependent on the
// Tailwind class scanner picking up dynamically-built utility names.
const V1_PALETTE: readonly string[] = [
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
];

function hashTag(tag: string): number {
  let hash = 2166136261;

  for (let i = 0; i < tag.length; i++) {
    hash ^= tag.charCodeAt(i);
    hash = (hash * 16777619) >>> 0;
  }

  return hash;
}

function pickRgb(mode: TagColorMode, tag: string): string | null {
  if (mode !== "v1") return null;

  return V1_PALETTE[hashTag(tag.toLowerCase()) % V1_PALETTE.length] ?? null;
}

export function tagCapsuleStyle(
  mode: TagColorMode,
  tag: string,
): React.CSSProperties | undefined {
  const rgb = pickRgb(mode, tag);

  if (!rgb) return undefined;

  return { backgroundColor: `rgb(${rgb} / 0.18)` };
}

export function tagCountStyle(
  mode: TagColorMode,
  tag: string,
): React.CSSProperties | undefined {
  const rgb = pickRgb(mode, tag);

  if (!rgb) return undefined;

  return { backgroundColor: `rgb(${rgb} / 0.30)` };
}

export function tagTitleStyle(
  mode: TagColorMode,
  tag: string,
): React.CSSProperties | undefined {
  const rgb = pickRgb(mode, tag);

  if (!rgb) return undefined;

  return { backgroundColor: `rgb(${rgb} / 0.22)` };
}

export function tagTitleClass(mode: TagColorMode, tag: string): string {
  return pickRgb(mode, tag) ? "" : "";
}
