"use client";

import Link from "next/link";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { useAuth } from "@/providers/AuthProvider";
import { createHostRequest, getMyHostRequest, type HostRequestPayload } from "@/lib/api/hosts";
import { dateTimeLocalToIso, isoToDateTimeLocal } from "@/lib/api/contests";
import { ApiError, getErrorMessage } from "@/lib/api/client";
import type { HostRequest, UserRole } from "@/types/api";
import { Loader } from "@/components/ui/Loader";
import { SiteHeader } from "@/app/_components/home/SiteHeader";
import { SiteFooter } from "@/app/_components/home/SiteFooter";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import styles from "./host.module.css";

// Mirrors the backend's host request validation.
const LIMITS = {
  titleMin: 3,
  titleMax: 120,
  descriptionMin: 10,
  descriptionMax: 2000,
  organizationMax: 120,
  messageMax: 2000,
  participantsMin: 1,
  participantsMax: 100000,
} as const;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const formatDateTime = (iso: string | null | undefined) => {
  if (!iso) return null;
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? null : date.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
};

type FieldKey =
  | "organization"
  | "contestTitle"
  | "contestDescription"
  | "proposedStart"
  | "proposedEnd"
  | "expectedParticipants"
  | "contactEmail"
  | "message";

type FormValues = Record<FieldKey, string>;
type FieldErrors = Partial<Record<FieldKey, string>>;

const FIELD_ORDER: FieldKey[] = [
  "organization",
  "contestTitle",
  "contestDescription",
  "proposedStart",
  "proposedEnd",
  "expectedParticipants",
  "contactEmail",
  "message",
];

const validate = (values: FormValues): FieldErrors => {
  const errors: FieldErrors = {};
  if (values.organization.trim().length > LIMITS.organizationMax)
    errors.organization = `Organization can be at most ${LIMITS.organizationMax} characters.`;

  const title = values.contestTitle.trim();
  if (!title) errors.contestTitle = "Give your contest a working title.";
  else if (title.length < LIMITS.titleMin || title.length > LIMITS.titleMax)
    errors.contestTitle = `Contest title must be ${LIMITS.titleMin}–${LIMITS.titleMax} characters.`;

  const description = values.contestDescription.trim();
  if (!description) errors.contestDescription = "Tell us what the contest is about.";
  else if (description.length < LIMITS.descriptionMin)
    errors.contestDescription = `Please write at least ${LIMITS.descriptionMin} characters.`;
  else if (description.length > LIMITS.descriptionMax)
    errors.contestDescription = `Description can be at most ${LIMITS.descriptionMax} characters.`;

  const startIso = values.proposedStart ? dateTimeLocalToIso(values.proposedStart) : null;
  const endIso = values.proposedEnd ? dateTimeLocalToIso(values.proposedEnd) : null;
  if (values.proposedStart && !startIso) errors.proposedStart = "Enter a valid start date and time.";
  if (values.proposedEnd && !endIso) errors.proposedEnd = "Enter a valid end date and time.";
  else if (startIso && endIso && new Date(endIso).getTime() <= new Date(startIso).getTime())
    errors.proposedEnd = "The end must be after the start.";

  const participants = values.expectedParticipants.trim();
  if (participants) {
    const count = Number(participants);
    if (!/^\d+$/.test(participants) || count < LIMITS.participantsMin || count > LIMITS.participantsMax)
      errors.expectedParticipants = `Enter a whole number from ${LIMITS.participantsMin} to ${LIMITS.participantsMax.toLocaleString()}.`;
  }

  const email = values.contactEmail.trim();
  if (email && !EMAIL_PATTERN.test(email)) errors.contactEmail = "Enter a valid email address.";

  if (values.message.trim().length > LIMITS.messageMax) errors.message = `Message can be at most ${LIMITS.messageMax} characters.`;
  return errors;
};

