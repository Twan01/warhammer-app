import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useUpdateSetting } from "@/hooks/useAppSettings";
import { SUPPORTED_CURRENCIES } from "@/hooks/useCurrencyPreference";
import { toast } from "sonner";
import type { AppSettingsMap } from "@/db/queries/appSettings";

const CURRENCY_LABELS: Record<string, string> = {
  GBP: "GBP (£)",
  EUR: "EUR (€)",
  USD: "USD ($)",
  CAD: "CAD (CA$)",
  AUD: "AUD (A$)",
  JPY: "JPY (¥)",
};

export function CurrencySetting({
  settings,
}: {
  settings: AppSettingsMap;
}) {
  const updateSetting = useUpdateSetting();
  const current = settings["currency"] ?? "GBP";

  function handleChange(value: string) {
    if (!(SUPPORTED_CURRENCIES as readonly string[]).includes(value)) return;
    updateSetting.mutate(
      { key: "currency", value },
      { onError: () => toast.error("Could not save setting. Try again.") },
    );
  }

  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <p className="text-sm font-semibold">Currency</p>
        <p className="text-sm text-muted-foreground">
          Used across spending tracker, wishlist, and unit costs
        </p>
      </div>
      <div className="min-w-[160px] flex justify-end">
        <Select value={current} onValueChange={handleChange}>
          <SelectTrigger className="w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SUPPORTED_CURRENCIES.map((code) => (
              <SelectItem key={code} value={code}>
                {CURRENCY_LABELS[code] ?? code}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
