import Link from "next/link";
import { IconCheck } from "./icons";

export function ContestSpotlight() {
  return (
    <section className="spotlight section-shell">
      <div className="spotlight-grid">
        <div className="spotlight-copy">
          <p className="eyebrow">
            <b /> CONTESTS &amp; RANKINGS
          </p>
          <h2>
            Put a clock on it,
            <br />
            then defend your rank.
          </h2>
          <p>
            Register for a scheduled contest, solve its problem set before time runs out, and watch the scoreboard update in
            real time — every accepted submission also counts toward your spot on the global leaderboard.
          </p>
          <ul className="spotlight-list">
            <li>
              <IconCheck /> Scheduled contests with a live scoreboard
            </li>
            <li>
              <IconCheck /> Global rankings by total score across every problem you&apos;ve solved
            </li>
            <li>
              <IconCheck /> Your rank, solved count, and points always visible on your profile
            </li>
          </ul>
          <div className="button-row">
            <Link className="button" href="/contest">
              View live contests <span aria-hidden="true">→</span>
            </Link>
            <Link className="button-outline" href="/leaderboard">
              See the leaderboard
            </Link>
          </div>
        </div>
        <div className="spotlight-media">
          <div className="rank-mock">
            <div className="rank-mock-head">
              Global rankings <span>Live</span>
            </div>
            <div className="rank-row">
              <b className="rank-medal">🥇</b> <span>Nadia R.</span> <span>2,140 pts</span>
            </div>
            <div className="rank-row">
              <b className="rank-medal">🥈</b> <span>Farhan A.</span> <span>1,985 pts</span>
            </div>
            <div className="rank-row">
              <b className="rank-medal">🥉</b> <span>Onamika Y.</span> <span>1,860 pts</span>
            </div>
            <div className="rank-row">
              <b>#4</b> <span>Rifat K.</span> <span>1,705 pts</span>
            </div>
            <div className="rank-row">
              <b>#5</b> <span>Meherun N.</span> <span>1,690 pts</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
