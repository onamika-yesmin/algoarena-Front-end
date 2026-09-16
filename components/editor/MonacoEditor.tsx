"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import type { OnMount } from "@monaco-editor/react";
import type { Language } from "@/types/api";

// Monaco touches `window`/`navigator` at import time, so it must never be
// server-rendered (see 06-TEAM-PLAN-12-DAYS.md's Day 10 "Monaco SSR bug" note).
const Editor = dynamic(() => import("@monaco-editor/react"), { ssr: false, loading: () => <div className="editor-loading editor-loading-code">Loading editor…</div> });

type EditorInstance = Parameters<OnMount>[0];
type MonacoInstance = Parameters<OnMount>[1];

const monacoLanguage: Record<Language, string> = {
  python: "python",
  cpp: "cpp",
  javascript: "javascript",
  typescript: "typescript",
};

export interface EditorMarker {
  /** 1-based line number. */
  line: number;
  column?: number;
  message: string;
}

interface MonacoEditorProps {
  language: Language;
  value: string;
  onChange: (value: string) => void;
  height?: string;
  /** Error locations to mark in the code (e.g. from the last Run). */
  markers?: EditorMarker[];
  /** Scrolls to and focuses a line; a new nonce re-triggers the same line. */
  revealRequest?: { line: number; nonce: number } | null;
}

export default function MonacoEditor({ language, value, onChange, height = "480px", markers, revealRequest }: MonacoEditorProps) {
  const editorRef = useRef<EditorInstance | null>(null);
  const monacoRef = useRef<MonacoInstance | null>(null);
  const decorationsRef = useRef<ReturnType<EditorInstance["createDecorationsCollection"]> | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  const handleMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;
    decorationsRef.current = editor.createDecorationsCollection();
    setIsMounted(true);
  };

  // Marks each error line with a red squiggle (hover shows the message), a
  // tinted line background and a red bar in the gutter.
  useEffect(() => {
    const editor = editorRef.current;
    const monaco = monacoRef.current;
    const model = editor?.getModel();
    if (!editor || !monaco || !model) return;

    const lineCount = model.getLineCount();
    const visible = (markers ?? []).filter((marker) => marker.line >= 1 && marker.line <= lineCount);
    monaco.editor.setModelMarkers(
      model,
      "algoarena-run",
      visible.map((marker) => ({
        severity: monaco.MarkerSeverity.Error,
        message: marker.message,
        startLineNumber: marker.line,
        startColumn: marker.column ?? (model.getLineFirstNonWhitespaceColumn(marker.line) || 1),
        endLineNumber: marker.line,
        endColumn: model.getLineMaxColumn(marker.line),
      })),
    );
    decorationsRef.current?.set(
      visible.map((marker) => ({
        range: new monaco.Range(marker.line, 1, marker.line, 1),
        options: { isWholeLine: true, className: "editor-error-line", linesDecorationsClassName: "editor-error-gutter" },
      })),
    );
  }, [markers, isMounted, value]);

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor || !revealRequest) return;
    editor.revealLineInCenter(revealRequest.line);
    editor.setPosition({ lineNumber: revealRequest.line, column: 1 });
    editor.focus();
  }, [revealRequest]);

  return (
    <div className="editor-shell">
      <Editor
        height={height}
        language={monacoLanguage[language]}
        value={value}
        onChange={(next) => onChange(next ?? "")}
        onMount={handleMount}
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
