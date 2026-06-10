import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { useAppSettings } from "@/hooks/useAppSettings";
import { AboutTab } from "@/features/settings/AboutTab";
import { DataManagementTab } from "@/features/settings/DataManagementTab";

export function SettingsPage() {
  const { isLoading, isError } = useAppSettings();

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-xl font-semibold">Settings</h1>
      <Tabs defaultValue="preferences">
        <TabsList>
          <TabsTrigger value="preferences">Preferences</TabsTrigger>
          <TabsTrigger value="data">Data</TabsTrigger>
          <TabsTrigger value="about">About</TabsTrigger>
        </TabsList>
        <TabsContent value="preferences" className="mt-4">
          {isLoading ? (
            <Skeleton className="h-4 w-48" />
          ) : isError ? (
            <p className="text-destructive text-sm">
              Could not load settings. Restart the app to try again.
            </p>
          ) : (
            <>
              <h2 className="text-lg font-semibold">Preferences</h2>
              <p className="text-muted-foreground text-sm">
                Language, currency, default faction, and points target — coming in the next update.
              </p>
            </>
          )}
        </TabsContent>
        <TabsContent value="data" className="mt-4">
          <DataManagementTab />
        </TabsContent>
        <TabsContent value="about" className="mt-4">
          <AboutTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
