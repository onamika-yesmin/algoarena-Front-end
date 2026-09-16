// Read-only view of a whole proposal — used by the learner's proposal page and
// by the admin review queue.

import type { Language } from "@/types/api";
import type { ProposalDetail } from "@/lib/api/proposals";
import { DifficultyTag } from "./ProposalBadges";
import styles from "./ProposalDetails.module.css";

const LANGUAGE_LABEL: Record<Language, string> = {
  python: "Python",
  cpp: "C++",
  javascript: "JavaScript",
  typescript: "TypeScript",
};

export function ProposalDetails({ proposal }: { proposal: ProposalDetail }) {
  const starterLanguages = (Object.keys(LANGUAGE_LABEL) as Language[]).filter((language) => proposal.starterCode[language]?.trim());

  return (
    <div className={styles.details}>
      <dl className={styles.facts}>
        <div>
          <dt>Difficulty</dt>
          <dd>
            <DifficultyTag difficulty={proposal.difficulty} />
          </dd>
        </div>
        <div>
          <dt>Tags</dt>
          <dd>{proposal.tags.length ? proposal.tags.join(", ") : "None"}</dd>
        </div>
        <div>
          <dt>Time limit</dt>
          <dd>{proposal.timeLimitMs} ms</dd>
        </div>
        <div>
          <dt>Memory limit</dt>
          <dd>{proposal.memoryLimitMb} MB</dd>
        </div>
        <div>
          <dt>Test cases</dt>
          <dd>
            {proposal.testCaseCount} ({proposal.sampleCount} {proposal.sampleCount === 1 ? "sample" : "samples"})
          </dd>
        </div>
      </dl>

      <section>
        <h3>Statement</h3>
        <p className={styles.prewrap}>{proposal.statement}</p>
      </section>
      {proposal.inputFormat && (
        <section>
          <h3>Input format</h3>
          <p className={styles.prewrap}>{proposal.inputFormat}</p>
        </section>
      )}
      {proposal.outputFormat && (
        <section>
          <h3>Output format</h3>
          <p className={styles.prewrap}>{proposal.outputFormat}</p>
        </section>
      )}
      {proposal.constraints && (
        <section>
          <h3>Constraints</h3>
          <p className={styles.prewrap}>{proposal.constraints}</p>
        </section>
      )}

      <section>
        <h3>Test cases</h3>
        <ol className={styles.cases}>
          {proposal.testCases.map((testCase, index) => (
            <li key={index} className={`${styles.case}${testCase.isSample ? ` ${styles.caseSample}` : ""}`}>
              <p className={styles.caseTitle}>
                Test case {index + 1} · {testCase.isSample ? "Sample" : "Hidden"}
              </p>
              <div className={styles.caseGrid}>
                <div>
                  <span className={styles.label}>Input</span>
                  <pre className={styles.pre}>{testCase.input || "(empty)"}</pre>
                </div>
                <div>
                  <span className={styles.label}>Expected output</span>
                  <pre className={styles.pre}>{testCase.expectedOutput || "(empty)"}</pre>
                </div>
              </div>
              {testCase.explanation && <p className={styles.explanation}>{testCase.explanation}</p>}
            </li>
          ))}
        </ol>
      </section>

      {starterLanguages.length > 0 && (
        <section>
          <h3>Starter code</h3>
          <div className={styles.codeList}>
            {starterLanguages.map((language) => (
              <details key={language} className={styles.code}>
                <summary>{LANGUAGE_LABEL[language]}</summary>
                <pre className={styles.pre}>{proposal.starterCode[language]}</pre>
              </details>
            ))}
          </div>
        </section>
      )}

      {proposal.referenceSolution && (
        <section>
          <h3>Reference solution · {LANGUAGE_LABEL[proposal.referenceSolution.language]}</h3>
          <pre className={styles.pre}>{proposal.referenceSolution.code}</pre>
        </section>
      )}

      {proposal.noteToReviewer && (
        <section>
          <h3>Note for the reviewer</h3>
          <p className={styles.prewrap}>{proposal.noteToReviewer}</p>
        </section>
      )}
    </div>
  );
}
