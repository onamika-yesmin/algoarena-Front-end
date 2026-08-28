import ProblemList from "@/components/problems/ProblemList";

export default function ProblemsPage() {
  return (
    <main className="section-shell workspace">
      <section>
        <p className="eyebrow">
          <b />
          PROBLEM SET
        </p>
        <h1>Pick a problem to solve.</h1>
        <p>Filter by difficulty or search by title. Solved problems are marked once you get an Accepted verdict.</p>
      </section>
      <ProblemList />
    </main>
  );
}
