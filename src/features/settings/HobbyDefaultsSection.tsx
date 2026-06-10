import { Separator } from "@/components/ui/separator";
import { useAppSettings } from "@/hooks/useAppSettings";
import { PipelineLabelsEditor } from "./PipelineLabelsEditor";
import { ChecklistDefaultsEditor } from "./ChecklistDefaultsEditor";
import { MissionFormatEditor } from "./MissionFormatEditor";

export function HobbyDefaultsSection() {
  const { data: settings = {} } = useAppSettings();

  return (
    <div className="space-y-6">
      <Separator />
      <div>
        <h3 className="text-base font-semibold">Hobby Defaults</h3>
        <p className="text-muted-foreground text-sm">
          Customize workflow defaults that apply across the app.
        </p>
      </div>
      <PipelineLabelsEditor settings={settings} />
      <Separator />
      <ChecklistDefaultsEditor settings={settings} />
      <Separator />
      <MissionFormatEditor settings={settings} />
    </div>
  );
}
