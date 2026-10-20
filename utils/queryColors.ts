import type { FilterToken } from "@queryfield/core";
import {
  defaultCapsuleClassName,
  defaultTokenClassName,
} from "@queryfield/react";

/**
 * Colours for app-local labels that the package's default map cannot know.
 *
 * The package's default maps only cover the bookmark preset, so an unknown
 * capsule falls back to the neutral action colour. `last_visited` is tracking
 * data with the same provenance as `visits` / `frecency`, so it wears the
 * tracking colour in both places it can show up: the suggestion capsule (the
 * key row and its date-value rows both carry the spec's label as category) and
 * the painted token in the field.
 *
 * `folder_strict` is the opposite case: the preset labelled both folder keys
 * "folder", so before the app spelled the strict label out its capsule was
 * folder-coloured. Keep that colour instead of falling back to neutral.
 */
const LAST_VISITED_LABEL = "last visited";
const FOLDER_STRICT_LABEL = "folder strict";
const TRACKING_CAPSULE = "bg-token-tracking-pill text-token-tracking";

export const suggestionCapsuleClassName = (category?: string): string => {
  if (category === LAST_VISITED_LABEL) return TRACKING_CAPSULE;

  if (category === FOLDER_STRICT_LABEL) return defaultCapsuleClassName("folder");

  return defaultCapsuleClassName(category);
};

/*
 * Borrowing `visits`' lookup keeps the capsule geometry and the negated styling
 * (line-through, dimmed) in the package, where they live; `TOKEN_CAPSULE` is
 * not exported, so re-spelling it here would drift.
 */
export const tokenClassName = (token: FilterToken): string =>
  token.key === "last_visited"
    ? defaultTokenClassName({ ...token, key: "visits" })
    : defaultTokenClassName(token);
