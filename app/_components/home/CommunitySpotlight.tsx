import Link from "next/link";
import { IconCheck } from "./icons";

export function CommunitySpotlight() {
  return (
    <section className="spotlight spotlight-reverse section-shell">
      <div className="spotlight-grid">
        <div className="spotlight-copy">
          <p className="eyebrow">
            <b /> COMMUNITY
          </p>
          <h2>
            See how everyone
            <br />
            else solved it.
          </h2>
          <p>
            Every accepted solution becomes part of a public feed you can browse by problem — read a different approach,
            compare runtimes, and talk it through in the comments.
          </p>
          <ul className="spotlight-list">
            <li>
              <IconCheck /> Every accepted submission, browsable by problem
            </li>
            <li>
              <IconCheck /> Compare approaches and languages side by side
            </li>
            <li>
              <IconCheck /> Comment threads on each solution
            </li>
          </ul>
          <div className="button-row">
            <Link className="button" href="/community">
              Browse the community feed <span aria-hidden="true">→</span>
            </Link>
          </div>
        </div>
        <div className="spotlight-media">
          <div className="feed-mock">
            <div className="feed-mock-item">
              <span className="feed-mock-avatar">N</span>
              <div className="feed-mock-body">
                <p>
                  <b>Nadia R.</b> solved &quot;Merge Intervals&quot; in Python
                </p>
                <span>Accepted · 42 ms · 4 comments</span>
              </div>
            </div>
            <div className="feed-mock-item">
              <span className="feed-mock-avatar">F</span>
              <div className="feed-mock-body">
                <p>
                  <b>Farhan A.</b> solved &quot;Valid Parentheses&quot; in C++
                </p>
                <span>Accepted · 12 ms · 1 comment</span>
              </div>
            </div>
            <div className="feed-mock-item">
              <span className="feed-mock-avatar">T</span>
              <div className="feed-mock-body">
                <p>
                  <b>Tumit H.</b> solved &quot;Two Sum&quot; in JavaScript
                </p>
                <span>Accepted · 55 ms · 2 comments</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
