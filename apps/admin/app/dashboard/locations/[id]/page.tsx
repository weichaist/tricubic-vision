"use client";

import { useParams, useSearchParams, useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { Database } from "@/database.types";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery } from "@tanstack/react-query";
import { Bell, PartyPopper, FolderClock } from "lucide-react";

// Import the table components
import { LocationAlertsTable } from "@/components/dashboard/location-alerts-table";
import { LocationApplauseTable } from "@/components/dashboard/location-applause-table";
import { LocationLogsTable } from "@/components/dashboard/location-logs-table";

type Location = Database["public"]["Tables"]["locations"]["Row"] & {
  companies?: {
    name: string;
  };
};

export default function LocationDetailsPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const locationId = params.id as string;
  const supabase = createClient();

  // Get the active tab from search params or default to "alerts"
  const activeTab = searchParams.get("tab") || "alerts";

  // Function to handle tab change
  const handleTabChange = (value: string) => {
    router.push(`/dashboard/locations/${locationId}?tab=${value}`, {
      scroll: false,
    });
  };

  // Fetch location details
  const { data: locationData, isLoading: isLoadingLocation } = useQuery({
    queryKey: ["location", locationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("locations")
        .select("*, companies(name)")
        .eq("uid", locationId)
        .single();

      if (error) {
        console.error("Error fetching location:", error);
        return null;
      }

      return data;
    },
  });

  const location: Location | null = locationData ?? null;

  // We've moved the data fetching logic to the individual table components

  if (isLoadingLocation) {
    return <div className="p-4">読み込み中...</div>;
  }

  if (!location) {
    return <div className="p-4">場所が見つかりませんでした。</div>;
  }

  return (
    <>
      <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12">
        <div className="flex items-center gap-2 px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem className="hidden md:block">
                <BreadcrumbLink href="/dashboard">探知結果</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator className="hidden md:block" />
              <BreadcrumbItem className="hidden md:block">
                <BreadcrumbLink href="/dashboard/locations">
                  拠点
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator className="hidden md:block" />
              <BreadcrumbItem>
                <BreadcrumbPage>{location.name}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </header>
      <div className="flex flex-1 flex-col gap-6 p-4 pt-0">
        <div className="flex flex-col gap-2">
          <h2 className="text-2xl font-bold tracking-tight">{location.name}</h2>
          <p className="text-muted-foreground">
            {location.companies?.name || "会社情報なし"} -{" "}
            {location.address || "住所情報なし"}
          </p>
        </div>

        <Tabs
          value={activeTab}
          onValueChange={handleTabChange}
          className="w-full"
        >
          <TabsList className="mb-4">
            <TabsTrigger value="alerts" className="flex items-center gap-2">
              <Bell className="h-4 w-4" />
              アラート
            </TabsTrigger>
            <TabsTrigger value="applause" className="flex items-center gap-2">
              <PartyPopper className="h-4 w-4" />
              ブラボー
            </TabsTrigger>
            <TabsTrigger value="logs" className="flex items-center gap-2">
              <FolderClock className="h-4 w-4" />
              ログ
            </TabsTrigger>
          </TabsList>

          <TabsContent value="alerts" className="space-y-4">
            <LocationAlertsTable locationId={locationId} />
          </TabsContent>

          <TabsContent value="applause" className="space-y-4">
            <LocationApplauseTable locationId={locationId} />
          </TabsContent>

          <TabsContent value="logs" className="space-y-4">
            <LocationLogsTable locationId={locationId} />
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}
