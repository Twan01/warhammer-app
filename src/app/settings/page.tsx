import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { useAppSettings } from "@/hooks/useAppSettings";
import { AboutTab } from "@/features/settings/AboutTab";
import { DataManagementTab } from "@/features/settings/DataManagementTab";
import { GeneralPreferencesSection } from "@/features/settings/GeneralPreferencesSection";
import { HobbyDefaultsSection } from "@/features/settings/HobbyDefaultsSection";
import { PageHeader } from "@/components/common/PageHeader";

export function SettingsPage() {
  const { isLoading, isError } = useAppSettings();

  return (
    <div className="flex flex-col gap-6 p-6">
      <PageHeader title="Settings" />
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
              <GeneralPreferencesSection />
              <HobbyDefaultsSection />
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
