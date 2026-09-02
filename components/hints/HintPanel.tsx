"use client";

import { useState } from "react";
import { getHint, HINT_TIER_COSTS, type HintResult } from "@/lib/api/ai";
import { ApiError } from "@/lib/api/client";

export default function HintPanel({ problemId, code }: { problemId: string; code: string }) {
  const [hints, setHints] = useState<HintResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Whether the "unlock this tier?" confirmation modal is open — negative
  // marking means this costs score, so it's a deliberate action, never a
  // side effect of just clicking "Get a hint" once.
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  const nextLevel = hints.length + 1;
  const maxLevel = hints[hints.length - 1]?.maxLevel ?? HINT_TIER_COSTS.length;
  const reachedMax = hints.length > 0 && nextLevel > maxLevel;
  const nextCost = HINT_TIER_COSTS[nextLevel - 1] ?? HINT_TIER_COSTS[HINT_TIER_COSTS.length - 1];
  const totalPenalty = hints[hints.length - 1]?.penaltyPercent ?? 0;

  const requestHint = async () => {
    setIsConfirmOpen(false);
    setIsLoading(true);
    setError(null);
    try {
      const result = await getHint({ problemId, level: nextLevel, code });
      setHints((previous) => [...previous, result]);
    } catch (requestError) {
      setError(requestError instanceof ApiError ? requestError.message : "Could not get a hint right now.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="hint-panel">
      <div className="hint-panel-head">
        <h4>Stuck? Get a hint</h4>
      </div>

      {error && <p className="verdict-failed">{error}</p>}

      {hints.map((item, index) => (
        <div key={index} className="hintcard">
          <div className="hintcard-lab">
            Hint {item.level}/{item.maxLevel}
          </div>
          <p>{item.hint}</p>
        </div>
      ))}

      {!reachedMax && (
        <div className="hint-locked">
          <b>Tier {nextLevel} hint</b>
          Costs −{nextCost}% of this problem&apos;s score, permanently — you&apos;ll see the cost before you spend it.
          <div>
            <button type="button" className="button button-small" onClick={() => setIsConfirmOpen(true)} disabled={isLoading}>
              {isLoading ? "Thinking…" : `Unlock · −${nextCost}%`}
            </button>
          </div>
        </div>
      )}

      {totalPenalty > 0 && (
        <p className="hint-panel-note hint-penalty-note">
          Total hint penalty so far: <b>−{totalPenalty}%</b> of this problem&apos;s score — applies to every submission you make on it from now on.
        </p>
      )}

      {reachedMax && <p className="hint-panel-note">That&apos;s the most direct hint available without giving away the solution — you&apos;ve got this.</p>}

      {isConfirmOpen && (
        <div className="hint-modal-overlay" role="presentation" onClick={() => setIsConfirmOpen(false)}>
          <div className="hint-modal" role="dialog" aria-modal="true" aria-labelledby="hint-modal-title" onClick={(event) => event.stopPropagation()}>
            <h3 id="hint-modal-title">Unlock tier {nextLevel} hint?</h3>
            <p>
              This costs <b>−{nextCost}%</b> of this problem&apos;s score, permanently — not just on this attempt. You&apos;ll have{" "}
              {maxLevel - nextLevel} tier{maxLevel - nextLevel === 1 ? "" : "s"} left after this one.
            </p>
            <div className="hint-modal-actions">
              <button type="button" className="button-outline button-small" onClick={() => setIsConfirmOpen(false)}>
                Cancel
              </button>
              <button type="button" className="button button-small" onClick={requestHint}>
                Unlock · −{nextCost}%
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
