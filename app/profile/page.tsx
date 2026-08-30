"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { SiteHeader } from "../_components/home/SiteHeader";
import { SiteFooter } from "../_components/home/SiteFooter";
import { useAuth } from "@/providers/AuthProvider";
import { getMyRank } from "@/lib/api/leaderboard";
import { updateProfile, changePassword } from "@/lib/api/auth";
import { getErrorMessage } from "@/lib/api/client";
import type { MyRank } from "@/types/api";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";

const MAX_AVATAR_BYTES = 4 * 1024 * 1024;
const ALLOWED_AVATAR_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"];

function EditProfileForm({ onDone }: { onDone: () => void }) {
  const { user, refresh } = useAuth();
  const avatarInput = useRef<HTMLInputElement>(null);
  const [name, setName] = useState(user?.name ?? "");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(user?.profilePicUrl ?? null);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    return () => {
      // Only revoke a blob: preview we created ourselves — the initial
      // preview is the user's existing (remote) profilePicUrl, which isn't
      // an object URL and must not be revoked.
      if (avatarFile && avatarPreview) URL.revokeObjectURL(avatarPreview);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pickAvatar = (file: File | undefined) => {
    setError(null);
    if (!file) return;
    if (!ALLOWED_AVATAR_TYPES.includes(file.type)) {
      setError("Please choose a PNG, JPEG, WEBP, or GIF image.");
      return;
    }
    if (file.size > MAX_AVATAR_BYTES) {
      setError("That image is too large — please use one under 4 MB.");
      return;
    }
    if (avatarFile && avatarPreview) URL.revokeObjectURL(avatarPreview);
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    if (name.trim().length < 2) {
      setError("Name must be at least 2 characters.");
      return;
    }
    setIsSaving(true);
    try {
      await updateProfile({ name: name.trim(), avatarFile });
      await refresh();
      onDone();
    } catch (requestError) {
      setError(getErrorMessage(requestError, "Could not update your profile."));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form className="auth-form" onSubmit={submit} style={{ marginTop: 18 }}>
      {error && <p className="form-error">{error}</p>}
      <div className="avatar-picker">
        <button
          type="button"
          className="avatar-picker-circle"
          onClick={() => avatarInput.current?.click()}
          aria-label={avatarPreview ? "Change profile photo" : "Add a profile photo"}
        >
          {avatarPreview ? (
            <Image src={avatarPreview} alt="" width={84} height={84} unoptimized />
          ) : (
            <span className="avatar-picker-placeholder">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="12" cy="8" r="3.6" />
                <path d="M4.5 20c0-3.6 3-6 7.5-6s7.5 2.4 7.5 6" />
              </svg>
            </span>
          )}
          <span className="avatar-picker-badge">{avatarPreview ? "Change" : "Add photo"}</span>
        </button>
        <input
          ref={avatarInput}
          type="file"
          accept={ALLOWED_AVATAR_TYPES.join(",")}
          hidden
          onChange={(event) => pickAvatar(event.target.files?.[0])}
        />
        <div className="avatar-picker-copy">
          <p>Profile photo</p>
          <p className="avatar-picker-hint">PNG, JPEG, WEBP or GIF, up to 4 MB.</p>
        </div>
      </div>
      <label>
        <span className="avatar-picker-copy" style={{ display: "block", marginBottom: 6 }}><p>Name</p></span>
        <input required minLength={2} value={name} onChange={(event) => setName(event.target.value)} />
      </label>
      <div style={{ display: "flex", gap: 12, marginTop: 4 }}>
        <button type="submit" className="button button-small" disabled={isSaving}>{isSaving ? "Saving…" : "Save changes"}</button>
        <button type="button" className="text-link" onClick={onDone} disabled={isSaving}>Cancel</button>
      </div>
    </form>
  );
}

function ChangePasswordForm({ onDone }: { onDone: () => void }) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    if (newPassword.length < 8) {
      setError("New password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("New password and confirmation don't match.");
      return;
    }
    setIsSaving(true);
    try {
      await changePassword({ currentPassword, newPassword });
      onDone();
    } catch (requestError) {
      setError(getErrorMessage(requestError, "Could not change your password."));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form className="auth-form" onSubmit={submit} style={{ marginTop: 18 }}>
      {error && <p className="form-error">{error}</p>}
      <label>
        <span className="avatar-picker-copy" style={{ display: "block", marginBottom: 6 }}><p>Current password</p></span>
        <input required type="password" autoComplete="current-password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} />
      </label>
      <label>
        <span className="avatar-picker-copy" style={{ display: "block", marginBottom: 6 }}><p>New password</p></span>
        <input required minLength={8} type="password" autoComplete="new-password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} />
      </label>
      <label>
        <span className="avatar-picker-copy" style={{ display: "block", marginBottom: 6 }}><p>Confirm new password</p></span>
        <input required minLength={8} type="password" autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} />
      </label>
      <div style={{ display: "flex", gap: 12, marginTop: 4 }}>
        <button type="submit" className="button button-small" disabled={isSaving}>{isSaving ? "Saving…" : "Update password"}</button>
        <button type="button" className="text-link" onClick={onDone} disabled={isSaving}>Cancel</button>
      </div>
    </form>
  );
}

function ProfileContent() {
  // Reuses the shared, Bearer-token-aware auth session instead of a
  // duplicate raw fetch — this is what the httpOnly-cookie-only version of
  // this page was missing, and why it could show "Authentication is
  // required" even right after a successful login on browsers that block
  // the cross-site cookie. See lib/api/client.ts and lib/auth-storage.ts.
  const { user } = useAuth();
  const [rank, setRank] = useState<MyRank | null>(null);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);
  const [passwordSaved, setPasswordSaved] = useState(false);

  useEffect(() => {
    getMyRank()
      .then(setRank)
      .catch(() => setRank(null));
  }, []);

  if (!user) return null;

  return (
    <main className="dashboard-shell">
      <div className="dashboard-head">
        <div>
          <p className="eyebrow">YOUR ARENA / PROFILE</p>
          <h1>Profile & progress</h1>
          <p>Keep your identity, streak and learning goals in one place.</p>
        </div>
        <Link className="button button-small" href="/problems">Continue solving <span>→</span></Link>
      </div>
      <section className="profile-card profile-hero">
        {isEditingProfile ? (
          <EditProfileForm
            onDone={() => {
              setIsEditingProfile(false);
              setProfileSaved(true);
            }}
          />
        ) : (
          <>
            {profileSaved && <p className="form-success" style={{ marginBottom: 12 }}>Profile updated.</p>}
            <div className="avatar">
              {user.profilePicUrl ? (
                <Image src={user.profilePicUrl} alt={`${user.name} profile`} width={112} height={112} priority />
              ) : (
                user.name.slice(0, 1).toUpperCase()
              )}
            </div>
            <div className="profile-identity">
              <span className="panel-kicker">CODER PROFILE</span>
              <h2>{user.name}</h2>
              <p>{user.email}</p>
              <span className="status-pill">● {user.status} · {user.role}</span>
            </div>
            <div className="profile-actions">
              <button
                type="button"
                className="button button-small"
                onClick={() => {
                  setProfileSaved(false);
                  setIsEditingProfile(true);
                }}
              >
                Edit profile
              </button>
              <Link className="button button-small" href="/submissions">View submissions</Link>
              <Link className="text-link" href="/analytics">Open analytics →</Link>
            </div>
          </>
        )}
      </section>
      <section className="metric-grid">
        <article><b>{rank?.problemsSolved ?? 0}</b><span>Problems solved</span><small>{rank?.rank ? `Ranked #${rank.rank}` : "Start your first challenge"}</small></article>
        <article><b>{rank?.totalScore ?? 0}</b><span>Total score</span><small>Best accepted score per problem</small></article>
        <article><b>{user.createdAt ? new Date(user.createdAt).toLocaleDateString() : "—"}</b><span>Member since</span><small>Welcome to AlgoArena</small></article>
      </section>
      <section className="profile-columns">
        <article className="profile-panel">
          <span className="panel-kicker">NEXT MOVE</span>
          <h2>Build your solving rhythm.</h2>
          <p>Choose a problem, submit an approach and use every result as feedback.</p>
          <Link className="text-link" href="/problems">Browse problem library →</Link>
        </article>
        <article className="profile-panel">
          <span className="panel-kicker">ACCOUNT</span>
          <div className="detail-row"><span>Account status</span><strong>{user.status}</strong></div>
          <div className="detail-row"><span>Access level</span><strong>{user.role}</strong></div>
          <div className="detail-row"><span>Profile email</span><strong>{user.email}</strong></div>
          {isChangingPassword ? (
            <ChangePasswordForm
              onDone={() => {
                setIsChangingPassword(false);
                setPasswordSaved(true);
              }}
            />
          ) : (
            <div style={{ marginTop: 18 }}>
              {passwordSaved && <p className="form-success" style={{ marginBottom: 10 }}>Password updated.</p>}
              {user.hasPassword === false ? (
                <p className="avatar-picker-hint">Signed in with Google — no password to change.</p>
              ) : (
                <button
                  type="button"
                  className="text-link"
                  onClick={() => {
                    setPasswordSaved(false);
                    setIsChangingPassword(true);
                  }}
                >
                  Change password →
                </button>
              )}
            </div>
          )}
        </article>
      </section>
    </main>
  );
}

export default function ProfilePage() {
  return (
    <ProtectedRoute>
      <SiteHeader />
      <ProfileContent />
      <SiteFooter />
    </ProtectedRoute>
  );
}
