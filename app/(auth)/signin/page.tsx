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

const apiUrl = (process.env.NEXT_PUBLIC_API_URL ?? "").replace(/\/$/, "");

export default function SignInPage() {
    const googleButton = useRef<HTMLDivElement>(null);
    const [message, setMessage] = useState("Google দিয়ে নিরাপদে sign in করুন। নতুন হলে account তৈরি হবে।");
    const [isLoading, setIsLoading] = useState(true);

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
        <p className="eyebrow"><b />ACCOUNT ACCESS</p><h1>Welcome to the arena.</h1>
        <p className="auth-copy">{message}</p><div className="google-button" ref={googleButton} />
        {isLoading && <p className="auth-status">Preparing Google sign-in…</p>}
        <Link className="text-link" href="/">← Back to home</Link>
    </section></main>;
}
