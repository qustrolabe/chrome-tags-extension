import { useMemo } from "react";
import { formatUrlParam, parseUrlParams } from "@/utils/url.ts";

interface UrlParamsProps {
  url: string;
}

/** Long values are elided; the full pair stays in the tooltip. */
const MAX_CHARS = 42;

/**
 * Read-only explorer for the current URL's query string.
 *
 * Recomputes on every keystroke in the URL field, so it doubles as a live
 * validity check: while a URL is half-typed it shows "none" rather than
 * throwing.
 */
export default function UrlParams({ url }: UrlParamsProps) {
  const params = useMemo(() => parseUrlParams(url), [url]);

  return (
    <div>
      <label className="mb-1 block text-xs font-medium">
        URL params
        <span className="ml-1 font-normal text-muted-foreground">
          — {params.length === 1 ? "1 parameter" : `${params.length} parameters`}
        </span>
      </label>

      {params.length === 0 ? (
        <div className="rounded-md border border-dashed border-border px-2 py-1 text-xs text-muted-foreground">
          No query parameters
        </div>
      ) : (
        <div className="scrollbar-slim flex max-h-16 flex-wrap gap-1 overflow-y-auto rounded-md border border-border bg-input/40 p-1">
          {params.map((param, index) => {
            const shown = formatUrlParam(param);
            const truncated =
              shown.length > MAX_CHARS ? `${shown.slice(0, MAX_CHARS)}…` : shown;
            return (
              <span
                key={`${param.key}-${index}`}
                title={shown}
                className="max-w-full truncate rounded-[3px] bg-secondary px-1.5 py-0.5 font-mono text-[10px] text-secondary-foreground"
              >
                <span className="text-primary">{truncated}</span>
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}