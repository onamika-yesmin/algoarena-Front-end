"use client";

// Create/edit form for the contest manager (/admin/contests and
// /admin/contests/[id]/edit), used by admins and approved "guest" hosts.
// Mirrors the backend's contest validation client-side so most mistakes are
// caught before a round trip; the server stays the source of truth.

import Link from "next/link";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { listAdminProblems } from "@/lib/api/admin";
import { listProblems } from "@/lib/api/problems";
import { getErrorMessage } from "@/lib/api/client";
import { dateTimeLocalToIso, isoToDateTimeLocal, type CreateContestPayload } from "@/lib/api/contests";
import type { Difficulty, ManagedContestDetail } from "@/types/api";
import { Pagination } from "@/components/ui/Pagination";
import { Spinner } from "@/components/ui/Loader";
import styles from "./ContestForm.module.css";

export const CONTEST_LIMITS = {
  titleMin: 3,
  titleMax: 120,
  slugMin: 3,
  slugMax: 80,
  descriptionMax: 5000,
  maxProblems: 50,
  pointsMin: 1,
  pointsMax: 10000,
} as const;

const PICKER_PAGE_SIZE = 10;
const SLUG_PATTERN = /^[a-z0-9-]+$/;

/** "Weekly Challenge #1" → "weekly-challenge-1". */
export const slugify = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+/, "")
    .slice(0, CONTEST_LIMITS.slugMax)
    .replace(/-+$/, "");

// One-shot success message handed from the edit page back to the contest
// list (sessionStorage, so it survives the client navigation but not a new tab).
const FLASH_KEY = "algoarena.contestManager.flash";

export const setContestManagerFlash = (message: string) => {
  try {
    window.sessionStorage.setItem(FLASH_KEY, message);
  } catch {
    // Storage unavailable (private mode) — the message is just skipped.
  }
};

export const takeContestManagerFlash = (): string | null => {
  try {
    const message = window.sessionStorage.getItem(FLASH_KEY);
    if (message) window.sessionStorage.removeItem(FLASH_KEY);
    return message;
  } catch {
    return null;
  }
};

interface PickerProblem {
  id: string;
  slug: string;
  title: string;
  difficulty: Difficulty;
  basePoints: number;
  /** Only known on the admin list; the public list is published-only. */
  isPublished: boolean;
}

interface SelectedProblem {
  problemId: string;
  title: string;
  difficulty: Difficulty | null;
  /** Kept as the raw input text so the field can be cleared while typing. */
  points: string;
  isPublished: boolean;
  isMissing: boolean;
}

type FieldKey = "title" | "slug" | "description" | "startTime" | "endTime" | "problems";
type FieldErrors = Partial<Record<FieldKey, string>>;

const FIELD_ORDER: FieldKey[] = ["title", "slug", "description", "startTime", "endTime", "problems"];

interface FormValues {
  title: string;
  slug: string;
  description: string;
  startLocal: string;
  endLocal: string;
  isPublished: boolean;
}

const isValidPoints = (value: string) => {
  if (!/^\d+$/.test(value.trim())) return false;
  const points = Number(value);
  return Number.isInteger(points) && points >= CONTEST_LIMITS.pointsMin && points <= CONTEST_LIMITS.pointsMax;
};

const formatDuration = (ms: number) => {
  const totalMinutes = Math.round(ms / 60000);
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;
  return [days && `${days}d`, hours && `${hours}h`, minutes && `${minutes}m`].filter(Boolean).join(" ") || "0m";
};

