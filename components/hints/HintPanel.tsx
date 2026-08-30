"use client";

import { useState } from "react";
import { getHint, type HintResult } from "@/lib/api/ai";
import { ApiError } from "@/lib/api/client";

export default function HintPanel({ problemId, code }: { problemId: string; code: string }) {
  const [hints, setHints] = useState<HintResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const nextLevel = hints.length + 1;
  const maxLevel = hints[hints.length - 1]?.maxLevel ?? 3;
  const reachedMax = hints.length > 0 && nextLevel > maxLevel;

  const requestHint = async () => {
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
        {!reachedMax && (
          <button type="button" className="button button-small" onClick={requestHint} disabled={isLoading}>
            {isLoading ? "Thinking…" : hints.length === 0 ? "Get a hint" : `Next hint (${nextLevel}/${maxLevel})`}
          </button>
        )}
      </div>

      {error && <p className="verdict-failed">{error}</p>}

      {hints.map((item, index) => (
        <div key={index} className="hint-entry">
          <span className="hint-entry-level">Hint {item.level}/{item.maxLevel}</span>
          <p>{item.hint}</p>
        </div>
      ))}

      {reachedMax && <p className="hint-panel-note">That&apos;s the most direct hint available without giving away the solution — you&apos;ve got this.</p>}
    </div>
  );
}
