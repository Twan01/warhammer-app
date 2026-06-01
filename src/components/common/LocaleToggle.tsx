import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useLocaleStore, type Locale } from "@/stores/localeStore";

export function LocaleToggle({ collapsed }: { collapsed: boolean }) {
  const { locale, setLocale } = useLocaleStore();
  const queryClient = useQueryClient();

  function handleLocaleSwitch(next: Locale) {
    setLocale(next);
    queryClient.invalidateQueries({ queryKey: ["udb-factions"] });
    queryClient.invalidateQueries({ queryKey: ["udb-units"] });
    queryClient.invalidateQueries({ queryKey: ["udb-unit-detail"] });
    queryClient.invalidateQueries({ queryKey: ["wahapedia-factions"] });
    queryClient.invalidateQueries({ queryKey: ["datasheets-by-faction"] });
    queryClient.invalidateQueries({ queryKey: ["datasheets-with-points"] });
    queryClient.invalidateQueries({ queryKey: ["datasheet"] });
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
