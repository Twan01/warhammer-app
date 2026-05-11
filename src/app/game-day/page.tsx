import { useParams } from "@tanstack/react-router";
import { GameDayPage } from "@/features/game-day/GameDayPage";

export function GameDayPageShell() {
  const { listId } = useParams({ from: "/game-day/$listId" });
  return <GameDayPage listId={Number(listId)} />;
}
