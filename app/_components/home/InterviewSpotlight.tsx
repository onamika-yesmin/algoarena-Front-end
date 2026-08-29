import Link from "next/link";
import { IconCheck } from "./icons";

export function InterviewSpotlight() {
  return (
    <section className="spotlight spotlight-reverse section-shell">
      <div className="spotlight-grid">
        <div className="spotlight-copy">
          <p className="eyebrow">
            <b /> AI MOCK INTERVIEW
          </p>
          <h2>
            Practise explaining
            <br />
            your thinking out loud.
          </h2>
          <p>
            Pick a topic and difficulty, and talk through a problem with an interviewer that asks follow-ups the way a real one
            would — then get a scored, written breakdown of how you did.
          </p>
          <ul className="spotlight-list">
            <li>
              <IconCheck /> Topic-focused sessions — arrays, strings, DP, graphs, or general
            </li>
            <li>
              <IconCheck /> Follow-up questions based on what you actually say
            </li>
            <li>
              <IconCheck /> A final score out of 10 with written feedback you can review later
            </li>
          </ul>
          <div className="button-row">
            <Link className="button" href="/interview">
              Start a mock interview <span aria-hidden="true">→</span>
            </Link>
          </div>
        </div>
        <div className="spotlight-media">
          <div className="chat-mock">
            <div className="chat-mock-top">
              <b /> Mock interview · Dynamic Programming · Medium
            </div>
            <div className="chat-mock-body">
              <div className="chat-bubble chat-bubble-ai">
                Let&apos;s say you&apos;re climbing a staircase of <code>n</code> steps, and can take 1 or 2 steps at a time. How
                many distinct ways can you reach the top?
              </div>
              <div className="chat-bubble chat-bubble-user">
                It&apos;s the same shape as Fibonacci — ways(n) = ways(n-1) + ways(n-2), since the last step was either a
                single or a double.
              </div>
              <div className="chat-bubble chat-bubble-ai">
                Good instinct. What&apos;s your base case, and can you get this to O(1) space instead of O(n)?
              </div>
            </div>
            <div className="chat-mock-status">
              <span>●</span> Turn 3 of 5 · scored at the end
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
