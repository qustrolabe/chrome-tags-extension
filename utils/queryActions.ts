import { serializeToken, type TokenActionProvider } from "@queryfield/core";
import { appRegistry } from "@/utils/queryRegistry.ts";

/**
 * Key pairs whose meaning has a sibling, plus the row that converts a token
 * between them.
 *
 * The rewrite swaps only the key, so the value, its quoting and the negation
 * stay put (`serializeToken`). Labels and capsules come from the registry, so a
 * converted row wears the colours of the key it is about to insert.
 */
const CONVERSIONS = [
  {
    from: "folder",
    to: "folder_strict",
    comment: "this folder directly, not deeper",
  },
  {
    from: "folder_strict",
    to: "folder",
    comment: "this folder or any subfolder",
  },
  {
    from: "last_used",
    to: "last_visited",
    comment: "when this extension last saw it open",
  },
  {
    from: "last_visited",
    to: "last_used",
    comment: "the browser's own last-opened time",
  },
];

/**
 * Adds a "Convert to …" row to the token dropdown for the pairs above. Every
 * other key keeps just the built-in rows.
 */
export const tokenActions: TokenActionProvider = ({ token }, defaults) => {
  const conversion = CONVERSIONS.find((entry) => entry.from === token.key);

  if (!conversion) return defaults;

  const target = appRegistry.get(conversion.to);
  const label = target?.label ?? conversion.to;

  return [
    ...defaults,
    {
      id: `convert:${conversion.to}`,
      label: `Convert to ${label}`,
      category: label,
      comment: conversion.comment,
      tone: "action",
      insert: serializeToken({ ...token, key: conversion.to }),
    },
  ];
};
