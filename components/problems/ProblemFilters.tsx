interface ProblemFiltersProps {
  search: string;
  difficulty: string;
  onSearchChange: (value: string) => void;
  onDifficultyChange: (value: string) => void;
}

const difficulties = ["", "EASY", "MEDIUM", "HARD"];

export default function ProblemFilters({ search, difficulty, onSearchChange, onDifficultyChange }: ProblemFiltersProps) {
  return (
    <div className="problem-filters">
      <input
        type="search"
        placeholder="Search problems…"
        value={search}
        onChange={(event) => onSearchChange(event.target.value)}
        aria-label="Search problems"
      />
      <select value={difficulty} onChange={(event) => onDifficultyChange(event.target.value)} aria-label="Filter by difficulty">
        {difficulties.map((option) => (
          <option key={option || "all"} value={option}>
            {option || "All difficulties"}
          </option>
        ))}
      </select>
    </div>
  );
}
