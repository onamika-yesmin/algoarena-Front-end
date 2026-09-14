"use client";

import { useState } from "react";
import { getHint, HINT_TIER_COSTS, type HintResult } from "@/lib/api/ai";
import { ApiError } from "@/lib/api/client";

export default function HintPanel({
  problemId,
  code,
  initialHintTier = 0,
  initialHintPenaltyPercent = 0,
}: {
  problemId: string;
  code: string;
  /** Highest tier this user already unlocked on this problem (0 if none). */
  initialHintTier?: number;
  /** Their hint penalty on this problem so far, as a percentage. */
  initialHintPenaltyPercent?: number;
}) {
  const [hints, setHints] = useState<HintResult[]>([]);
  // Seeded from the problem payload, so tiers already paid for on an earlier
  // visit are never offered again as if they cost a fresh penalty — then kept
  // current from each hint response.
  const [unlockedTier, setUnlockedTier] = useState(initialHintTier);
  const [totalPenalty, setTotalPenalty] = useState(initialHintPenaltyPercent);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Whether the "unlock this tier?" confirmation modal is open — negative
  // marking means this costs score, so it's a deliberate action, never a
  // side effect of just clicking "Get a hint" once.
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  const maxLevel = hints[hints.length - 1]?.maxLevel ?? HINT_TIER_COSTS.length;
  const nextLevel = unlockedTier + 1;
  const reachedMax = nextLevel > maxLevel;
  const nextCost = HINT_TIER_COSTS[nextLevel - 1] ?? HINT_TIER_COSTS[HINT_TIER_COSTS.length - 1];
  // Tiers already paid for whose text isn't on screen (unlocked on an earlier
  // visit) — the backend replays those for free.
  const replayableLevels = Array.from({ length: Math.min(unlockedTier, maxLevel) }, (_, index) => index + 1).filter(
    (level) => !hints.some((item) => item.level === level),
  );

  const fetchHint = async (level: number) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await getHint({ problemId, level, code });
      setHints((previous) => [...previous.filter((item) => item.level !== result.level), result].sort((a, b) => a.level - b.level));
      setUnlockedTier((previous) => Math.max(previous, result.level));
      setTotalPenalty(result.penaltyPercent);
    } catch (requestError) {
      setError(requestError instanceof ApiError ? requestError.message : "Could not get a hint right now.");
    } finally {
      setIsLoading(false);
    }
  };

  const requestHint = async () => {
    setIsConfirmOpen(false);
    await fetchHint(nextLevel);
  };

  return (
    <div className="hint-panel">
      <div className="hint-panel-head">
        <h4>Stuck? Get a hint</h4>
      </div>

      {error && <p className="verdict-failed">{error}</p>}

      {hints.map((item) => (
        <div key={item.level} className="hintcard">
          <div className="hintcard-lab">
            Hint {item.level}/{item.maxLevel}
          </div>
          <p>{item.hint}</p>
        </div>
      ))}

      {replayableLevels.length > 0 && (
        <div className="hint-locked">
          <b>
            {replayableLevels.length === 1 ? `Tier ${replayableLevels[0]}` : `Tiers ${replayableLevels.join(", ")}`} already unlocked
          </b>
          You&apos;ve already paid for {replayableLevels.length === 1 ? "this hint" : "these hints"} on this problem — viewing{" "}
          {replayableLevels.length === 1 ? "it" : "them"} again is free.
          <div>
            {replayableLevels.map((level) => (
              <button
                key={level}
                type="button"
                className="button-outline button-small"
                style={{ margin: "12px 4px 0" }}
                onClick={() => fetchHint(level)}
                disabled={isLoading}
              >
                Show tier {level} · free
              </button>
            ))}
          </div>
        </div>
      )}

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
