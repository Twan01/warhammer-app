import { useParams } from "@tanstack/react-router";
import { GameDayPage } from "@/features/game-day/GameDayPage";

export function GameDayPageShell() {
  const { listId } = useParams({ from: "/layout/game-day/$listId" });
  const listIdNum = Number(listId);
  if (Number.isNaN(listIdNum)) return null;
  return <GameDayPage listId={listIdNum} />;
}