function RequestSummary({ request }: { request: HostRequest }) {
  const start = formatDateTime(request.proposedStartTime);
  const end = formatDateTime(request.proposedEndTime);
  return (
    <dl className={styles.summary}>
      <div className={styles.summaryWide}>
        <dt>Contest</dt>
        <dd className={styles.summaryTitle}>{request.contestTitle}</dd>
      </div>
      <div className={styles.summaryWide}>
        <dt>Description</dt>
        <dd className={styles.prewrap}>{request.contestDescription}</dd>
      </div>
      {request.organization && (
        <div>
          <dt>Organization</dt>
          <dd>{request.organization}</dd>
        </div>
      )}
      <div>
        <dt>Proposed window</dt>
        <dd>{start && end ? `${start} → ${end}` : start ? `From ${start}` : end ? `Until ${end}` : "Not specified"}</dd>
      </div>
      <div>
        <dt>Expected participants</dt>
        <dd>{request.expectedParticipants ?? "Not specified"}</dd>
      </div>
      {request.contactEmail && (
        <div>
          <dt>Contact email</dt>
          <dd>{request.contactEmail}</dd>
        </div>
      )}
      {request.message && (
        <div className={styles.summaryWide}>
          <dt>Message</dt>
          <dd className={styles.prewrap}>{request.message}</dd>
        </div>
      )}
    </dl>
  );
}

interface HostRequestFormProps {
  defaultEmail: string;
  /** A previous (rejected) request to start from. */
  previous: HostRequest | null;
  onSubmitted: (request: HostRequest) => void;
  /** The server says the request can't be made any more (already pending / already a host). */
  onOutdated: (message: string) => void;
}

