"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { appConfig } from "@/lib/config";
import { setTokens } from "@/lib/auth-storage";
import { Spinner } from "@/components/ui/Loader";
import { CountUp } from "@/components/ui/CountUp";
import { IconCheck } from "@/app/_components/home/icons";

declare global {
    interface Window {
        google?: { accounts: { id: {
            initialize: (options: { client_id: string; callback: (response: { credential: string }) => void }) => void;
            renderButton: (element: HTMLElement, options: { theme: string; size: string; width: number; text: string }) => void;
        } } };
    }
}

const MAX_AVATAR_BYTES = 4 * 1024 * 1024;
const ALLOWED_AVATAR_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"];

// Where to send someone after they authenticate — honors a ?next=/path
// query param (set by "Sign in" links from gated pages/actions) so they
// land back where they started instead of always on /problems. Guarded
// against open redirects: only an in-site path starting with a single "/"
// is ever accepted.
function getNextPath(): string {
    if (typeof window === "undefined") return "/problems";
    const next = new URLSearchParams(window.location.search).get("next");
    return next && next.startsWith("/") && !next.startsWith("//") ? next : "/problems";
}

export default function SignInPage() {
    const googleButton = useRef<HTMLDivElement>(null);
    const avatarInput = useRef<HTMLInputElement>(null);
    const [message, setMessage] = useState("Sign in securely with Google. New here? Your account will be created automatically.");
    const [isLoading, setIsLoading] = useState(true);
    const [mode, setMode] = useState<"login" | "register">("login");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [avatarFile, setAvatarFile] = useState<File | null>(null);
    const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
    const [avatarError, setAvatarError] = useState<string | null>(null);

    // Revoke the object URL whenever it's replaced or the page unmounts, so
    // switching photos (or leaving the page) doesn't leak blob: URLs.
    useEffect(() => {
        return () => {
            if (avatarPreview) URL.revokeObjectURL(avatarPreview);
        };
    }, [avatarPreview]);

    // Lets a "Create free account" link elsewhere on the site (?mode=register)
    // land straight on the register tab instead of making people click twice.
    useEffect(() => {
        if (new URLSearchParams(window.location.search).get("mode") === "register") setMode("register");
    }, []);

    const pickAvatar = (file: File | undefined) => {
        setAvatarError(null);
        if (!file) return;
        if (!ALLOWED_AVATAR_TYPES.includes(file.type)) {
            setAvatarError("Please choose a PNG, JPEG, WEBP, or GIF image.");
            return;
        }
        if (file.size > MAX_AVATAR_BYTES) {
            setAvatarError("That image is too large — please use one under 4 MB.");
            return;
        }
        if (avatarPreview) URL.revokeObjectURL(avatarPreview);
        setAvatarFile(file);
        setAvatarPreview(URL.createObjectURL(file));
    };

    const clearAvatar = () => {
        if (avatarPreview) URL.revokeObjectURL(avatarPreview);
        setAvatarFile(null);
        setAvatarPreview(null);
        setAvatarError(null);
        if (avatarInput.current) avatarInput.current.value = "";
    };

    const switchMode = (target: "login" | "register") => {
        if (target === mode) return;
        clearAvatar();
        setMode(target);
    };

    const submitCredentials = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setIsSubmitting(true);
        const form = new FormData(event.currentTarget);

        try {
            let body: FormData | string;
            let headers: Record<string, string> | undefined;

            if (mode === "register") {
                // multipart/form-data so the optional avatar file can ride along
                // with the text fields in one request — the backend's avatarUpload
                // middleware only engages when a file is actually attached.
                if (avatarFile) form.set("avatar", avatarFile);
                body = form;
                headers = undefined; // let the browser set the multipart boundary
            } else {
                body = JSON.stringify(Object.fromEntries(form.entries()));
                headers = { "Content-Type": "application/json" };
            }

            const response = await fetch(`${appConfig.apiUrl}/api/auth/${mode === "login" ? "login" : "register"}`, {
                method: "POST",
                headers,
                credentials: "include",
                body,
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.message ?? "Authentication failed.");
            // Store the JWTs as a Bearer-token fallback — see lib/auth-storage.ts.
            // The cookie may or may not have been accepted by the browser; this
            // guarantees the session still works either way.
            if (result.data?.accessToken && result.data?.refreshToken) {
                setTokens(result.data.accessToken, result.data.refreshToken);
            }
            window.location.assign(getNextPath());
        } catch (error) {
            setMessage(error instanceof Error ? error.message : "Authentication failed.");
            setIsSubmitting(false);
        }
    };

    useEffect(() => {
        let resizeHandler: (() => void) | null = null;

        const setupGoogleSignIn = async () => {
            try {
                // apiUrl is intentionally "" by default (a same-origin relative
                // path proxied by next.config.ts) — that is not misconfiguration.
                const configResponse = await fetch(`${appConfig.apiUrl}/api/auth/google/client-config`);
                const config = await configResponse.json();
                if (!configResponse.ok || !config.data?.clientId) throw new Error(config.message ?? "Google sign-in is unavailable.");

                const script = document.createElement("script");
                script.src = "https://accounts.google.com/gsi/client";
                script.async = true;
                script.onload = () => {
                    if (!window.google || !googleButton.current) return;
                    window.google.accounts.id.initialize({
                        client_id: config.data.clientId,
                        callback: async ({ credential }) => {
                            setIsLoading(true);
                            setMessage("Signing you in…");
                            try {
                                const response = await fetch(`${appConfig.apiUrl}/api/auth/google`, {
                                    method: "POST", headers: { "Content-Type": "application/json" },
                                    credentials: "include", body: JSON.stringify({ idToken: credential }),
                                });
                                const result = await response.json();
                                if (!response.ok) throw new Error(result.message ?? "Sign-in failed.");
                                if (result.data?.accessToken && result.data?.refreshToken) {
                                    setTokens(result.data.accessToken, result.data.refreshToken);
                                }
                                window.location.assign(getNextPath());
                            } catch (error) {
                                setMessage(error instanceof Error ? error.message : "Sign-in failed. Please try again.");
                                setIsLoading(false);
                            }
                        },
                    });

                    // The GSI button renders at a fixed pixel width and never
                    // resizes itself afterwards — a hardcoded width (previously
                    // 320px) overflows the auth card on narrow phones, since the
                    // card's own padding can leave less than that available.
                    // Measure the actual container width each time instead, and
                    // clamp to GSI's supported range (200–400px).
                    const renderGoogleButton = () => {
                        if (!window.google || !googleButton.current) return;
                        googleButton.current.innerHTML = "";
                        const available = googleButton.current.offsetWidth || 320;
                        const width = Math.round(Math.max(200, Math.min(400, available)));
                        window.google.accounts.id.renderButton(googleButton.current, { theme: "outline", size: "large", width, text: "continue_with" });
                    };

                    renderGoogleButton();
                    setIsLoading(false);

                    // Re-measure on resize/orientation change (e.g. rotating a
                    // phone, or resizing a desktop window) so the button keeps
                    // matching the card instead of staying stuck at whatever
                    // width it first mounted at.
                    let resizeTimeout: ReturnType<typeof setTimeout>;
                    resizeHandler = () => {
                        clearTimeout(resizeTimeout);
                        resizeTimeout = setTimeout(renderGoogleButton, 150);
                    };
                    window.addEventListener("resize", resizeHandler);
                };
                script.onerror = () => { setMessage("Google sign-in could not load. Please try again."); setIsLoading(false); };
                document.head.appendChild(script);
            } catch (error) {
                setMessage(error instanceof Error ? error.message : "Unable to start sign-in."); setIsLoading(false);
            }
        };
        setupGoogleSignIn();

        return () => {
            if (resizeHandler) window.removeEventListener("resize", resizeHandler);
        };
    }, []);

    return (
      <main className="auth-page">
        <section className="auth-visual" aria-hidden="true">
          <div className="auth-visual-glow" />
          <Link className="brand" href="/">Algo<span>Arena</span><i>{" //"}</i></Link>
          <h2>Practice with purpose.<br />Compete with people who love it.</h2>
          <ul className="spotlight-list">
            <li><IconCheck /> Every submission, streak, and verdict saved to your profile</li>
            <li><IconCheck /> Weekly contests with a live, global leaderboard</li>
            <li><IconCheck /> Scored AI mock interviews with written feedback</li>
          </ul>
          <div className="auth-visual-stats">
            <div><strong><CountUp value={10000} suffix="+" /></strong><span>solutions this week</span></div>
            <div><strong><CountUp value={4.9} decimals={1} suffix="/5" /></strong><span>learner rating</span></div>
          </div>
        </section>

        <section className="auth-form-side">
          <div className="auth-card">
            <Link className="brand auth-card-brand" href="/">Algo<span>Arena</span><i>{" //"}</i></Link>
            <div className="auth-mode-toggle" role="tablist" aria-label="Sign in or create an account">
              <button type="button" role="tab" aria-selected={mode === "login"} className={mode === "login" ? "is-active" : undefined} onClick={() => switchMode("login")}>
                Sign in
              </button>
              <button type="button" role="tab" aria-selected={mode === "register"} className={mode === "register" ? "is-active" : undefined} onClick={() => switchMode("register")}>
                Create account
              </button>
            </div>
            <p className="eyebrow"><b />ACCOUNT ACCESS</p>
            <h1>{mode === "login" ? "Welcome back." : "Create your account."}</h1>
            <p className="auth-copy">{message}</p>
            <form key={mode} className="auth-form auth-form-anim" onSubmit={submitCredentials}>
              {mode === "register" && (
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
                    <p>Profile photo <span>(optional)</span></p>
                    <p className="avatar-picker-hint">PNG, JPEG, WEBP or GIF, up to 4 MB.</p>
                    {avatarFile && (
                      <button type="button" className="avatar-picker-remove" onClick={clearAvatar}>
                        Remove photo
                      </button>
                    )}
                    {avatarError && <p className="form-error">{avatarError}</p>}
                  </div>
                </div>
              )}
              {mode === "register" && <input name="name" required minLength={2} placeholder="Your name" />}
              <input name="email" type="email" required placeholder="Email address" />
              <input name="password" type="password" required minLength={8} placeholder="Password (8+ characters)" />
              <button className="button" disabled={isSubmitting} type="submit">{isSubmitting ? "Please wait…" : mode === "login" ? "Sign in" : "Create account"}</button>
            </form>
            <p className="auth-divider">or continue with Google</p><div className="google-button" ref={googleButton} />
            {isLoading && <p className="auth-status"><Spinner size="sm" /> Preparing Google sign-in…</p>}
            <Link className="text-link" href="/">← Back to home</Link>
          </div>
        </section>
      </main>
    );
}
