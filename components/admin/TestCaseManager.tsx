"use client";

import { useCallback, useEffect, useState } from "react";
import {
  addAdminTestCases,
  deleteAdminTestCase,
  listAdminTestCases,
  updateAdminTestCase,
  type AdminTestCaseRecord,
} from "@/lib/api/admin";
import { generateTestCases } from "@/lib/api/ai";
import { ApiError, getErrorMessage } from "@/lib/api/client";

const emptyDraft = { input: "", expectedOutput: "", isSample: false };

// Manages a problem's hidden/judging test cases post-creation — previously
// there was no way to add, remove, or even see these after the problem was
// first created (see ProblemForm.tsx's old note). Also the review surface
// for the Automated Test Case Generator (F10): a freshly-generated case
// lands here with reviewed:false and stays invisible to the judge (see
// testcase.service.ts's getTestCasesForJudging) until Approved.
export function TestCaseManager({ problemId, hasReferenceSolution }: { problemId: string; hasReferenceSolution: boolean }) {
  const [testCases, setTestCases] = useState<AdminTestCaseRecord[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [draft, setDraft] = useState(emptyDraft);
  const [isAdding, setIsAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [generateNote, setGenerateNote] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rowError, setRowError] = useState<Record<string, string>>({});

  const load = useCallback(() => {
    listAdminTestCases(problemId)
      .then((items) => setTestCases([...items].sort((a, b) => a.order - b.order)))
      .catch((error) => setLoadError(getErrorMessage(error, "Could not load test cases.")));
  }, [problemId]);

  useEffect(load, [load]);

  const addManual = async () => {
    if (!draft.input.trim() && !draft.expectedOutput.trim()) return;
    setIsAdding(true);
    setAddError(null);
    try {
      await addAdminTestCases(problemId, [draft]);
      setDraft(emptyDraft);
      load();
    } catch (error) {
      setAddError(getErrorMessage(error, "Could not add this test case."));
    } finally {
      setIsAdding(false);
    }
  };

  const generate = async () => {
    setIsGenerating(true);
    setGenerateError(null);
    setGenerateNote(null);
    try {
      const result = await generateTestCases(problemId);
      if (result.source === "unavailable") {
        setGenerateError(result.message ?? "AI test case generation is not available right now.");
      } else if (result.created.length === 0) {
        setGenerateNote(result.message ?? "No new test cases were generated.");
      } else {
        setGenerateNote(
          `Generated ${result.created.length} of ${result.requested} requested case(s)` +
            (result.discarded > 0 ? ` — ${result.discarded} discarded (the reference solution couldn't produce output for them).` : ".") +
            " Review them below before they count toward grading.",
        );
        load();
      }
    } catch (error) {
      setGenerateError(error instanceof ApiError ? error.message : "Could not generate test cases right now.");
    } finally {
      setIsGenerating(false);
    }
  };

  const approve = async (id: string) => {
    setBusyId(id);
    setRowError((prev) => ({ ...prev, [id]: "" }));
    try {
      await updateAdminTestCase(id, { reviewed: true });
      load();
    } catch (error) {
      setRowError((prev) => ({ ...prev, [id]: getErrorMessage(error, "Could not approve this test case.") }));
    } finally {
      setBusyId(null);
    }
  };

  const reject = async (id: string) => {
    setBusyId(id);
    setRowError((prev) => ({ ...prev, [id]: "" }));
    try {
      await deleteAdminTestCase(id);
      load();
    } catch (error) {
      setRowError((prev) => ({ ...prev, [id]: getErrorMessage(error, "Could not remove this test case.") }));
    } finally {
      setBusyId(null);
    }
  };

  const pendingCount = testCases?.filter((testCase) => !testCase.reviewed).length ?? 0;

  return (
    <div className="admin-card">
      <h2>Test cases</h2>
      <p className="admin-card-hint">
        Every reviewed case here (sample and hidden alike) is used by the judge. {pendingCount > 0 && `${pendingCount} pending review.`}
      </p>

      {loadError && <p className="form-error">{loadError}</p>}

      {!hasReferenceSolution && (
        <p className="problem-list-status" style={{ padding: 0, marginBottom: 14 }}>
          Add a reference solution above to enable AI-generated test cases.
        </p>
      )}

      <div className="admin-form-actions" style={{ marginBottom: 18 }}>
        <button type="button" className="button button-small" onClick={generate} disabled={isGenerating || !hasReferenceSolution}>
          {isGenerating ? "Generating…" : "Generate AI test cases"}
        </button>
      </div>
      {generateError && <p className="form-error">{generateError}</p>}
      {generateNote && <p className="form-success">{generateNote}</p>}

      {testCases === null && !loadError && <p className="problem-list-status" style={{ padding: 0 }}>Loading test cases…</p>}

      {testCases && testCases.length === 0 && <p className="problem-list-status" style={{ padding: 0 }}>No test cases yet.</p>}

      {testCases && testCases.length > 0 && (
        <div className="admin-table-wrap" style={{ marginBottom: 18 }}>
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Sample</th>
                <th>Source</th>
                <th>Status</th>
                <th>Input</th>
                <th>Expected output</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {testCases.map((testCase) => (
                <tr key={testCase.id}>
                  <td>{testCase.order}</td>
                  <td>{testCase.isSample ? "Yes" : "—"}</td>
                  <td>
                    <span className={testCase.source === "ai-generated" ? "badge badge-draft" : "badge badge-user"}>
                      {testCase.source === "ai-generated" ? "AI" : "Manual"}
                    </span>
                  </td>
                  <td>
                    <span className={testCase.reviewed ? "badge badge-active" : "badge badge-draft"}>{testCase.reviewed ? "Reviewed" : "Pending"}</span>
                  </td>
                  <td style={{ maxWidth: 220 }}>
                    <pre style={{ margin: 0, whiteSpace: "pre-wrap", fontSize: 11, maxHeight: 80, overflow: "auto" }}>{testCase.input}</pre>
                  </td>
                  <td style={{ maxWidth: 220 }}>
                    <pre style={{ margin: 0, whiteSpace: "pre-wrap", fontSize: 11, maxHeight: 80, overflow: "auto" }}>{testCase.expectedOutput}</pre>
                  </td>
                  <td>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      {!testCase.reviewed && (
                        <button type="button" className="icon-button" onClick={() => approve(testCase.id)} disabled={busyId === testCase.id}>
                          Approve
                        </button>
                      )}
                      <button type="button" className="icon-button icon-button-danger" onClick={() => reject(testCase.id)} disabled={busyId === testCase.id}>
                        {testCase.reviewed ? "Delete" : "Reject"}
                      </button>
                    </div>
                    {rowError[testCase.id] && <p className="form-error" style={{ marginTop: 6 }}>{rowError[testCase.id]}</p>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <h3 style={{ margin: "8px 0" }}>Add a test case manually</h3>
      {/* The label/input/textarea grid styling (globals.css) is scoped to
          .admin-form, which the rest of this card (table, buttons above)
          intentionally isn't — only this section needs it. */}
      <div className="admin-form">
        <div className="admin-form-row">
          <label>
            Input
            <textarea rows={3} value={draft.input} onChange={(event) => setDraft((prev) => ({ ...prev, input: event.target.value }))} />
          </label>
          <label>
            Expected output
            <textarea rows={3} value={draft.expectedOutput} onChange={(event) => setDraft((prev) => ({ ...prev, expectedOutput: event.target.value }))} />
          </label>
        </div>
        <div className="admin-form-actions">
          <label style={{ display: "flex", flexDirection: "row", alignItems: "center", gap: 8, textTransform: "none" }}>
            <input
              type="checkbox"
              style={{ width: "auto" }}
              checked={draft.isSample}
              onChange={(event) => setDraft((prev) => ({ ...prev, isSample: event.target.checked }))}
            />
            Sample (visible to learners on the problem page)
          </label>
          <button type="button" className="button-outline button-small" onClick={addManual} disabled={isAdding}>
            {isAdding ? "Adding…" : "+ Add test case"}
          </button>
        </div>
      </div>
      {addError && <p className="form-error">{addError}</p>}
    </div>
  );
}
