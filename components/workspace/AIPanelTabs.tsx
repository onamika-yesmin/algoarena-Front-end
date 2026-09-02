"use client";

import { useState } from "react";
import VerdictPanel from "@/components/verdict/VerdictPanel";
import HintPanel from "@/components/hints/HintPanel";
import ComplexityAuditorPanel from "@/components/complexity/ComplexityAuditorPanel";
import RefactorPanel from "@/components/refactor/RefactorPanel";
import type { Submission } from "@/types/api";

type TabKey = "results" | "hint" | "bigO" | "refactor";

const TABS: { key: TabKey; label: string }[] = [
  { key: "results", label: "Results" },
  { key: "hint", label: "Hint" },
  { key: "bigO", label: "Big-O" },
  { key: "refactor", label: "Refactor" },
];

// The problem workspace's AI panel — a tabbed column (Results / Hint /
// Big-O / Refactor) replacing what used to be four panels always stacked
// on top of each other under the editor. Each panel component below is
// unchanged and still owns its own request/loading/error state; this is
// just the shell that shows one of them at a time and fills the rest with
// an honest empty state explaining what unlocks it.
export default function AIPanelTabs({
  problemId,
  code,
  isSignedIn,
  submission,
  onApplyRefactor,
}: {
  problemId: string;
  code: string;
  isSignedIn: boolean;
  submission: Submission | null;
  onApplyRefactor: (code: string) => void;
}) {
  const [activeTab, setActiveTab] = useState<TabKey>("results");

  const resultsDotClass = submission ? (submission.verdict === "ACCEPTED" ? "ai-tab-dot-ok" : "ai-tab-dot-bad") : "";

  return (
    <div className="ai-workspace-panel">
      <div className="ai-tabs" role="tablist">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.key}
            className={`ai-tab ${activeTab === tab.key ? "is-active" : ""}`}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
            {tab.key === "results" && submission && <i className={`ai-tab-dot ${resultsDotClass}`} />}
          </button>
        ))}
      </div>

      <div className="ai-tab-body">
        {activeTab === "results" &&
          (submission ? (
            <VerdictPanel submission={submission} />
          ) : (
            <div className="ai-tab-empty">
              <div className="ic">✷</div>
              Run or submit your code to see results here.
              <br />
              <span style={{ fontSize: 12 }}>Run only checks the first sample and costs nothing.</span>
            </div>
          ))}

        {activeTab === "hint" &&
          (isSignedIn ? (
            <HintPanel problemId={problemId} code={code} />
          ) : (
            <div className="ai-tab-empty">
              <div className="ic">✷</div>
              Sign in to get hints on this problem.
            </div>
          ))}

        {activeTab === "bigO" &&
          (submission ? (
            <ComplexityAuditorPanel key={submission.id} submissionId={submission.id} initialReport={submission.complexityReport} />
          ) : (
            <div className="ai-tab-empty">
              <div className="ic">✷</div>
              Submit your code to unlock a time/space complexity estimate.
            </div>
          ))}

        {activeTab === "refactor" &&
          (submission && submission.verdict === "ACCEPTED" ? (
            <RefactorPanel
              key={submission.id}
              submissionId={submission.id}
              language={submission.language}
              originalCode={submission.code}
              initialSuggestions={submission.refactorSuggestions}
              onApply={onApplyRefactor}
            />
          ) : (
            <div className="ai-tab-empty">
              <div className="ic">✷</div>
              Refactor suggestions unlock once you have an Accepted submission on this problem.
            </div>
          ))}
      </div>
    </div>
  );
}
