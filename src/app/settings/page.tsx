import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { useAppSettings } from "@/hooks/useAppSettings";

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
          <h2 className="text-lg font-semibold">Data Management</h2>
          <p className="text-muted-foreground text-sm">
            Data health link, factory reset, and preference backup — coming in the next update.
          </p>
        </TabsContent>
        <TabsContent value="about" className="mt-4">
          <h2 className="text-lg font-semibold">About HobbyForge</h2>
          <p className="text-muted-foreground text-sm">
            App version, data statistics, and attribution — coming in the next update.
          </p>
        </TabsContent>
      </Tabs>
    </div>
  );
}
