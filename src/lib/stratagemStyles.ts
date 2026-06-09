export const PHASE_STYLES: Record<string, string> = {
  Command: "bg-purple-500/20 text-purple-700 dark:text-purple-300",
  Movement: "bg-blue-500/20 text-blue-700 dark:text-blue-300",
  Shooting: "bg-amber-500/20 text-amber-700 dark:text-amber-300",
  Charge: "bg-orange-500/20 text-orange-700 dark:text-orange-300",
  Fight: "bg-red-500/20 text-red-700 dark:text-red-300",
};

export function getPhaseBadgeClass(phase: string | null): string {
  if (!phase) return "bg-muted text-muted-foreground";
  return PHASE_STYLES[phase] ?? "bg-muted text-muted-foreground";
}

export function cpLabel(cost: number): string {
  if (cost === 0) return "Free";
  return `${cost} CP`;
}

export function normalizePhase(phase: string | null): string | null {
  if (!phase) return null;
  return phase.replace(/ phase$/i, "").trim();
}
