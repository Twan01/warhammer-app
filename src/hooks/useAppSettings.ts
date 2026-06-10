import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getAppSettings,
  upsertAppSetting,
  type AppSettingsMap,
} from "@/db/queries/appSettings";

export const APP_SETTINGS_KEY = ["app-settings"] as const;

export function useAppSettings() {
  return useQuery<AppSettingsMap>({
    queryKey: APP_SETTINGS_KEY,
    queryFn: getAppSettings,
  });
}

export function useUpdateSetting() {
  const qc = useQueryClient();
  return useMutation<void, Error, { key: string; value: string }>({
    mutationFn: ({ key, value }) => upsertAppSetting(key, value),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: APP_SETTINGS_KEY });
    },
  });
}