const validate = (values: FormValues, selected: SelectedProblem[]): FieldErrors => {
  const errors: FieldErrors = {};
  const title = values.title.trim();
  if (!title) errors.title = "Give the contest a title.";
  else if (title.length < CONTEST_LIMITS.titleMin || title.length > CONTEST_LIMITS.titleMax)
    errors.title = `Title must be ${CONTEST_LIMITS.titleMin}–${CONTEST_LIMITS.titleMax} characters.`;

  const slug = values.slug.trim();
  if (!slug) errors.slug = "Add a slug — it's the contest's URL.";
  else if (!SLUG_PATTERN.test(slug)) errors.slug = "Use only lowercase letters, digits and hyphens.";
  else if (slug.length < CONTEST_LIMITS.slugMin || slug.length > CONTEST_LIMITS.slugMax)
    errors.slug = `Slug must be ${CONTEST_LIMITS.slugMin}–${CONTEST_LIMITS.slugMax} characters.`;

  if (values.description.length > CONTEST_LIMITS.descriptionMax)
    errors.description = `Description can be at most ${CONTEST_LIMITS.descriptionMax} characters.`;

  const startIso = dateTimeLocalToIso(values.startLocal);
  const endIso = dateTimeLocalToIso(values.endLocal);
  if (!values.startLocal) errors.startTime = "Pick when the contest starts.";
  else if (!startIso) errors.startTime = "Enter a valid start date and time.";
  if (!values.endLocal) errors.endTime = "Pick when the contest ends.";
  else if (!endIso) errors.endTime = "Enter a valid end date and time.";
  else if (startIso && new Date(endIso).getTime() <= new Date(startIso).getTime()) errors.endTime = "The end must be after the start.";

  if (selected.length > CONTEST_LIMITS.maxProblems) errors.problems = `A contest can have at most ${CONTEST_LIMITS.maxProblems} problems.`;
  else {
    const invalid = selected.find((entry) => !isValidPoints(entry.points));
    if (invalid)
      errors.problems = `Points for "${invalid.title}" must be a whole number from ${CONTEST_LIMITS.pointsMin} to ${CONTEST_LIMITS.pointsMax}.`;
  }
  return errors;
};

const problemsSignature = (entries: { problemId: string; points: number | string }[]) =>
  entries.map((entry) => `${entry.problemId}:${String(entry.points).trim()}`).join("|");

export interface ContestFormProps {
  /** Edit mode when present. */
  initial?: ManagedContestDetail;
  /** Admins pick from every problem (drafts included); hosts only from published ones. */
  isAdmin: boolean;
  submitLabel: string;
  submittingLabel: string;
  isSubmitting: boolean;
  /** Server-side error from the last submit. */
  error: string | null;
  onSubmit: (payload: CreateContestPayload) => void;
  cancelHref?: string;
}

