import React, { useEffect, useMemo, useState } from "react";
import SettingsCard from "./SettingsCard";
import { useTracking } from "@/context/TrackingContext";

export default function TrackingTab() {
  const { settings, totalScore, setEnabled, setShowStats, setMaxAge, clearStats } =
    useTracking();
  const [clearConfirm, setClearConfirm] = useState(false);
  const [maxAgeInput, setMaxAgeInput] = useState(String(settings.maxAge));
  const [confirmLower, setConfirmLower] = useState<number | null>(null);

  useEffect(() => {
    setMaxAgeInput(String(settings.maxAge));
  }, [settings.maxAge]);

  const numericMaxAge = useMemo(() => {
    const parsed = Number(maxAgeInput);
    return Number.isFinite(parsed) ? Math.max(1, Math.floor(parsed)) : settings.maxAge;
  }, [maxAgeInput, settings.maxAge]);

  const progress = Math.min(1, totalScore / Math.max(1, settings.maxAge));

  const applyMaxAge = () => {
    if (numericMaxAge < settings.maxAge) {
      setConfirmLower(numericMaxAge);
      return;
    }
    setConfirmLower(null);
    setMaxAge(numericMaxAge);
  };

  const confirmLowerMaxAge = () => {
    if (confirmLower === null) return;
    setMaxAge(confirmLower);
    setConfirmLower(null);
  };

  const handleClear = () => {
    if (!clearConfirm) {
      setClearConfirm(true);
      return;
    }
    clearStats();
    setClearConfirm(false);
  };

  return (
    <section className="animate-in fade-in slide-in-from-bottom-4 space-y-8 duration-500">
      <div>
        <h2 className="mb-2 text-2xl font-bold">Tracking</h2>
        <p className="text-muted-foreground">
          Control how bookmark visits are tracked and how frecency is calculated.
        </p>
      </div>

      <div className="grid gap-6">
        <SettingsCard
          title="Tracking Status"
          description="Enable or pause visit tracking without losing existing data."
        >
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="text-sm font-medium">
                {settings.enabled ? "Tracking is enabled" : "Tracking is paused"}
              </div>
              <div className="text-xs text-muted-foreground">
                When paused, visits will not update scores or counts.
              </div>
            </div>
            <button
              type="button"
              onClick={() => setEnabled(!settings.enabled)}
              className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
                settings.enabled
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              {settings.enabled ? "Disable" : "Enable"}
            </button>
          </div>
        </SettingsCard>

        <SettingsCard
          title="Card Display"
          description="Show visit counts and frecency on bookmark cards."
        >
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="text-sm font-medium">
                {settings.showStats ? "Visible on cards" : "Hidden on cards"}
              </div>
              <div className="text-xs text-muted-foreground">
                You can toggle this later without affecting tracking data.
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowStats(!settings.showStats)}
              className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
                settings.showStats
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              {settings.showStats ? "Hide" : "Show"}
            </button>
          </div>
        </SettingsCard>

        <SettingsCard
          title="MAXAGE"
          description="When total score exceeds MAXAGE, scores are scaled down by 0.9."
        >
          <div className="space-y-4">
            <div>
              <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
                <span>Total score</span>
                <span>
                  {totalScore.toFixed(2)} / {settings.maxAge}
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full bg-primary transition-all"
                  style={{ width: `${progress * 100}%` }}
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <input
                type="number"
                min={1}
                value={maxAgeInput}
                onChange={(event) => setMaxAgeInput(event.target.value)}
                className="w-40 rounded-md border border-border bg-input px-3 py-2 text-sm text-foreground"
              />
              <button
                type="button"
                onClick={applyMaxAge}
                className="rounded-lg bg-secondary px-4 py-2 text-sm font-semibold text-secondary-foreground transition-colors hover:bg-secondary/80"
              >
                Apply
              </button>
              <span className="text-xs text-muted-foreground">
                Lowering MAXAGE triggers score reduction on the next visit.
              </span>
            </div>

            {confirmLower !== null && (
              <div className="flex items-center gap-3 rounded-lg border border-amber-400/40 bg-amber-500/10 p-3 text-xs">
                <span className="flex-1 text-amber-900 dark:text-amber-200">
                  Lower MAXAGE to {confirmLower}? This will trigger scaling on the next visit.
                </span>
                <button
                  type="button"
                  onClick={confirmLowerMaxAge}
                  className="rounded-md bg-amber-500 px-3 py-1.5 font-semibold text-white"
                >
                  Confirm
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmLower(null)}
                  className="rounded-md bg-muted px-3 py-1.5 text-muted-foreground hover:text-foreground"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        </SettingsCard>

        <SettingsCard
          title="Clear Tracking Data"
          description="Reset visits, scores, and last visited timestamps."
        >
          <div className="flex items-center justify-between gap-4">
            <div className="text-xs text-muted-foreground">
              This cannot be undone.
            </div>
            <div className="flex items-center gap-2">
              {clearConfirm && (
                <button
                  type="button"
                  onClick={() => setClearConfirm(false)}
                  className="rounded-lg bg-muted px-3 py-2 text-xs font-semibold text-muted-foreground hover:text-foreground"
                >
                  Cancel
                </button>
              )}
              <button
                type="button"
                onClick={handleClear}
                className={`rounded-lg px-4 py-2 text-xs font-semibold transition-colors ${
                  clearConfirm
                    ? "bg-destructive text-destructive-foreground"
                    : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                }`}
              >
                {clearConfirm ? "Confirm Clear" : "Clear Data"}
              </button>
            </div>
          </div>
        </SettingsCard>
      </div>
    </section>
  );
}
