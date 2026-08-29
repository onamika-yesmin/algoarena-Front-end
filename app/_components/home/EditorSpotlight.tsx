"use client";

import Link from "next/link";
import { useReveal } from "@/hooks/useReveal";
import { IconCheck } from "./icons";

export function EditorSpotlight() {
  const copy = useReveal<HTMLDivElement>();
  const media = useReveal<HTMLDivElement>(1);

  return (
    <section className="spotlight section-shell">
      <div className="spotlight-grid">
        <div ref={copy.ref} className={`spotlight-copy ${copy.className}`}>
          <p className="eyebrow">
            <b /> THE WORKSPACE
          </p>
          <h2>
            A real editor.
            <br />
            Real judge feedback.
          </h2>
          <p>
            Write in Python, C++, or JavaScript against starter code built for the problem — run it against sample tests, then
            submit for a verdict from the same judge that grades every submission on the platform.
          </p>
          <ul className="spotlight-list">
            <li>
              <IconCheck /> Multi-language editor with starter code per problem
            </li>
            <li>
              <IconCheck /> Instant run against sample tests before you submit
            </li>
            <li>
              <IconCheck /> Verdicts, runtime, and hidden test results the moment judging finishes
            </li>
          </ul>
          <div className="button-row">
            <Link className="button" href="/problems">
              Open a problem <span aria-hidden="true">→</span>
            </Link>
          </div>
        </div>
        <div ref={media.ref} className={`spotlight-media ${media.className}`}>
          <div className="hero-visual" aria-label="Code editor preview">
            <div className="editor-top">
              <div className="dots">
                <b />
                <b />
                <b />
              </div>
              <span>valid_parentheses.cpp</span>
              <small>C++</small>
            </div>
            <div className="editor-body">
              <ol>
                <li>
                  <code>
                    <i>bool</i> <b>isValid</b>(string s) {"{"}
                  </code>
                </li>
                <li>
                  <code>&nbsp;&nbsp;stack&lt;char&gt; open;</code>
                </li>
                <li>
                  <code>
                    &nbsp;&nbsp;<i>for</i> (char c : s) {"{"}
                  </code>
                </li>
                <li>
                  <code>&nbsp;&nbsp;&nbsp;&nbsp;if (c == &apos;(&apos; || c == &apos;[&apos;) open.push(c);</code>
                </li>
                <li>
                  <code>&nbsp;&nbsp;&nbsp;&nbsp;else if (open.empty()) return false;</code>
                </li>
                <li>
                  <code>&nbsp;&nbsp;{"}"}</code>
                </li>
                <li>
                  <code>&nbsp;&nbsp;return open.empty();</code>
                </li>
              </ol>
            </div>
            <div className="run-row">
              <span>
                <b>✓</b> Accepted
              </span>
              <small>12/12 tests · 31 ms</small>
              <button type="button">Run code</button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