export function ContestForm({ initial, isAdmin, submitLabel, submittingLabel, isSubmitting, error, onSubmit, cancelHref }: ContestFormProps) {
  const baseId = useId();
  const fieldId = (key: FieldKey) => `${baseId}-${key}`;
  const isEdit = Boolean(initial);

  const initialStartLocal = useMemo(() => isoToDateTimeLocal(initial?.startTime), [initial]);
  const initialEndLocal = useMemo(() => isoToDateTimeLocal(initial?.endTime), [initial]);

  const [values, setValues] = useState<FormValues>(() => ({
    title: initial?.title ?? "",
    slug: initial?.slug ?? "",
    description: initial?.description ?? "",
    startLocal: initialStartLocal,
    endLocal: initialEndLocal,
    isPublished: initial?.isPublished ?? true,
  }));
  // The slug follows the title until someone edits it by hand (an existing
  // contest's slug is never rewritten automatically — links to it exist).
  const [slugTouched, setSlugTouched] = useState(isEdit);
  const [selected, setSelected] = useState<SelectedProblem[]>(() =>
    (initial?.problems ?? []).map((entry) => ({
      problemId: entry.problemId,
      title: entry.title ?? "Unavailable problem",
      difficulty: entry.difficulty,
      points: String(entry.points),
      isPublished: true,
      isMissing: entry.title === null,
    })),
  );
  const [attempted, setAttempted] = useState(false);

  const errors = useMemo(() => validate(values, selected), [values, selected]);
  const visibleErrors: FieldErrors = attempted ? errors : {};
  const errorCount = Object.keys(errors).length;

  const update = <K extends keyof FormValues>(key: K, value: FormValues[K]) => setValues((current) => ({ ...current, [key]: value }));

  const changeTitle = (title: string) =>
    setValues((current) => ({ ...current, title, slug: slugTouched ? current.slug : slugify(title) }));

  const changeSlug = (raw: string) => {
    const slug = raw.toLowerCase().replace(/\s+/g, "-");
    // Clearing the field hands it back to the title.
    setSlugTouched(slug.length > 0);
    setValues((current) => ({ ...current, slug: slug.length > 0 ? slug : slugify(current.title) }));
  };

  // ---- Problem picker ------------------------------------------------------
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [pickerPage, setPickerPage] = useState(1);
  const [pickerReload, setPickerReload] = useState(0);
  const [picker, setPicker] = useState<{ status: "loading" | "ready" | "error"; items: PickerProblem[]; total: number; message: string }>({
    status: "loading",
    items: [],
    total: 0,
    message: "",
  });
  const pickerRequestRef = useRef(0);

  useEffect(() => {
    const next = search.trim();
    if (next === query) return;
    const timeout = setTimeout(() => {
      setQuery(next);
      setPickerPage(1);
    }, 300);
    return () => clearTimeout(timeout);
  }, [search, query]);

  useEffect(() => {
    // Only the latest request's response is applied, so a slow response for
    // an older search/page can't overwrite newer results.
    const requestId = ++pickerRequestRef.current;
    setPicker((current) => ({ ...current, status: "loading" }));
    const params = { search: query || undefined, page: pickerPage, limit: PICKER_PAGE_SIZE };
    const request: Promise<{ items: PickerProblem[]; total: number }> = isAdmin
      ? listAdminProblems(params).then((result) => ({
          total: result.total,
          items: result.items.map((problem) => ({
            id: problem.id,
            slug: problem.slug,
            title: problem.title,
            difficulty: problem.difficulty,
            basePoints: problem.basePoints,
            isPublished: problem.isPublished,
          })),
        }))
      : listProblems(params).then((result) => ({
          total: result.total,
          items: result.items.map((problem) => ({
            id: problem.id,
            slug: problem.slug,
            title: problem.title,
            difficulty: problem.difficulty,
            basePoints: problem.basePoints,
            isPublished: true,
          })),
        }));
    request
      .then((result) => {
        if (requestId !== pickerRequestRef.current) return;
        const lastPage = Math.max(1, Math.ceil(result.total / PICKER_PAGE_SIZE));
        if (result.items.length === 0 && pickerPage > lastPage) {
          setPickerPage(lastPage);
          return;
        }
        setPicker({ status: "ready", items: result.items, total: result.total, message: "" });
      })
      .catch((requestError) => {
        if (requestId !== pickerRequestRef.current) return;
        setPicker({ status: "error", items: [], total: 0, message: getErrorMessage(requestError, "Could not load problems.") });
      });
  }, [isAdmin, query, pickerPage, pickerReload]);

  const selectedIds = useMemo(() => new Set(selected.map((entry) => entry.problemId)), [selected]);
  const isFull = selected.length >= CONTEST_LIMITS.maxProblems;

  const addProblem = (problem: PickerProblem) => {
    setSelected((current) =>
      current.some((entry) => entry.problemId === problem.id) || current.length >= CONTEST_LIMITS.maxProblems
        ? current
        : [
            ...current,
            {
              problemId: problem.id,
              title: problem.title,
              difficulty: problem.difficulty,
              points: String(problem.basePoints > 0 ? Math.min(problem.basePoints, CONTEST_LIMITS.pointsMax) : 100),
              isPublished: problem.isPublished,
              isMissing: false,
            },
          ],
    );
  };

  const removeProblem = (problemId: string) => setSelected((current) => current.filter((entry) => entry.problemId !== problemId));

  const moveProblem = (index: number, delta: -1 | 1) =>
    setSelected((current) => {
      const target = index + delta;
      if (target < 0 || target >= current.length) return current;
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });

  const setPoints = (problemId: string, points: string) =>
    setSelected((current) => current.map((entry) => (entry.problemId === problemId ? { ...entry, points } : entry)));

  // ---- Submit --------------------------------------------------------------
  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitting) return;
    setAttempted(true);
    const firstInvalid = FIELD_ORDER.find((key) => errors[key]);
    if (firstInvalid) {
      document.getElementById(fieldId(firstInvalid))?.focus();
      return;
    }

    const problems = selected.map((entry) => ({ problemId: entry.problemId, points: Number(entry.points) }));
    // An unchanged time keeps the stored timestamp exactly (datetime-local
    // only has minute precision, so re-converting would drop the seconds).
    const startTime = initial && values.startLocal === initialStartLocal ? initial.startTime : (dateTimeLocalToIso(values.startLocal) as string);
    const endTime = initial && values.endLocal === initialEndLocal ? initial.endTime : (dateTimeLocalToIso(values.endLocal) as string);

    const payload: CreateContestPayload = {
      title: values.title.trim(),
      slug: values.slug.trim(),
      description: values.description,
      startTime,
      endTime,
      isPublished: values.isPublished,
    };
    // On edit, only send the problem list when it actually changed, so saving
    // e.g. a new title can't trip over a problem that was unpublished since.
    if (!initial || problemsSignature(problems) !== problemsSignature(initial.problems)) payload.problems = problems;
    onSubmit(payload);
  };

  const describedBy = (key: FieldKey, ...extra: (string | false)[]) =>
    [visibleErrors[key] && `${fieldId(key)}-error`, ...extra].filter(Boolean).join(" ") || undefined;

  const startIso = dateTimeLocalToIso(values.startLocal);
  const endIso = dateTimeLocalToIso(values.endLocal);
  const durationMs = startIso && endIso ? new Date(endIso).getTime() - new Date(startIso).getTime() : 0;
  const timeZone = useMemo(() => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch {
      return "";
    }
  }, []);

  const pickerBusy = picker.status === "loading";

  // A server error is rendered at the top of a long form — bring it into view.
  const errorRef = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    if (error) errorRef.current?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [error]);

  return (
    <form className={`admin-form ${styles.form}`} onSubmit={handleSubmit} noValidate aria-busy={isSubmitting}>
      {error && (
        <p ref={errorRef} className="form-error" role="alert">
          {error}
        </p>
      )}
      {attempted && errorCount > 0 && (
        <p className="form-error" role="alert">
          Please fix {errorCount === 1 ? "the highlighted field" : `the ${errorCount} highlighted fields`} below.
        </p>
      )}

      <div className="admin-form-row">
        <label htmlFor={fieldId("title")}>
          Title
          <input
            id={fieldId("title")}
            value={values.title}
            onChange={(event) => changeTitle(event.target.value)}
            maxLength={CONTEST_LIMITS.titleMax}
            aria-invalid={Boolean(visibleErrors.title)}
            aria-describedby={describedBy("title")}
            placeholder="Weekly Challenge #1"
            autoComplete="off"
          />
          {visibleErrors.title && (
            <span id={`${fieldId("title")}-error`} className={styles.fieldError}>
              {visibleErrors.title}
            </span>
          )}
        </label>
        <label htmlFor={fieldId("slug")}>
          Slug
          <input
            id={fieldId("slug")}
            value={values.slug}
            onChange={(event) => changeSlug(event.target.value)}
            maxLength={CONTEST_LIMITS.slugMax}
            aria-invalid={Boolean(visibleErrors.slug)}
            aria-describedby={describedBy("slug", `${fieldId("slug")}-hint`)}
            placeholder="weekly-challenge-1"
            autoComplete="off"
            spellCheck={false}
          />
          <span id={`${fieldId("slug")}-hint`} className={styles.fieldHint}>
            {values.slug ? `/contest/${values.slug}` : slugTouched ? "Lowercase letters, digits and hyphens." : "Generated from the title — edit to customise."}
          </span>
          {visibleErrors.slug && (
            <span id={`${fieldId("slug")}-error`} className={styles.fieldError}>
              {visibleErrors.slug}
            </span>
          )}
        </label>
      </div>

      <label htmlFor={fieldId("description")}>
        <span className={styles.labelRow}>
          <span>Description</span>
          <span className={styles.counter}>
            {values.description.length}/{CONTEST_LIMITS.descriptionMax}
          </span>
        </span>
        <textarea
          id={fieldId("description")}
          rows={4}
          value={values.description}
          onChange={(event) => update("description", event.target.value)}
          maxLength={CONTEST_LIMITS.descriptionMax}
          aria-invalid={Boolean(visibleErrors.description)}
          aria-describedby={describedBy("description")}
          placeholder="Rules, prizes, who it's for…"
        />
        {visibleErrors.description && (
          <span id={`${fieldId("description")}-error`} className={styles.fieldError}>
            {visibleErrors.description}
          </span>
        )}
      </label>

      <div className="admin-form-row">
        <label htmlFor={fieldId("startTime")}>
          Starts
          <input
            id={fieldId("startTime")}
            type="datetime-local"
            value={values.startLocal}
            onChange={(event) => update("startLocal", event.target.value)}
            aria-invalid={Boolean(visibleErrors.startTime)}
            aria-describedby={describedBy("startTime")}
          />
          {visibleErrors.startTime && (
            <span id={`${fieldId("startTime")}-error`} className={styles.fieldError}>
              {visibleErrors.startTime}
            </span>
          )}
        </label>
        <label htmlFor={fieldId("endTime")}>
          Ends
          <input
            id={fieldId("endTime")}
            type="datetime-local"
            value={values.endLocal}
            onChange={(event) => update("endLocal", event.target.value)}
            aria-invalid={Boolean(visibleErrors.endTime)}
            aria-describedby={describedBy("endTime")}
          />
          {visibleErrors.endTime && (
            <span id={`${fieldId("endTime")}-error`} className={styles.fieldError}>
              {visibleErrors.endTime}
            </span>
          )}
        </label>
      </div>
      <p className={styles.formNote}>
        Times are in your local time zone{timeZone ? ` (${timeZone})` : ""}.
        {durationMs > 0 && ` Runs for ${formatDuration(durationMs)}.`}
      </p>

      <label className={styles.toggle}>
        <input type="checkbox" checked={values.isPublished} onChange={(event) => update("isPublished", event.target.checked)} />
        <span>
          <b>Published</b>
          <span className={styles.toggleHint}>
            {values.isPublished ? "Visible in the contest list so people can find and register for it." : "Draft — hidden from the public contest list until you publish it."}
          </span>
        </span>
      </label>

      <fieldset className={styles.section} aria-describedby={visibleErrors.problems ? `${fieldId("problems")}-error` : undefined}>
        <legend className={styles.legend}>
          Problems ({selected.length}/{CONTEST_LIMITS.maxProblems})
        </legend>

        <div className={styles.pickerHead}>
          <label htmlFor={`${baseId}-search`} className={styles.srOnly}>
            Search problems to add
          </label>
          <input
            id={`${baseId}-search`}
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={isAdmin ? "Search the problem library…" : "Search published problems…"}
            autoComplete="off"
          />
          <p className={styles.formNote}>
            {isAdmin
              ? "Drafts can be attached now and published when the contest starts, so they aren't solvable early."
              : "Hosts can add any published problem from the library."}
          </p>
        </div>

        {picker.status === "error" ? (
          <div className={styles.pickerStatus} role="alert">
            <span className="form-error">{picker.message}</span>
            <button type="button" className="icon-button" onClick={() => setPickerReload((count) => count + 1)}>
              Retry
            </button>
          </div>
        ) : picker.items.length === 0 ? (
          <div className={styles.pickerStatus} role="status">
            {pickerBusy ? (
              <>
                <Spinner size="sm" /> Loading problems…
              </>
            ) : query ? (
              <>No problems match &ldquo;{query}&rdquo;.</>
            ) : isAdmin ? (
              <>
                No problems yet — create some in{" "}
                <Link className="text-link" href="/admin/problems/new">
                  Problem manager
                </Link>{" "}
                first.
              </>
            ) : (
              "No published problems are available yet."
            )}
          </div>
        ) : (
          <>
            <ul className={`${styles.results}${pickerBusy ? ` ${styles.isBusy}` : ""}`} aria-busy={pickerBusy} aria-label="Problem search results">
              {picker.items.map((problem) => {
                const isAdded = selectedIds.has(problem.id);
                return (
                  <li key={problem.id} className={styles.resultRow}>
                    <span className={styles.resultTitle}>{problem.title}</span>
                    <span className={styles.resultMeta}>
                      <span className={`pill pill-${problem.difficulty.toLowerCase()}`}>{problem.difficulty}</span>
                      {isAdmin && !problem.isPublished && <span className="badge badge-draft">Draft</span>}
                      <span className={styles.muted}>{problem.basePoints} pts</span>
                    </span>
                    <button
                      type="button"
                      className={`icon-button ${styles.addButton}`}
                      onClick={() => addProblem(problem)}
                      disabled={isAdded || isFull}
                      aria-label={isAdded ? `${problem.title} is already added` : `Add ${problem.title}`}
                    >
                      {isAdded ? "Added ✓" : "Add"}
                    </button>
                  </li>
                );
              })}
            </ul>
            <Pagination
              page={pickerPage}
              pageSize={PICKER_PAGE_SIZE}
              total={picker.total}
              onPageChange={setPickerPage}
              itemLabel="problems"
              disabled={pickerBusy}
            />
          </>
        )}

        <div className={styles.selectedHead}>
          <h3>Selected problems</h3>
          {isFull && <span className={styles.muted}>Limit reached</span>}
        </div>
        {selected.length === 0 ? (
          <p className={styles.formNote}>No problems selected yet — add some from the list above. You can also add them later.</p>
        ) : (
          <ol className={styles.selectedList}>
            {selected.map((entry, index) => {
              const pointsInvalid = attempted && !isValidPoints(entry.points);
              return (
                <li key={entry.problemId} className={styles.selectedRow}>
                  <span className={styles.order} aria-hidden="true">
                    {index + 1}
                  </span>
                  <span className={styles.selectedTitle}>
                    <span>{entry.title}</span>
                    <span className={styles.resultMeta}>
                      {entry.difficulty && <span className={`pill pill-${entry.difficulty.toLowerCase()}`}>{entry.difficulty}</span>}
                      {isAdmin && !entry.isPublished && <span className="badge badge-draft">Draft</span>}
                      {entry.isMissing && <span className="badge badge-blocked">Deleted</span>}
                    </span>
                  </span>
                  <span className={styles.pointsField}>
                    <input
                      className={styles.pointsInput}
                      type="number"
                      inputMode="numeric"
                      min={CONTEST_LIMITS.pointsMin}
                      max={CONTEST_LIMITS.pointsMax}
                      step={1}
                      value={entry.points}
                      onChange={(event) => setPoints(entry.problemId, event.target.value)}
                      aria-label={`Points for ${entry.title}`}
                      aria-invalid={pointsInvalid}
                    />
                    <span aria-hidden="true">pts</span>
                  </span>
                  <span className={styles.rowActions}>
                    <button
                      type="button"
                      className="icon-button"
                      onClick={() => moveProblem(index, -1)}
                      disabled={index === 0}
                      aria-label={`Move ${entry.title} up`}
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      className="icon-button"
                      onClick={() => moveProblem(index, 1)}
                      disabled={index === selected.length - 1}
                      aria-label={`Move ${entry.title} down`}
                    >
                      ↓
                    </button>
                    <button
                      type="button"
                      className="icon-button icon-button-danger"
                      onClick={() => removeProblem(entry.problemId)}
                      aria-label={`Remove ${entry.title}`}
                    >
                      Remove
                    </button>
                  </span>
                </li>
              );
            })}
          </ol>
        )}
        {visibleErrors.problems && (
          <p id={`${fieldId("problems")}-error`} className={styles.fieldError} role="alert">
            {visibleErrors.problems}
          </p>
        )}
        {/* Focus target for a problems validation error. */}
        <span id={fieldId("problems")} tabIndex={-1} className={styles.srOnly}>
          Problems
        </span>
      </fieldset>

      <div className="admin-form-actions">
        <button type="submit" className="button button-small" disabled={isSubmitting}>
          {isSubmitting ? submittingLabel : submitLabel}
        </button>
        {cancelHref && (
          <Link className="text-link" href={cancelHref}>
            Cancel
          </Link>
        )}
      </div>
    </form>
  );
}
