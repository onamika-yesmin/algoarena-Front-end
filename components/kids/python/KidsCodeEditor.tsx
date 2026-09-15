"use client";

// A big-print Python editor for kids: a plain <textarea> (works on phones,
// with screen readers and with the browser's undo) layered over a coloured
// copy of the code. Tab indents, Enter keeps the indentation (and adds 4
// spaces after a colon), and the last error line is highlighted.

import { useId, useLayoutEffect, useRef, type CSSProperties, type KeyboardEvent } from "react";
import { tokenizePythonLine } from "@/lib/kids/pythonHighlight";
import styles from "./KidsCodeEditor.module.css";

interface KidsCodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  label: string;
  /** 1-based line to highlight as the error location. */
  errorLine?: number | null;
  disabled?: boolean;
}

/** Read-only, coloured Python snippet (lesson examples, the revealed answer). */
export function CodeBlock({ code }: { code: string }) {
  return (
    <pre className={styles.codeBlock}>
      <code>
        {code.replace(/\n+$/, "").split("\n").map((line, index) => (
          <span key={index} className={styles.line}>
            {tokenizePythonLine(line).map((token, tokenIndex) => (
              <span key={tokenIndex} className={styles[`tok_${token.kind}`]}>
                {token.text}
              </span>
            ))}
            {line === "" ? " " : null}
          </span>
        ))}
      </code>
    </pre>
  );
}

export function KidsCodeEditor({ value, onChange, label, errorLine, disabled }: KidsCodeEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const layerRef = useRef<HTMLDivElement>(null);
  const gutterRef = useRef<HTMLDivElement>(null);
  const escapedRef = useRef(false);
  const pendingCaret = useRef<number | null>(null);
  const helpId = useId();
  const lines = value.split("\n");

  const syncScroll = () => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    if (layerRef.current) layerRef.current.style.transform = `translate(${-textarea.scrollLeft}px, ${-textarea.scrollTop}px)`;
    if (gutterRef.current) gutterRef.current.style.transform = `translateY(${-textarea.scrollTop}px)`;
  };

  useLayoutEffect(() => {
    const textarea = textareaRef.current;
    if (textarea && pendingCaret.current !== null) {
      textarea.setSelectionRange(pendingCaret.current, pendingCaret.current);
      pendingCaret.current = null;
    }
    if (!textarea) return;
    if (layerRef.current) layerRef.current.style.transform = `translate(${-textarea.scrollLeft}px, ${-textarea.scrollTop}px)`;
    if (gutterRef.current) gutterRef.current.style.transform = `translateY(${-textarea.scrollTop}px)`;
  });

  // Edits go through execCommand when possible so Ctrl+Z still works.
  const replaceRange = (start: number, end: number, text: string, caret = start + text.length) => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.focus();
    textarea.setSelectionRange(start, end);
    let applied = false;
    try {
      applied = text ? document.execCommand("insertText", false, text) : document.execCommand("delete");
    } catch {
      applied = false;
    }
    if (applied) {
      textarea.setSelectionRange(caret, caret);
    } else {
      onChange(textarea.value.slice(0, start) + text + textarea.value.slice(end));
      pendingCaret.current = caret;
    }
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.nativeEvent.isComposing || disabled) return;
    const { selectionStart: start, selectionEnd: end, value: text } = event.currentTarget;

    if (event.key === "Escape") {
      escapedRef.current = true;
      return;
    }

    if (event.key === "Tab" && !event.ctrlKey && !event.metaKey && !event.altKey) {
      // Esc then Tab leaves the editor, so keyboard users never get stuck.
      if (escapedRef.current) {
        escapedRef.current = false;
        return;
      }
      event.preventDefault();
      const lineStart = text.lastIndexOf("\n", start - 1) + 1;
      if (event.shiftKey) {
        const leading = /^ {1,4}/.exec(text.slice(lineStart))?.[0].length ?? 0;
        if (leading) replaceRange(lineStart, lineStart + leading, "", Math.max(lineStart, start - leading));
      } else {
        replaceRange(start, end, "    ");
      }
      return;
    }

    if (event.key !== "Shift") escapedRef.current = false;

    if (event.key === "Enter" && !event.shiftKey && !event.ctrlKey && !event.metaKey && !event.altKey) {
      const lineStart = text.lastIndexOf("\n", start - 1) + 1;
      const before = text.slice(lineStart, start);
      const indent = /^[ \t]*/.exec(before)?.[0] ?? "";
      const extra = /:\s*$/.test(before) ? "    " : "";
      event.preventDefault();
      replaceRange(start, end, `\n${indent}${extra}`);
    }
  };

  return (
    <div>
      <div className={`${styles.editor} ${disabled ? styles.disabled : ""}`} style={{ "--rows": Math.max(8, lines.length + 1) } as CSSProperties}>
        <div className={styles.gutter} aria-hidden="true">
          <div ref={gutterRef}>
            {lines.map((_, index) => (
              <span key={index} className={index + 1 === errorLine ? styles.gutterError : undefined}>
                {index + 1}
              </span>
            ))}
          </div>
        </div>
        <div className={styles.code}>
          <div className={styles.highlight} aria-hidden="true">
            <div ref={layerRef} className={styles.layer}>
              {lines.map((line, index) => (
                <span key={index} className={`${styles.line} ${index + 1 === errorLine ? styles.lineError : ""}`}>
                  {tokenizePythonLine(line).map((token, tokenIndex) => (
                    <span key={tokenIndex} className={styles[`tok_${token.kind}`]}>
                      {token.text}
                    </span>
                  ))}
                  {line === "" ? " " : null}
                </span>
              ))}
            </div>
          </div>
          <textarea
            ref={textareaRef}
            className={styles.input}
            value={value}
            onChange={(event) => onChange(event.target.value)}
            onKeyDown={handleKeyDown}
            onScroll={syncScroll}
            readOnly={disabled}
            spellCheck={false}
            autoCapitalize="off"
            autoComplete="off"
            autoCorrect="off"
            wrap="off"
            aria-label={label}
            aria-describedby={helpId}
          />
        </div>
      </div>
      <p id={helpId} className={styles.help}>
        Tab adds 4 spaces. To leave the editor with the keyboard, press Esc and then Tab.
      </p>
    </div>
  );
}
