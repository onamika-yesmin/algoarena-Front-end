"use client";

// The problem proposal form, shared by "Propose a problem" and "Edit
// proposal". The fields mirror the admin "Create problem" form except the
// slug, points and visibility, which the reviewing admin decides.

import Link from "next/link";
import { useId, useRef, useState } from "react";
import type { Difficulty, Language } from "@/types/api";
import { PROPOSAL_LIMITS as LIMITS, type ProposalDetail, type ProposalInput } from "@/lib/api/proposals";
import styles from "./ProposalForm.module.css";

const LANGUAGES: { value: Language; label: string }[] = [
  { value: "python", label: "Python" },
  { value: "cpp", label: "C++" },
  { value: "javascript", label: "JavaScript" },
  { value: "typescript", label: "TypeScript" },
];

interface CaseValues {
  input: string;
  expectedOutput: string;
  explanation: string;
  isSample: boolean;
}

interface FormValues {
  title: string;
  difficulty: Difficulty;
  tags: string;
  statement: string;
  inputFormat: string;
  outputFormat: string;
  constraints: string;
  timeLimitMs: string;
  memoryLimitMb: string;
  testCases: CaseValues[];
  starterCode: Record<Language, string>;
  referenceLanguage: Language;
  referenceCode: string;
  noteToReviewer: string;
}

type FieldErrors = Record<string, string>;

const emptyCase = (isSample: boolean): CaseValues => ({ input: "", expectedOutput: "", explanation: "", isSample });

const fromDetail = (detail?: ProposalDetail): FormValues => ({
  title: detail?.title ?? "",
  difficulty: detail?.difficulty ?? "EASY",
  tags: detail?.tags.join(", ") ?? "",
  statement: detail?.statement ?? "",
  inputFormat: detail?.inputFormat ?? "",
  outputFormat: detail?.outputFormat ?? "",
  constraints: detail?.constraints ?? "",
  timeLimitMs: String(detail?.timeLimitMs ?? 2000),
  memoryLimitMb: String(detail?.memoryLimitMb ?? 256),
  testCases: detail?.testCases.length
    ? detail.testCases.map((testCase) => ({ ...testCase, explanation: testCase.explanation ?? "" }))
    : [emptyCase(true), emptyCase(false)],
  starterCode: {
    python: detail?.starterCode.python ?? "",
    cpp: detail?.starterCode.cpp ?? "",
    javascript: detail?.starterCode.javascript ?? "",
    typescript: detail?.starterCode.typescript ?? "",
  },
  referenceLanguage: detail?.referenceSolution?.language ?? "python",
  referenceCode: detail?.referenceSolution?.code ?? "",
  noteToReviewer: detail?.noteToReviewer ?? "",
});

const parseTags = (text: string) => {
  const tags: string[] = [];
  for (const raw of text.split(",")) {
    const tag = raw.trim();
    if (tag && !tags.some((existing) => existing.toLowerCase() === tag.toLowerCase())) tags.push(tag);
  }
  return tags;
};

// A block with neither an input nor an expected output is ignored on save.
const isBlankCase = (testCase: CaseValues) => !testCase.input.trim() && !testCase.expectedOutput.trim();

const wholeNumber = (text: string) => (/^\d+$/.test(text.trim()) ? Number(text.trim()) : Number.NaN);

