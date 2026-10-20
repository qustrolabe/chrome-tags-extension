import type { FilterToken } from "@queryfield/core";
import {
  defaultCapsuleClassName,
  defaultTokenClassName,
} from "@queryfield/react";

/**
 * Colours for the app-local `last_visited` key.
 *
 * The package's default maps only cover the bookmark preset, so a host key
 * falls back to the neutral action colour. `last_visited` is tracking data with
 * the same provenance as `visits` / `frecency`, so it wears the tracking colour
 * in both places it can show up: the suggestion capsule (the key row and its
 * date-value rows both carry the spec's label as category) and the painted
 * token in the field.
 */
const LAST_VISITED_LABEL = "last visited";
const TRACKING_CAPSULE = "bg-token-tracking-pill text-token-tracking";

export const suggestionCapsuleClassName = (category?: string): string =>
  category === LAST_VISITED_LABEL
    ? TRACKING_CAPSULE
    : defaultCapsuleClassName(category);

/*
 * Borrowing `visits`' lookup keeps the capsule geometry and the negated styling
 * (line-through, dimmed) in the package, where they live; `TOKEN_CAPSULE` is
 * not exported, so re-spelling it here would drift.
 */
export const tokenClassName = (token: FilterToken): string =>
  token.key === "last_visited"
    ? defaultTokenClassName({ ...token, key: "visits" })
    : defaultTokenClassName(token);
