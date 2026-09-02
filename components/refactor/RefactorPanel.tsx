"use client";

import { useState } from "react";
import { generateRefactorSuggestions, verifyRefactorSuggestion, type RefactorResult } from "@/lib/api/ai";
import { ApiError } from "@/lib/api/client";
import RefactorDiffEditor from "@/components/editor/RefactorDiffEditor";
import type { Language, RefactorSuggestion } from "@/types/api";

// F5 Code Refactor Recommendations. Only meaningful for an ACCEPTED
// submission (the backend rejects anything else with 400) — gate rendering
// at the call site on `submission.verdict === "ACCEPTED"`.
//
// "Apply" is entirely client-side: it hands the suggestion's stored
// refactoredCode back up via `onApply` so the live Monaco editor can swap
// its content, and is only offered where there is a live editor to apply
// into (the problem workspace, not the read-only submission detail page).
// "Verified" is earned, not claimed — it calls the backend, which re-runs
// this exact stored code against every one of the problem's test cases.
export default function RefactorPanel({
  submissionId,
  language,
  originalCode,
  initialSuggestions,
  onApply,
}: {
  submissionId: string;
  language: Language;
  originalCode: string;
  initialSuggestions?: RefactorSuggestion[];
  onApply?: (code: string) => void;
}) {
  const [suggestions, setSuggestions] = useState<RefactorSuggestion[] | null>(initialSuggestions && initialSuggestions.length > 0 ? initialSuggestions : null);
  const [unavailableMessage, setUnavailableMessage] = useState<string | null>(null);
  const [hasRequested, setHasRequested] = useState(Boolean(initialSuggestions && initialSuggestions.length > 0));
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const [appliedIndex, setAppliedIndex] = useState<number | null>(null);
  const [verifyingIndex, setVerifyingIndex] = useState<number | null>(null);
  const [verifyErrors, setVerifyErrors] = useState<Record<number, string>>({});

  const requestSuggestions = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result: RefactorResult = await generateRefactorSuggestions(submissionId);
      setHasRequested(true);
      if (result.source === "unavailable") {
        setSuggestions([]);
        setUnavailableMessage(result.message ?? "Refactor suggestions are not available right now.");
      } else {
        setSuggestions(result.suggestions);
        setUnavailableMessage(null);
      }
    } catch (requestError) {
      setError(requestError instanceof ApiError ? requestError.message : "Could not generate refactor suggestions right now.");
    } finally {
      setIsLoading(false);
    }
  };

  const applySuggestion = (index: number) => {
    const suggestion = suggestions?.[index];
    if (!suggestion || !onApply) return;
    onApply(suggestion.refactoredCode);
    setAppliedIndex(index);
  };

  const verifySuggestion = async (index: number) => {
    setVerifyingIndex(index);
    setVerifyErrors((prev) => ({ ...prev, [index]: "" }));
    try {
      const verified = await verifyRefactorSuggestion(submissionId, index);
      setSuggestions((prev) => (prev ? prev.map((item, i) => (i === index ? verified : item)) : prev));
    } catch (requestError) {
      const message = requestError instanceof ApiError ? requestError.message : "Verification failed — try again.";
      setVerifyErrors((prev) => ({ ...prev, [index]: message }));
    } finally {
      setVerifyingIndex(null);
    }
  };

  return (
    <div className="refactor-panel">
      <div className="refactor-panel-head">
        <h4>Refactor suggestions</h4>
        {!hasRequested && (
          <button type="button" className="button button-small" onClick={requestSuggestions} disabled={isLoading}>
            {isLoading ? "Reviewing…" : "Get refactor suggestions"}
          </button>
        )}
      </div>

      {error && <p className="verdict-failed">{error}</p>}

      {hasRequested && suggestions && suggestions.length === 0 && (
        <p className="refactor-panel-note">
          {unavailableMessage ?? "Your solution already looks clean — no meaningful improvements found."}
        </p>
      )}

      {suggestions &&
        suggestions.map((suggestion, index) => {
          const isExpanded = expandedIndex === index;
          const isApplied = appliedIndex === index;
          const isVerifying = verifyingIndex === index;
          const verifyError = verifyErrors[index];

          return (
            <div key={index} className="refcard">
              <div className="refcard-head">
                <div>
                  <p className="refcard-title">{suggestion.title}</p>
                  <p className="refcard-rationale">{suggestion.rationale}</p>
                </div>
                {suggestion.isVerified && <span className="refactor-verified-badge">Verified</span>}
              </div>

              <div className="refcard-actions">
                <button type="button" className="button-outline button-small" onClick={() => setExpandedIndex(isExpanded ? null : index)}>
                  {isExpanded ? "Hide diff" : "Show diff"}
                </button>
                {onApply && (
                  <button type="button" className="button-outline button-small" onClick={() => applySuggestion(index)}>
                    {isApplied ? "Applied ✓" : "Apply to editor"}
                  </button>
                )}
                {!suggestion.isVerified && (
                  <button type="button" className="button button-small" onClick={() => verifySuggestion(index)} disabled={isVerifying}>
                    {isVerifying ? "Verifying…" : "Verify"}
                  </button>
                )}
              </div>

              {verifyError && (
                <p className="verdict-failed" style={{ margin: "0 14px 14px" }}>
                  {verifyError}
                </p>
              )}

              {isExpanded && (
                <div className="refactor-diff">
                  <RefactorDiffEditor language={language} original={originalCode} modified={suggestion.refactoredCode} />
                </div>
              )}
            </div>
          );
        })}
    </div>
  );
}