// Mirrors the back end's validation; keys are also the ids of the inputs to focus.
const validate = (values: FormValues): FieldErrors => {
  const errors: FieldErrors = {};

  const title = values.title.trim();
  if (!title) errors.title = "Give the problem a title.";
  else if (title.length < LIMITS.titleMin || title.length > LIMITS.titleMax)
    errors.title = `The title must be ${LIMITS.titleMin}–${LIMITS.titleMax} characters.`;

  const tags = parseTags(values.tags);
  if (tags.length > LIMITS.tagsMax) errors.tags = `Use at most ${LIMITS.tagsMax} tags.`;
  else if (tags.some((tag) => tag.length > LIMITS.tagMax)) errors.tags = `Each tag can be at most ${LIMITS.tagMax} characters.`;

  const statement = values.statement.trim();
  if (!statement) errors.statement = "Describe the problem.";
  else if (statement.length < LIMITS.statementMin) errors.statement = `Please write at least ${LIMITS.statementMin} characters.`;
  else if (statement.length > LIMITS.statementMax) errors.statement = `The statement can be at most ${LIMITS.statementMax} characters.`;

  if (values.inputFormat.trim().length > LIMITS.formatMax) errors.inputFormat = `At most ${LIMITS.formatMax} characters.`;
  if (values.outputFormat.trim().length > LIMITS.formatMax) errors.outputFormat = `At most ${LIMITS.formatMax} characters.`;
  if (values.constraints.trim().length > LIMITS.constraintsMax) errors.constraints = `At most ${LIMITS.constraintsMax} characters.`;

  const time = wholeNumber(values.timeLimitMs);
  if (!(time >= LIMITS.timeLimitMin && time <= LIMITS.timeLimitMax))
    errors.timeLimitMs = `Enter a whole number from ${LIMITS.timeLimitMin} to ${LIMITS.timeLimitMax}.`;
  const memory = wholeNumber(values.memoryLimitMb);
  if (!(memory >= LIMITS.memoryLimitMin && memory <= LIMITS.memoryLimitMax))
    errors.memoryLimitMb = `Enter a whole number from ${LIMITS.memoryLimitMin} to ${LIMITS.memoryLimitMax}.`;

  values.testCases.forEach((testCase, index) => {
    if (testCase.input.length > LIMITS.testCaseTextMax) errors[`case-${index}-input`] = `At most ${LIMITS.testCaseTextMax} characters.`;
    if (testCase.expectedOutput.length > LIMITS.testCaseTextMax)
      errors[`case-${index}-expectedOutput`] = `At most ${LIMITS.testCaseTextMax} characters.`;
    if (testCase.explanation.trim().length > LIMITS.explanationMax)
      errors[`case-${index}-explanation`] = `At most ${LIMITS.explanationMax} characters.`;
  });
  const filled = values.testCases.filter((testCase) => !isBlankCase(testCase));
  if (!filled.length) errors.testCases = "Add at least one test case with an input or an expected output.";
  else if (!filled.some((testCase) => testCase.isSample))
    errors.testCases = "Mark at least one filled-in test case as a sample, so learners can see an example.";

  for (const { value, label } of LANGUAGES) {
    if (values.starterCode[value].length > LIMITS.codeMax) errors[`starter-${value}`] = `${label} starter code can be at most ${LIMITS.codeMax} characters.`;
  }
  if (values.referenceCode.length > LIMITS.codeMax) errors.referenceCode = `At most ${LIMITS.codeMax} characters.`;
  if (values.noteToReviewer.trim().length > LIMITS.noteMax) errors.noteToReviewer = `At most ${LIMITS.noteMax} characters.`;
  return errors;
};

const toProposalInput = (values: FormValues): ProposalInput => ({
  title: values.title.trim(),
  statement: values.statement.trim(),
  inputFormat: values.inputFormat.trim(),
  outputFormat: values.outputFormat.trim(),
  constraints: values.constraints.trim(),
  difficulty: values.difficulty,
  tags: parseTags(values.tags),
  timeLimitMs: wholeNumber(values.timeLimitMs),
  memoryLimitMb: wholeNumber(values.memoryLimitMb),
  testCases: values.testCases
    .filter((testCase) => !isBlankCase(testCase))
    .map(({ input, expectedOutput, explanation, isSample }) => ({
      input,
      expectedOutput,
      ...(explanation.trim() ? { explanation: explanation.trim() } : {}),
      isSample,
    })),
  starterCode: values.starterCode,
  ...(values.referenceCode.trim() ? { referenceSolution: { language: values.referenceLanguage, code: values.referenceCode } } : {}),
  noteToReviewer: values.noteToReviewer.trim(),
});

interface ProposalFormProps {
  initial?: ProposalDetail;
  submitLabel: string;
  submittingLabel: string;
  cancelHref: string;
  /** A request error from the page (the form shows its own validation errors). */
  error: string | null;
  onSubmit: (input: ProposalInput) => Promise<void>;
}

