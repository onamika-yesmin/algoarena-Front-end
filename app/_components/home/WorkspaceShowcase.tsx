"use client";

import Image from "next/image";
import Link from "next/link";
import { useReveal } from "@/hooks/useReveal";
import { IconBolt, IconGauge, IconSparkle } from "./icons";
import styles from "./home.module.css";

/**
 * Section 4 of 8. One honest screenshot-style mock of the three panes a
 * solver actually works in — statement, editor, AI results — so the layout
 * of the product is familiar before anyone signs up.
 */
export function WorkspaceShowcase() {
  const head = useReveal<HTMLDivElement>();
  const frame = useReveal<HTMLDivElement>(1);
  const captions = useReveal<HTMLDivElement>(2);

  return (
    <section className={styles.workspace} id="workspace">
      <div className={styles.workspaceBackdrop} aria-hidden="true">
        <Image src="/images/workspace-dark.jpg" alt="" fill sizes="100vw" />
      </div>

      <div className={`section-shell ${styles.workspaceInner}`}>
        <div className={styles.workspaceHead}>
          <div ref={head.ref} className={`${styles.head} ${head.className}`}>
            <p className={styles.kicker}>
              <span className={styles.kickerDot} /> The workspace
            </p>
            <h2>
              Statement, editor and verdict — <span className={styles.accent}>side by side.</span>
            </h2>
            <p>
              No switching tabs to remember the constraints, no pasting code somewhere else to get it checked. Read, write
              and judge in one screen, with the AI panel one click away.
            </p>
          </div>
          <Link className="button-outline" href="/problems">
            Open a problem <span aria-hidden="true">→</span>
          </Link>
        </div>

        <div ref={frame.ref} className={`${styles.appWindow} ${frame.className}`}>
          <div className={styles.appBar}>
            <span className={styles.heroEditorDots} aria-hidden="true">
              <b />
              <b />
              <b />
            </span>
            <span className={styles.appUrl}>algoarena.app/problems/two-sum</span>
          </div>

          <div className={styles.appPanes}>
            <div className={styles.wsPane}>
              <div className={styles.wsPaneHead}>
                <span>Problem</span>
                <em>solved by 2.1k</em>
              </div>
              <div className={styles.wsPaneBody}>
                <h3 className={styles.wsTitle}>Two Sum</h3>
                <div className={styles.wsPills}>
                  <span className="pill pill-easy">Easy</span>
                  <span className="pill pill-solved">Arrays</span>
                </div>
                <p className={styles.wsText}>
                  Given an array of integers and a target, return the indices of the two numbers that add up to the
                  target. Exactly one valid answer exists, and you may not use the same element twice.
                </p>
                <div className={styles.wsIo}>
                  <b>Input</b>
                  nums = [2, 7, 11, 15], target = 9
                </div>
                <div className={styles.wsIo}>
                  <b>Output</b>
                  [0, 1]
                </div>
              </div>
            </div>

            <div className={styles.wsPane}>
              <div className={styles.wsPaneHead}>
                <span>Editor</span>
                <em>autosaved</em>
              </div>
              <ol className={styles.wsCode}>
                <li>
                  <code>
                    <i>class</i> <b>Solution</b>:
                  </code>
                </li>
                <li>
                  <code>
                    &nbsp;&nbsp;<i>def</i> <b>two_sum</b>(self, nums, target):
                  </code>
                </li>
                <li>
                  <code>&nbsp;&nbsp;&nbsp;&nbsp;seen = {"{}"}</code>
                </li>
                <li>
                  <code>
                    &nbsp;&nbsp;&nbsp;&nbsp;<i>for</i> i, v <i>in</i> <b>enumerate</b>(nums):
                  </code>
                </li>
                <li>
                  <code>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;rest = target - v</code>
                </li>
                <li>
                  <code>
                    &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<i>if</i> rest <i>in</i> seen:
                  </code>
                </li>
                <li>
                  <code>
                    &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<i>return</i> [seen[rest], i]
                  </code>
                </li>
                <li>
                  <code>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;seen[v] = i</code>
                </li>
              </ol>
              <div className={styles.wsActions}>
                <span className={styles.wsBtnGhost}>Run</span>
                <span className={styles.wsBtn}>Submit</span>
                <span className={styles.wsLang}>Python 3</span>
              </div>
            </div>

            <div className={styles.wsPane}>
              <div className={styles.wsPaneHead}>
                <span>AI panel</span>
              </div>
              <div className={styles.wsTabs}>
                <span className={`${styles.wsTab} ${styles.wsTabActive}`}>Results</span>
                <span className={styles.wsTab}>Hint</span>
                <span className={styles.wsTab}>Big-O</span>
                <span className={styles.wsTab}>Refactor</span>
              </div>
              <div className={styles.wsVerdict}>
                Accepted
                <small>12 / 12 hidden tests passed</small>
              </div>
              <div className={styles.wsStats}>
                <span>
                  <b>48 ms</b> runtime
                </span>
                <span>
                  <b>O(n)</b> time
                </span>
                <span>
                  <b>+15</b> gems
                </span>
              </div>
              <div className={styles.wsHintCard}>
                <b>Refactor · suggested</b>
                Swap the manual index loop for <code>enumerate</code> — same complexity, one fewer variable to keep
                straight.
              </div>
            </div>
          </div>
        </div>

        <div ref={captions.ref} className={`${styles.wsCaptions} ${captions.className}`}>
          <div className={styles.wsCaption}>
            <span className={`${styles.tileIcon} ${styles.tileIconGreen}`}>
              <IconBolt />
            </span>
            <div>
              <h3>Run before you commit</h3>
              <p>Test against the samples as often as you like — only a submit spends an attempt.</p>
            </div>
          </div>
          <div className={styles.wsCaption}>
            <span className={styles.tileIcon}>
              <IconSparkle />
            </span>
            <div>
              <h3>Help without leaving</h3>
              <p>Hints, the complexity audit and refactor notes live in the same panel as your results.</p>
            </div>
          </div>
          <div className={styles.wsCaption}>
            <span className={`${styles.tileIcon} ${styles.tileIconCyan}`}>
              <IconGauge />
            </span>
            <div>
              <h3>Numbers you can act on</h3>
              <p>Runtime, memory, Big-O and the exact failing case — not just a red cross.</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
