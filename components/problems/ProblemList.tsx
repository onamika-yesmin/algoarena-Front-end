"use client";

import { useEffect, useState } from "react";
import { listProblems } from "@/lib/api/problems";
import type { ProblemSummary } from "@/types/api";
import ProblemCard from "./ProblemCard";
import ProblemFilters from "./ProblemFilters";
import { Loader } from "@/components/ui/Loader";
import { getErrorMessage } from "@/lib/api/client";

export default function ProblemList() {
  const [problems, setProblems] = useState<ProblemSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [difficulty, setDifficulty] = useState("");
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const limit = 20;

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    setStatus("loading");

    const timeout = setTimeout(async () => {
      try {
        const result = await listProblems({ search: search || undefined, difficulty: difficulty || undefined, page, limit });
        if (cancelled) return;
        setProblems(result.items);
        setTotal(result.total);
        setStatus("ready");
      } catch (error) {
        if (!cancelled) {
          setErrorMessage(getErrorMessage(error, "Could not load problems."));
          setStatus("error");
        }
      }
    }, 250); // debounce search typing

    return () => {
      cancelled = true;
      controller.abort();
      clearTimeout(timeout);
    };
  }, [search, difficulty, page]);

  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <div>
      <ProblemFilters
        search={search}
        difficulty={difficulty}
        onSearchChange={(value) => {
          setPage(1);
          setSearch(value);
        }}
        onDifficultyChange={(value) => {
          setPage(1);
          setDifficulty(value);
        }}
      />

      {status === "loading" && <Loader label="Loading problems…" />}
      {status === "error" && <p className="problem-list-status">{errorMessage}</p>}
      {status === "ready" && problems.length === 0 && <p className="problem-list-status">No problems match your filters yet.</p>}

      {status === "ready" && problems.length > 0 && (
        <>
          <div className="problem-grid">
            {problems.map((problem) => (
              <ProblemCard key={problem.id} problem={problem} />
            ))}
          </div>
          {totalPages > 1 && (
            <div className="problem-pagination">
              <button type="button" disabled={page <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>
                ← Prev
              </button>
              <span>
                Page {page} of {totalPages}
              </span>
              <button type="button" disabled={page >= totalPages} onClick={() => setPage((value) => Math.min(totalPages, value + 1))}>
                Next →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