export function ProposalForm({ initial, submitLabel, submittingLabel, cancelHref, error, onSubmit }: ProposalFormProps) {
  const baseId = useId();
  const fieldId = (key: string) => `${baseId}-${key}`;
  const [values, setValues] = useState<FormValues>(() => fromDetail(initial));
  const [attempted, setAttempted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  // State updates are async; the ref blocks a second submit fired before re-render.
  const submittingRef = useRef(false);

  const errors = validate(values);
  const visible: FieldErrors = attempted ? errors : {};
  const errorCount = Object.keys(errors).length;
  const hasStarterCode = LANGUAGES.some(({ value }) => values.starterCode[value].trim());

  const update = <K extends keyof FormValues>(key: K, value: FormValues[K]) => setValues((current) => ({ ...current, [key]: value }));

  const updateCase = (index: number, patch: Partial<CaseValues>) =>
    setValues((current) => ({
      ...current,
      testCases: current.testCases.map((testCase, i) => (i === index ? { ...testCase, ...patch } : testCase)),
    }));

  const addCase = () =>
    setValues((current) =>
      current.testCases.length >= LIMITS.testCasesMax ? current : { ...current, testCases: [...current.testCases, emptyCase(false)] },
    );

  const removeCase = (index: number) =>
    setValues((current) => ({ ...current, testCases: current.testCases.filter((_, i) => i !== index) }));

  // id, aria-invalid and aria-describedby for the input behind `key`.
  const fieldProps = (key: string, hint = false) => ({
    id: fieldId(key),
    "aria-invalid": Boolean(visible[key]),
    "aria-describedby": [hint && `${fieldId(key)}-hint`, visible[key] && `${fieldId(key)}-error`].filter(Boolean).join(" ") || undefined,
  });

  const fieldError = (key: string) =>
    visible[key] ? (
      <span id={`${fieldId(key)}-error`} className={styles.fieldError}>
        {visible[key]}
      </span>
    ) : null;

  const counter = (length: number, max: number) => (
    <span className={styles.counter}>
      {length}/{max}
    </span>
  );

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submittingRef.current) return;
    setAttempted(true);
    const firstInvalid = Object.keys(errors)[0];
    if (firstInvalid) {
      document.getElementById(fieldId(firstInvalid === "testCases" ? "case-0-input" : firstInvalid))?.focus();
      return;
    }
    submittingRef.current = true;
    setIsSubmitting(true);
    try {
      await onSubmit(toProposalInput(values));
    } finally {
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  return (
    <form className={`admin-form ${styles.form}`} onSubmit={submit} noValidate aria-busy={isSubmitting}>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      {attempted && errorCount > 0 && (
        <p className="form-error" role="alert">
          Please fix {errorCount === 1 ? "the highlighted field" : `the ${errorCount} highlighted fields`} below.
        </p>
      )}

      <fieldset className={styles.section}>
        <legend>The problem</legend>
        <label htmlFor={fieldId("title")}>
          <span className={styles.labelRow}>
            <span>Title</span>
            {counter(values.title.length, LIMITS.titleMax)}
          </span>
          <input
            {...fieldProps("title")}
            value={values.title}
            maxLength={LIMITS.titleMax}
            onChange={(event) => update("title", event.target.value)}
            placeholder="Sum of Two Numbers"
          />
          {fieldError("title")}
        </label>
        <div className="admin-form-row">
          <label htmlFor={fieldId("difficulty")}>
            Difficulty
            <select id={fieldId("difficulty")} value={values.difficulty} onChange={(event) => update("difficulty", event.target.value as Difficulty)}>
              <option value="EASY">Easy</option>
              <option value="MEDIUM">Medium</option>
              <option value="HARD">Hard</option>
            </select>
          </label>
          <label htmlFor={fieldId("tags")}>
            Tags (optional)
            <input {...fieldProps("tags", true)} value={values.tags} onChange={(event) => update("tags", event.target.value)} placeholder="math, arrays" />
            <span id={`${fieldId("tags")}-hint`} className={styles.fieldHint}>
              Comma-separated, up to {LIMITS.tagsMax}.
            </span>
            {fieldError("tags")}
          </label>
        </div>
        <label htmlFor={fieldId("statement")}>
          <span className={styles.labelRow}>
            <span>Statement</span>
            {counter(values.statement.length, LIMITS.statementMax)}
          </span>
          <textarea
            {...fieldProps("statement")}
            rows={8}
            value={values.statement}
            maxLength={LIMITS.statementMax}
            onChange={(event) => update("statement", event.target.value)}
            placeholder="Explain the task clearly: what the program receives and what it must print."
          />
          {fieldError("statement")}
        </label>
        <div className="admin-form-row">
          <label htmlFor={fieldId("inputFormat")}>
            Input format (optional)
            <textarea {...fieldProps("inputFormat")} rows={3} value={values.inputFormat} maxLength={LIMITS.formatMax} onChange={(event) => update("inputFormat", event.target.value)} />
            {fieldError("inputFormat")}
          </label>
          <label htmlFor={fieldId("outputFormat")}>
            Output format (optional)
            <textarea {...fieldProps("outputFormat")} rows={3} value={values.outputFormat} maxLength={LIMITS.formatMax} onChange={(event) => update("outputFormat", event.target.value)} />
            {fieldError("outputFormat")}
          </label>
        </div>
        <label htmlFor={fieldId("constraints")}>
          Constraints (optional)
          <textarea {...fieldProps("constraints")} rows={3} value={values.constraints} maxLength={LIMITS.constraintsMax} onChange={(event) => update("constraints", event.target.value)} placeholder="1 ≤ n ≤ 10^5" />
          {fieldError("constraints")}
        </label>
        <div className="admin-form-row">
          <label htmlFor={fieldId("timeLimitMs")}>
            Time limit (ms)
            <input
              {...fieldProps("timeLimitMs")}
              type="number"
              inputMode="numeric"
              min={LIMITS.timeLimitMin}
              max={LIMITS.timeLimitMax}
              value={values.timeLimitMs}
              onChange={(event) => update("timeLimitMs", event.target.value)}
            />
            {fieldError("timeLimitMs")}
          </label>
          <label htmlFor={fieldId("memoryLimitMb")}>
            Memory limit (MB)
            <input
              {...fieldProps("memoryLimitMb")}
              type="number"
              inputMode="numeric"
              min={LIMITS.memoryLimitMin}
              max={LIMITS.memoryLimitMax}
              value={values.memoryLimitMb}
              onChange={(event) => update("memoryLimitMb", event.target.value)}
            />
            {fieldError("memoryLimitMb")}
          </label>
        </div>
      </fieldset>

      <fieldset className={styles.section}>
        <legend>
          Test cases ({values.testCases.length}/{LIMITS.testCasesMax})
        </legend>
        <p className={styles.sectionHint}>
          Samples are shown to learners on the problem page; the rest stay hidden and are used for grading. Mark at least one as a sample. An empty block is ignored.
        </p>
        {visible.testCases && (
          <p className={styles.sectionError} role="alert">
            {visible.testCases}
          </p>
        )}
        <div className={styles.cases}>
          {values.testCases.map((testCase, index) => (
            <div key={index} className={`${styles.case}${testCase.isSample ? ` ${styles.caseSample}` : ""}`}>
              <div className={styles.caseHead}>
                <p className={styles.caseTitle}>
                  Test case {index + 1} · {testCase.isSample ? "Sample" : "Hidden"}
                </p>
                <div className={styles.caseActions}>
                  <label className={styles.checkLabel}>
                    <input type="checkbox" checked={testCase.isSample} onChange={(event) => updateCase(index, { isSample: event.target.checked })} />
                    Sample (visible to learners)
                  </label>
                  {values.testCases.length > 1 && (
                    <button type="button" className="icon-button icon-button-danger" onClick={() => removeCase(index)}>
                      Remove
                    </button>
                  )}
                </div>
              </div>
              <div className="admin-form-row">
                <label htmlFor={fieldId(`case-${index}-input`)}>
                  Input
                  <textarea
                    {...fieldProps(`case-${index}-input`)}
                    className={styles.mono}
                    rows={3}
                    value={testCase.input}
                    onChange={(event) => updateCase(index, { input: event.target.value })}
                  />
                  {fieldError(`case-${index}-input`)}
                </label>
                <label htmlFor={fieldId(`case-${index}-expectedOutput`)}>
                  Expected output
                  <textarea
                    {...fieldProps(`case-${index}-expectedOutput`)}
                    className={styles.mono}
                    rows={3}
                    value={testCase.expectedOutput}
                    onChange={(event) => updateCase(index, { expectedOutput: event.target.value })}
                  />
                  {fieldError(`case-${index}-expectedOutput`)}
                </label>
              </div>
              <label htmlFor={fieldId(`case-${index}-explanation`)}>
                Explanation (optional, shown with samples)
                <input
                  {...fieldProps(`case-${index}-explanation`)}
                  value={testCase.explanation}
                  maxLength={LIMITS.explanationMax}
                  onChange={(event) => updateCase(index, { explanation: event.target.value })}
                />
                {fieldError(`case-${index}-explanation`)}
              </label>
            </div>
          ))}
        </div>
        <button type="button" className={`icon-button ${styles.addCase}`} onClick={addCase} disabled={values.testCases.length >= LIMITS.testCasesMax}>
          + Add test case
        </button>
      </fieldset>

      <details className={styles.collapsible} open={hasStarterCode || undefined}>
        <summary>Starter code (optional)</summary>
        <div className={styles.collapsibleBody}>
          <p className={styles.sectionHint}>The code learners see in the editor when they open the problem — usually just the input reading.</p>
          <div className="admin-form-row">
            {LANGUAGES.map(({ value, label }) => (
              <label key={value} htmlFor={fieldId(`starter-${value}`)}>
                {label}
                <textarea
                  {...fieldProps(`starter-${value}`)}
                  className={styles.mono}
                  rows={5}
                  value={values.starterCode[value]}
                  onChange={(event) => update("starterCode", { ...values.starterCode, [value]: event.target.value })}
                />
                {fieldError(`starter-${value}`)}
              </label>
            ))}
          </div>
        </div>
      </details>

      <fieldset className={styles.section}>
        <legend>Reference solution (optional)</legend>
        <p className={styles.sectionHint}>A correct solution helps the reviewer check your test cases faster. It is never shown to learners.</p>
        <label htmlFor={fieldId("referenceLanguage")} className={styles.narrow}>
          Language
          <select
            id={fieldId("referenceLanguage")}
            value={values.referenceLanguage}
            onChange={(event) => update("referenceLanguage", event.target.value as Language)}
          >
            {LANGUAGES.map(({ value, label }) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label htmlFor={fieldId("referenceCode")}>
          Solution code
          <textarea {...fieldProps("referenceCode")} className={styles.mono} rows={8} value={values.referenceCode} onChange={(event) => update("referenceCode", event.target.value)} />
          {fieldError("referenceCode")}
        </label>
      </fieldset>

      <label htmlFor={fieldId("noteToReviewer")}>
        <span className={styles.labelRow}>
          <span>Note for the reviewer (optional)</span>
          {counter(values.noteToReviewer.length, LIMITS.noteMax)}
        </span>
        <textarea
          {...fieldProps("noteToReviewer")}
          rows={3}
          value={values.noteToReviewer}
          maxLength={LIMITS.noteMax}
          onChange={(event) => update("noteToReviewer", event.target.value)}
          placeholder="Where the idea comes from, what it teaches, anything the admin should know…"
        />
        {fieldError("noteToReviewer")}
      </label>

      <div className={styles.actions}>
        <button type="submit" className="button button-small" disabled={isSubmitting}>
          {isSubmitting ? submittingLabel : submitLabel} {!isSubmitting && <span aria-hidden="true">→</span>}
        </button>
        <Link className="text-link" href={cancelHref}>
          Cancel
        </Link>
      </div>
    </form>
  );
}
