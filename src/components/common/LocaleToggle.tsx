import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useAppSettings, useUpdateSetting } from "@/hooks/useAppSettings";
import { LOCALE_QUERY_KEYS } from "@/lib/localeQueryKeys";
import type { Locale } from "@/stores/localeStore";

export function LocaleToggle({ collapsed }: { collapsed: boolean }) {
  const { data: settings } = useAppSettings();
  const raw = settings?.["locale"];
  const locale: Locale = raw === "en" || raw === "fr" ? raw : "en";
  const updateSetting = useUpdateSetting();
  const queryClient = useQueryClient();

  function handleLocaleSwitch(next: Locale) {
    updateSetting.mutate(
      { key: "locale", value: next },
      {
        onSuccess: () => {
          LOCALE_QUERY_KEYS.forEach((k) =>
            queryClient.invalidateQueries({ queryKey: [k] }),
          );
        },
      },
    );
  }

  if (collapsed) {
    const nextLocale: Locale = locale === "en" ? "fr" : "en";
    const tooltipText =
      locale === "en" ? "Switch to French" : "Switch to English";

    return (
      <div className="px-2 pb-1">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="mx-auto flex"
              aria-label={tooltipText}
              onClick={() => handleLocaleSwitch(nextLocale)}
            >
              {locale.toUpperCase()}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">{tooltipText}</TooltipContent>
        </Tooltip>
      </div>
    );
  }

  return (
    <div className="px-2 pb-1">
      <div className="flex border border-border rounded-md overflow-hidden">
        <Button
          variant={locale === "en" ? "secondary" : "ghost"}
          size="sm"
          className="flex-1 rounded-none h-7 text-xs"
          onClick={() => {
            if (locale !== "en") handleLocaleSwitch("en");
          }}
        >
          EN
        </Button>
        <Button
          variant={locale === "fr" ? "secondary" : "ghost"}
          size="sm"
          className="flex-1 rounded-none h-7 text-xs"
          onClick={() => {
            if (locale !== "fr") handleLocaleSwitch("fr");
          }}
        >
          FR
        </Button>
      </div>
    </div>
  );
}
