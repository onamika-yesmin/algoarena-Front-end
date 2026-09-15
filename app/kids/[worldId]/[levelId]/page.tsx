import { KidsShell } from "@/components/kids/KidsShell";
import { LevelScreen } from "@/components/kids/LevelScreen";

export default async function KidsLevelPage({ params }: { params: Promise<{ worldId: string; levelId: string }> }) {
  const { worldId, levelId } = await params;
  return (
    <KidsShell>
      {/* Keyed so moving between levels starts each one fresh. */}
      <LevelScreen key={`${worldId}/${levelId}`} worldId={worldId} levelSlug={levelId} />
    </KidsShell>
  );
}
