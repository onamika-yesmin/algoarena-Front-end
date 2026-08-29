"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { appConfig } from "@/lib/config";
import { setTokens } from "@/lib/auth-storage";
import { Spinner } from "@/components/ui/Loader";

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

    const switchMode = () => {
        clearAvatar();
        setMode(mode === "login" ? "register" : "login");
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
            window.location.assign("/problems");
        } catch (error) {
            setMessage(error instanceof Error ? error.message : "Authentication failed.");
            setIsSubmitting(false);
        }
    };

    useEffect(() => {
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
                                window.location.assign("/profile");
                            } catch (error) {
                                setMessage(error instanceof Error ? error.message : "Sign-in failed. Please try again.");
                                setIsLoading(false);
                            }
                        },
                    });
                    window.google.accounts.id.renderButton(googleButton.current, { theme: "outline", size: "large", width: 320, text: "continue_with" });
                    setIsLoading(false);
                };
                script.onerror = () => { setMessage("Google sign-in could not load. Please try again."); setIsLoading(false); };
                document.head.appendChild(script);
            } catch (error) {
                setMessage(error instanceof Error ? error.message : "Unable to start sign-in."); setIsLoading(false);
            }
        };
        setupGoogleSignIn();
    }, []);

    return <main className="auth-page"><section className="auth-card">
        <Link className="brand" href="/">Algo<span>Arena</span><i>{" //"}</i></Link>
        <p className="eyebrow"><b />ACCOUNT ACCESS</p><h1>{mode === "login" ? "Welcome back." : "Create your account."}</h1>
        <p className="auth-copy">{message}</p>
        <form className="auth-form" onSubmit={submitCredentials}>
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
        <button className="auth-switch" type="button" onClick={switchMode}>{mode === "login" ? "New here? Create an account" : "Already have an account? Sign in"}</button>
        <p className="auth-divider">or continue with Google</p><div className="google-button" ref={googleButton} />
        {isLoading && <p className="auth-status"><Spinner size="sm" /> Preparing Google sign-in…</p>}
        <Link className="text-link" href="/">← Back to home</Link>
    </section></main>;
}
