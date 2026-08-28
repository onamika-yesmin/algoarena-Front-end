"use client";

import dynamic from "next/dynamic";
import type { Language } from "@/types/api";

// Monaco touches `window`/`navigator` at import time, so it must never be
// server-rendered (see 06-TEAM-PLAN-12-DAYS.md's Day 10 "Monaco SSR bug" note).
const Editor = dynamic(() => import("@monaco-editor/react"), { ssr: false, loading: () => <div className="editor-loading">Loading editor…</div> });

const monacoLanguage: Record<Language, string> = {
  python: "python",
  cpp: "cpp",
  javascript: "javascript",
};

interface MonacoEditorProps {
  language: Language;
  value: string;
  onChange: (value: string) => void;
  height?: string;
}

export default function MonacoEditor({ language, value, onChange, height = "480px" }: MonacoEditorProps) {
  return (
    <div className="editor-shell">
      <Editor
        height={height}
        language={monacoLanguage[language]}
        value={value}
        onChange={(next) => onChange(next ?? "")}
        theme="vs-dark"
        options={{
          fontSize: 13,
          fontFamily: "'DM Mono', ui-monospace, monospace",
          minimap: { enabled: false },
          scrollBeyondLastLine: false,
          automaticLayout: true,
          tabSize: 4,
        }}
      />
    </div>
  );
}
