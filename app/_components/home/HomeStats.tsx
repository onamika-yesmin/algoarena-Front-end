const highlights = [
  ["01", "Practice with purpose", "Curated paths that make every challenge count."],
  ["02", "Compete in real time", "Weekly contests and a leaderboard that stays alive."],
  ["03", "Learn from the code", "Clear feedback to help you improve with intent."],
];

export function HomeStats() {
  return <section className="feature-band"><div className="section-shell stat-grid">
    {highlights.map(([number, title, text]) => <div key={number}><span>{number}</span><h2>{title}</h2><p>{text}</p></div>)}
  </div></section>;
}
