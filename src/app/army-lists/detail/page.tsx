import { useParams } from "@tanstack/react-router";
import { ArmyListDetailPage } from "@/features/army-lists/ArmyListDetailPage";

export function ArmyListDetailPageShell() {
  const { listId } = useParams({ from: "/layout/army-lists/$listId" });
  const listIdNum = Number(listId);
  if (Number.isNaN(listIdNum)) return null;
  return <ArmyListDetailPage listId={listIdNum} />;
}
