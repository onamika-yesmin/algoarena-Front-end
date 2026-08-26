import Link from "next/link";

export default function ComingSoon({ title }: { title: string }) {
  return <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24, textAlign: "center" }}><section><p style={{ color: "#55d8d2", fontFamily: "monospace", fontSize: 12, letterSpacing: 1.5 }}>ALGOARENA</p><h1 style={{ fontSize: "clamp(2.5rem, 8vw, 5rem)", margin: "12px 0" }}>{title}</h1><p style={{ color: "#aeb4c9", marginBottom: 28 }}>This arena is being prepared. Check back soon.</p><Link href="/" style={{ color: "#fff", background: "#8067ff", padding: "12px 18px", borderRadius: 5 }}>Back to home</Link></section></main>;
}
