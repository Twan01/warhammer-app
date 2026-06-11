import { Separator } from "@/components/ui/separator";
import { useAppSettings } from "@/hooks/useAppSettings";
import { LanguageSetting } from "./LanguageSetting";
import { CurrencySetting } from "./CurrencySetting";
import { DefaultFactionSetting } from "./DefaultFactionSetting";
import { ReadinessTargetSetting } from "./ReadinessTargetSetting";

export function GeneralPreferencesSection() {
  const { data: settings = {} } = useAppSettings();

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-base font-semibold">App Preferences</h3>
      </div>
      <LanguageSetting settings={settings} />
      <CurrencySetting settings={settings} />
      <DefaultFactionSetting settings={settings} />
      <ReadinessTargetSetting settings={settings} />
      <Separator />
    </div>
  );
}
