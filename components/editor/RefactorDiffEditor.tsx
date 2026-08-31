"use client";

import dynamic from "next/dynamic";
import type { Language } from "@/types/api";

// Same SSR-disabled dynamic-import pattern as MonacoEditor.tsx (Monaco
// touches `window`/`navigator` at import time) — but pulling the package's
// DiffEditor export instead of its default Editor, so a full side-by-side
// diff renders straight from the original/refactored full source with no
// hand-rolled diff algorithm needed.
const DiffEditor = dynamic(() => import("@monaco-editor/react").then((mod) => mod.DiffEditor), {
  ssr: false,
  loading: () => <div className="editor-loading">Loading diff…</div>,
});

const monacoLanguage: Record<Language, string> = {
  python: "python",
  cpp: "cpp",
  javascript: "javascript",
};

interface RefactorDiffEditorProps {
  language: Language;
  original: string;
  modified: string;
  height?: string;
}

export default function RefactorDiffEditor({ language, original, modified, height = "360px" }: RefactorDiffEditorProps) {
  return (
    <div className="editor-shell">
      <DiffEditor
        height={height}
        language={monacoLanguage[language]}
        original={original}
        modified={modified}
        theme="vs-dark"
        options={{
          fontSize: 12,
          fontFamily: "'DM Mono', ui-monospace, monospace",
          minimap: { enabled: false },
          scrollBeyondLastLine: false,
          automaticLayout: true,
          readOnly: true,
          renderSideBySide: true,
        }}
      />
    </div>
  );
}