function HostRequestForm({ defaultEmail, previous, onSubmitted, onOutdated }: HostRequestFormProps) {
  const baseId = useId();
  const fieldId = (key: FieldKey) => `${baseId}-${key}`;
  const [values, setValues] = useState<FormValues>(() => ({
    organization: previous?.organization ?? "",
    contestTitle: previous?.contestTitle ?? "",
    contestDescription: previous?.contestDescription ?? "",
    proposedStart: isoToDateTimeLocal(previous?.proposedStartTime),
    proposedEnd: isoToDateTimeLocal(previous?.proposedEndTime),
    expectedParticipants: previous?.expectedParticipants ? String(previous.expectedParticipants) : "",
    contactEmail: previous?.contactEmail || defaultEmail,
    message: previous?.message ?? "",
  }));
  const [attempted, setAttempted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // State updates are async; the ref blocks a second submit fired before re-render.
  const submittingRef = useRef(false);

  const errors = validate(values);
  const visibleErrors: FieldErrors = attempted ? errors : {};
  const errorCount = Object.keys(errors).length;

  const update = (key: FieldKey, value: string) => setValues((current) => ({ ...current, [key]: value }));

  const describedBy = (key: FieldKey, hint?: boolean) =>
    [hint && `${fieldId(key)}-hint`, visibleErrors[key] && `${fieldId(key)}-error`].filter(Boolean).join(" ") || undefined;

  const fieldError = (key: FieldKey) =>
    visibleErrors[key] ? (
      <span id={`${fieldId(key)}-error`} className={styles.fieldError}>
        {visibleErrors[key]}
      </span>
    ) : null;

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submittingRef.current) return;
    setAttempted(true);
    const firstInvalid = FIELD_ORDER.find((key) => errors[key]);
    if (firstInvalid) {
      document.getElementById(fieldId(firstInvalid))?.focus();
      return;
    }

    const payload: HostRequestPayload = {
      contestTitle: values.contestTitle.trim(),
      contestDescription: values.contestDescription.trim(),
    };
    const organization = values.organization.trim();
    const contactEmail = values.contactEmail.trim();
    const message = values.message.trim();
    const proposedStartTime = values.proposedStart ? dateTimeLocalToIso(values.proposedStart) : null;
    const proposedEndTime = values.proposedEnd ? dateTimeLocalToIso(values.proposedEnd) : null;
    if (organization) payload.organization = organization;
    if (proposedStartTime) payload.proposedStartTime = proposedStartTime;
    if (proposedEndTime) payload.proposedEndTime = proposedEndTime;
    if (values.expectedParticipants.trim()) payload.expectedParticipants = Number(values.expectedParticipants.trim());
    if (contactEmail) payload.contactEmail = contactEmail;
    if (message) payload.message = message;

    submittingRef.current = true;
    setIsSubmitting(true);
    setError(null);
    try {
      const created = await createHostRequest(payload);
      onSubmitted(created);
    } catch (requestError) {
      if (requestError instanceof ApiError && (requestError.statusCode === 409 || (requestError.statusCode === 400 && /already host/i.test(requestError.message)))) {
        onOutdated(requestError.message);
        return;
      }
      setError(requestError instanceof ApiError ? requestError.message : getErrorMessage(requestError, "Could not send your request. Please try again."));
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

      <label htmlFor={fieldId("contestTitle")}>
        Contest title
        <input
          id={fieldId("contestTitle")}
          value={values.contestTitle}
          onChange={(event) => update("contestTitle", event.target.value)}
          maxLength={LIMITS.titleMax}
          aria-invalid={Boolean(visibleErrors.contestTitle)}
          aria-describedby={describedBy("contestTitle")}
          placeholder="Campus Code Sprint 2026"
          required
        />
        {fieldError("contestTitle")}
      </label>

      <label htmlFor={fieldId("contestDescription")}>
        <span className={styles.labelRow}>
          <span>What&apos;s the contest about?</span>
          <span className={styles.counter}>
            {values.contestDescription.length}/{LIMITS.descriptionMax}
          </span>
        </span>
        <textarea
          id={fieldId("contestDescription")}
          rows={5}
          value={values.contestDescription}
          onChange={(event) => update("contestDescription", event.target.value)}
          maxLength={LIMITS.descriptionMax}
          aria-invalid={Boolean(visibleErrors.contestDescription)}
          aria-describedby={describedBy("contestDescription")}
          placeholder="Audience, format, difficulty, prizes…"
          required
        />
        {fieldError("contestDescription")}
      </label>

      <div className="admin-form-row">
        <label htmlFor={fieldId("organization")}>
          Organization (optional)
          <input
            id={fieldId("organization")}
            value={values.organization}
            onChange={(event) => update("organization", event.target.value)}
            maxLength={LIMITS.organizationMax}
            aria-invalid={Boolean(visibleErrors.organization)}
            aria-describedby={describedBy("organization")}
            placeholder="University coding club"
            autoComplete="organization"
          />
          {fieldError("organization")}
        </label>
        <label htmlFor={fieldId("expectedParticipants")}>
          Expected participants (optional)
          <input
            id={fieldId("expectedParticipants")}
            type="number"
            inputMode="numeric"
            min={LIMITS.participantsMin}
            max={LIMITS.participantsMax}
            step={1}
            value={values.expectedParticipants}
            onChange={(event) => update("expectedParticipants", event.target.value)}
            aria-invalid={Boolean(visibleErrors.expectedParticipants)}
            aria-describedby={describedBy("expectedParticipants")}
            placeholder="50"
          />
          {fieldError("expectedParticipants")}
        </label>
      </div>

      <div className="admin-form-row">
        <label htmlFor={fieldId("proposedStart")}>
          Proposed start (optional)
          <input
            id={fieldId("proposedStart")}
            type="datetime-local"
            value={values.proposedStart}
            onChange={(event) => update("proposedStart", event.target.value)}
            aria-invalid={Boolean(visibleErrors.proposedStart)}
            aria-describedby={describedBy("proposedStart")}
          />
          {fieldError("proposedStart")}
        </label>
        <label htmlFor={fieldId("proposedEnd")}>
          Proposed end (optional)
          <input
            id={fieldId("proposedEnd")}
            type="datetime-local"
            value={values.proposedEnd}
            onChange={(event) => update("proposedEnd", event.target.value)}
            aria-invalid={Boolean(visibleErrors.proposedEnd)}
            aria-describedby={describedBy("proposedEnd")}
          />
          {fieldError("proposedEnd")}
        </label>
      </div>

      <label htmlFor={fieldId("contactEmail")}>
        Contact email
        <input
          id={fieldId("contactEmail")}
          type="email"
          value={values.contactEmail}
          onChange={(event) => update("contactEmail", event.target.value)}
          aria-invalid={Boolean(visibleErrors.contactEmail)}
          aria-describedby={describedBy("contactEmail", true)}
          autoComplete="email"
        />
        <span id={`${fieldId("contactEmail")}-hint`} className={styles.fieldHint}>
          Where an admin can reach you about this request.
        </span>
        {fieldError("contactEmail")}
      </label>

      <label htmlFor={fieldId("message")}>
        <span className={styles.labelRow}>
          <span>Anything else? (optional)</span>
          <span className={styles.counter}>
            {values.message.length}/{LIMITS.messageMax}
          </span>
        </span>
        <textarea
          id={fieldId("message")}
          rows={3}
          value={values.message}
          onChange={(event) => update("message", event.target.value)}
          maxLength={LIMITS.messageMax}
          aria-invalid={Boolean(visibleErrors.message)}
          aria-describedby={describedBy("message")}
          placeholder="Past events you've run, links, special requirements…"
        />
        {fieldError("message")}
      </label>

      <div className="admin-form-actions">
        <button type="submit" className="button button-small" disabled={isSubmitting}>
          {isSubmitting ? "Sending request…" : "Send request"} {!isSubmitting && <span aria-hidden="true">→</span>}
        </button>
      </div>
    </form>
  );
}

