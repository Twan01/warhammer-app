import { Paintbrush, Droplets, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface StepMetadataRowProps {
  technique: string | null;
  tool: string | null;
  dilution: string | null;
  timeEstimateMinutes: number | null;
  paintingPhase: string | null;
}

export function StepMetadataRow({
  technique,
  tool,
  dilution,
  timeEstimateMinutes,
  paintingPhase,
}: StepMetadataRowProps) {
  if (!technique && !tool && !dilution && timeEstimateMinutes == null && !paintingPhase) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center gap-4">
      {technique && (
        <Badge variant="outline" className="capitalize">
          {technique}
        </Badge>
      )}
      {tool && (
        <span className="inline-flex items-center gap-1 text-base text-muted-foreground">
          <Paintbrush className="h-4 w-4" />
          {tool}
        </span>
      )}
      {dilution && (
        <span className="inline-flex items-center gap-1 text-base text-muted-foreground">
          <Droplets className="h-4 w-4" />
          {dilution}
        </span>
      )}
      {timeEstimateMinutes != null && (
        <span className="inline-flex items-center gap-1 text-base text-muted-foreground">
          <Clock className="h-4 w-4" />
          ~{timeEstimateMinutes}m
        </span>
      )}
      {paintingPhase && (
        <Badge variant="outline">{paintingPhase}</Badge>
      )}
    </div>
  );
}
