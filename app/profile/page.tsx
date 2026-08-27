"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { appConfig } from "@/lib/config";
type User = { name: string; email: string; role: string; status: string; profilePicUrl?: string; createdAt: string };
export default function ProfilePage() {
  const [user, setUser] = useState<User | null>(null); const [state, setState] = useState("Loading your profile…");
  useEffect(() => { fetch(`${appConfig.apiUrl}/api/auth/me`, { credentials: "include" }).then(async r => { const b = await r.json(); if (!r.ok) throw new Error(b.message); setUser(b.data); }).catch(e => setState(e instanceof Error ? e.message : "Please sign in to view your profile.")); }, []);
  return <main className="dashboard-shell"><div className="dashboard-head"><div><p className="eyebrow">YOUR ARENA</p><h1>Profile & progress</h1><p>Keep your identity, streak and learning goals in one place.</p></div><Link className="button button-small" href="/problems">Continue solving <span>→</span></Link></div>{user ? <><section className="profile-card"><div className="avatar">{user.profilePicUrl ? <img src={user.profilePicUrl} alt="" /> : user.name.slice(0, 1).toUpperCase()}</div><div><h2>{user.name}</h2><p>{user.email}</p><span className="status-pill">{user.status} · {user.role}</span></div></section><section className="metric-grid"><article><b>0</b><span>Problems solved</span></article><article><b>0</b><span>Current streak</span></article><article><b>{new Date(user.createdAt).toLocaleDateString()}</b><span>Member since</span></article></section></> : <div className="empty-panel">{state}<Link href="/signin">Sign in to continue →</Link></div>}</main>;
}