type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; role: UserRole; request: HostRequest | null };

function HostContent() {
  const { user, refresh } = useAuth();
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [justSubmitted, setJustSubmitted] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const latestRequestRef = useRef(0);

  const load = useCallback(() => {
    const requestId = ++latestRequestRef.current;
    setState({ status: "loading" });
    getMyHostRequest()
      .then((result) => {
        if (requestId !== latestRequestRef.current) return;
        setState({ status: "ready", role: result.role, request: result.request });
      })
      .catch((requestError) => {
        if (requestId !== latestRequestRef.current) return;
        setState({ status: "error", message: getErrorMessage(requestError, "Could not load your host status.") });
      });
  }, []);

  useEffect(() => {
    // Picks up a freshly approved role (user → guest) in the header and the
    // contest manager's access check without signing out and back in.
    void refresh();
    load();
  }, [refresh, load]);

  const handleSubmitted = (request: HostRequest) => {
    setNotice(null);
    setJustSubmitted(true);
    setState((current) => ({ status: "ready", role: current.status === "ready" ? current.role : (user?.role ?? "user"), request }));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleOutdated = (message: string) => {
    setNotice(message);
    void refresh();
    load();
  };

  let body: React.ReactNode;
  if (state.status === "loading") {
    body = (
      <div className={styles.card}>
        <Loader label="Checking your host status…" />
      </div>
    );
  } else if (state.status === "error") {
    body = (
      <div className={`${styles.card} ${styles.cardError}`} role="alert">
        <h2>Couldn&apos;t load your host status</h2>
        <p className="form-error">{state.message}</p>
        <button type="button" className="button button-small" onClick={load}>
          Retry
        </button>
      </div>
    );
  } else if (state.role === "admin") {
    body = (
      <div className={`${styles.card} ${styles.cardInfo}`}>
        <span className={styles.statusTag}>Admin</span>
        <h2>You can already run contests</h2>
        <p>As an admin you can create, edit and delete every contest on AlgoArena — no request needed.</p>
        <Link className="button button-small" href="/admin/contests">
          Open the contest manager <span aria-hidden="true">→</span>
        </Link>
      </div>
    );
  } else if (state.role === "guest") {
    body = (
      <div className={`${styles.card} ${styles.cardSuccess}`}>
        <span className={styles.statusTag}>Approved host</span>
        <h2>You&apos;re an approved host</h2>
        <p>Schedule contests, pick problems from the library, and manage the contests you&apos;ve created.</p>
        {state.request?.reviewNote && (
          <p className={styles.reviewNote}>
            <b>Note from the reviewer:</b> {state.request.reviewNote}
          </p>
        )}
        <Link className="button button-small" href="/admin/contests">
          Manage your contests <span aria-hidden="true">→</span>
        </Link>
      </div>
    );
  } else if (state.request?.status === "pending") {
    body = (
      <div className={`${styles.card} ${styles.cardPending}`}>
        {justSubmitted && (
          <p className="form-success" role="status">
            Request sent! An admin will review it soon.
          </p>
        )}
        <span className={styles.statusTag}>Pending review</span>
        <h2>Your request is waiting for review</h2>
        <p>
          Submitted {formatDateTime(state.request.createdAt) ?? "recently"}. You&apos;ll get host access as soon as an admin approves it — check back
          here any time.
        </p>
        <RequestSummary request={state.request} />
      </div>
    );
  } else {
    const previous = state.request;
    body = (
      <>
        {previous?.status === "rejected" && (
          <div className={`${styles.card} ${styles.cardRejected}`}>
            <span className={styles.statusTag}>Not approved</span>
            <h2>Your last request wasn&apos;t approved</h2>
            <p>
              Your request for &ldquo;{previous.contestTitle}&rdquo;
              {formatDateTime(previous.reviewedAt) ? ` was reviewed on ${formatDateTime(previous.reviewedAt)}` : " was reviewed"}. You&apos;re welcome to
              apply again — we&apos;ve filled in the form with your previous answers.
            </p>
            {previous.reviewNote && (
              <p className={styles.reviewNote}>
                <b>Note from the reviewer:</b> {previous.reviewNote}
              </p>
            )}
          </div>
        )}
        {previous?.status === "approved" && (
          <p className={styles.softNote}>Your earlier request was approved, but your account doesn&apos;t have host access right now. You can apply again below.</p>
        )}
        <div className={styles.card}>
          <h2>{previous?.status === "rejected" ? "Apply again" : "Request host access"}</h2>
          <p className={styles.cardHint}>Tell us about the contest you&apos;d like to run. An admin reviews every request.</p>
          <HostRequestForm
            key={previous?.id ?? "new"}
            defaultEmail={user?.email ?? ""}
            previous={previous?.status === "rejected" ? previous : null}
            onSubmitted={handleSubmitted}
            onOutdated={handleOutdated}
          />
        </div>
      </>
    );
  }

  return (
    <main className={`section-shell workspace ${styles.page}`}>
      <p className="eyebrow">
        <b />
        HOST A CONTEST
      </p>
      <h1>Run your own contest</h1>
      <p className={styles.lead}>
        Clubs, classrooms and communities can host contests on AlgoArena — with the same editor, judge and live scoreboard as every other contest.
      </p>

      <div className={styles.layout}>
        <aside className={styles.perks} aria-labelledby="host-perks-title">
          <h2 id="host-perks-title">What a host can do</h2>
          <ul>
            <li>Schedule contests with your own start and end time.</li>
            <li>Build the problem set from AlgoArena&apos;s published problem library and set the points.</li>
            <li>Participants register and compete on a live scoreboard.</li>
            <li>Edit or delete your own contests any time — other people&apos;s contests stay out of reach.</li>
          </ul>
          <h2>How it works</h2>
          <ol>
            <li>Send a short request about the contest you want to run.</li>
            <li>An admin reviews it.</li>
            <li>Once approved, &ldquo;Contests&rdquo; opens up in your host panel.</li>
          </ol>
        </aside>

        <section className={styles.panel} aria-live="polite">
          {notice && (
            <p className={styles.softNote} role="status">
              {notice}
            </p>
          )}
          {body}
        </section>
      </div>
    </main>
  );
}

export default function HostPage() {
  return (
    <ProtectedRoute>
      <SiteHeader />
      <HostContent />
      <SiteFooter />
    </ProtectedRoute>
  );
}
