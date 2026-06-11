import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { useUpdateSetting } from "@/hooks/useAppSettings";
import { LOCALE_QUERY_KEYS } from "@/lib/localeQueryKeys";
import { toast } from "sonner";
import type { AppSettingsMap } from "@/db/queries/appSettings";

export function LanguageSetting({
  settings,
}: {
  settings: AppSettingsMap;
}) {
  const updateSetting = useUpdateSetting();
  const queryClient = useQueryClient();
  const locale = settings["locale"] ?? "en";

  function handleLocaleChange(next: "en" | "fr") {
    if (next === locale) return;
    updateSetting.mutate(
      { key: "locale", value: next },
      {
        onSuccess: () => {
          LOCALE_QUERY_KEYS.forEach((k) =>
            queryClient.invalidateQueries({ queryKey: [k] }),
          );
        },
        onError: () => toast.error("Could not save setting. Try again."),
      },
    );
  }

  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <p className="text-sm font-semibold">Language</p>
        <p className="text-sm text-muted-foreground">
          Interface and game data language
        </p>
      </div>
      <div className="min-w-[160px] flex justify-end">
        <div className="flex border border-border rounded-md overflow-hidden">
          <Button
            variant={locale === "en" ? "secondary" : "ghost"}
            size="sm"
            className="flex-1 rounded-none h-7 text-xs"
            onClick={() => handleLocaleChange("en")}
          >
            EN
          </Button>
          <Button
            variant={locale === "fr" ? "secondary" : "ghost"}
            size="sm"
            className="flex-1 rounded-none h-7 text-xs"
            onClick={() => handleLocaleChange("fr")}
          >
            FR
          </Button>
        </div>
      </div>
    </div>
  );
}
