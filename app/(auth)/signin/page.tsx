"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

declare global {
    interface Window {
        google?: { accounts: { id: {
            initialize: (options: { client_id: string; callback: (response: { credential: string }) => void }) => void;
            renderButton: (element: HTMLElement, options: { theme: string; size: string; width: number; text: string }) => void;
        } } };
    }
}

const apiUrl = (process.env.NEXT_PUBLIC_API_URL ?? "https://algoarena-back-end.vercel.app").replace(/\/$/, "");

export default function SignInPage() {
    const googleButton = useRef<HTMLDivElement>(null);
    const [message, setMessage] = useState("Google দিয়ে নিরাপদে sign in করুন। নতুন হলে account তৈরি হবে।");
    const [isLoading, setIsLoading] = useState(true);
    const [mode, setMode] = useState<"login" | "register">("login");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const submitCredentials = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setIsSubmitting(true);
        const form = new FormData(event.currentTarget);
        const payload = Object.fromEntries(form.entries());
        try {
            const response = await fetch(`${apiUrl}/api/auth/${mode === "login" ? "login" : "register"}`, { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify(payload) });
            const result = await response.json();
            if (!response.ok) throw new Error(result.message ?? "Authentication failed.");
            window.location.assign("/problems");
        } catch (error) {
            setMessage(error instanceof Error ? error.message : "Authentication failed.");
            setIsSubmitting(false);
        }
    };

    useEffect(() => {
        const setupGoogleSignIn = async () => {
            try {
                if (!apiUrl) throw new Error("API URL is not configured.");
                const configResponse = await fetch(`${apiUrl}/api/auth/google/client-config`);
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
                                const response = await fetch(`${apiUrl}/api/auth/google`, {
                                    method: "POST", headers: { "Content-Type": "application/json" },
                                    credentials: "include", body: JSON.stringify({ idToken: credential }),
                                });
                                const result = await response.json();
                                if (!response.ok) throw new Error(result.message ?? "Sign-in failed.");
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
          {mode === "register" && <input name="name" required minLength={2} placeholder="Your name" />}
          <input name="email" type="email" required placeholder="Email address" />
          <input name="password" type="password" required minLength={8} placeholder="Password (8+ characters)" />
          <button className="button" disabled={isSubmitting} type="submit">{isSubmitting ? "Please wait…" : mode === "login" ? "Sign in" : "Create account"}</button>
        </form>
        <button className="auth-switch" type="button" onClick={() => setMode(mode === "login" ? "register" : "login")}>{mode === "login" ? "New here? Create an account" : "Already have an account? Sign in"}</button>
        <p className="auth-divider">or continue with Google</p><div className="google-button" ref={googleButton} />
        {isLoading && <p className="auth-status">Preparing Google sign-in…</p>}
        <Link className="text-link" href="/">← Back to home</Link>
    </section></main>;
}
