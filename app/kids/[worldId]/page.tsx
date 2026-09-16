import { redirect } from "next/navigation";
import { WORLDS } from "@/lib/kids/curriculum";

// /kids/[worldId] has no page of its own — send it to that world on the map.
export default async function KidsWorldPage({ params }: { params: Promise<{ worldId: string }> }) {
  const { worldId } = await params;
  redirect(WORLDS.some((world) => world.id === worldId) ? `/kids#world-${worldId}` : "/kids");
}
