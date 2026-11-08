"use client";

import { Bell, PartyPopper, FolderClock, ArrowRight } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/utils/supabase/client";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Database } from "@/database.types";
import Link from "next/link";

type Location = Database["public"]["Tables"]["locations"]["Row"] & {
  companies?: {
    name: string;
  };
};

interface LocationCardProps {
  location: Location;
}

export function LocationCard({ location }: LocationCardProps) {
  const supabase = createClient();
  // Use Tokyo time (JST, UTC+9)
  const now = new Date();
  const tokyoDate = new Date(
    now.toLocaleString("en-US", { timeZone: "Asia/Tokyo" })
  );
  tokyoDate.setHours(0, 0, 0, 0);
  const todayISOString = tokyoDate.toISOString();

  // Get alerts count
  const { data: alertsCount = 0 } = useQuery({
    queryKey: ["location-alerts-count", location.uid],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("alerts")
        .select("*", { count: "exact", head: true })
        .eq("location_uid", location.uid)
        .gte("timestamp", todayISOString);

      if (error) {
        console.error("Error fetching alerts count:", error);
        return 0;
      }

      return count || 0;
    },
    refetchInterval: 60000, // Refetch every minute (60000ms)
  });

  // Get applause count
  const { data: applauseCount = 0 } = useQuery({
    queryKey: ["location-applause-count", location.uid],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("applause")
        .select("*", { count: "exact", head: true })
        .eq("location_uid", location.uid)
        .gte("timestamp", todayISOString);

      if (error) {
        console.error("Error fetching applause count:", error);
        return 0;
      }

      return count || 0;
    },
    refetchInterval: 60000, // Refetch every minute (60000ms)
  });

  // Get today's logs count
  const { data: logsCount = 0 } = useQuery({
    queryKey: ["location-logs-count", location.uid],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("logs")
        .select("*", { count: "exact", head: true })
        .eq("location_uid", location.uid)
        .gte("created_at", todayISOString);

      if (error) {
        console.error("Error fetching logs count:", error);
        return 0;
      }

      return count || 0;
    },
    refetchInterval: 60000, // Refetch every minute (60000ms)
  });

  return (
    <Card className="overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 bg-muted/20">
        <CardTitle className="text-md font-medium truncate">
          {location.name}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="grid grid-cols-3 divide-x">
          <div className="flex flex-col items-center justify-center p-3">
            <Bell className="h-6 w-6 text-muted-foreground mb-1" />
            <div className="text-xl font-bold">{alertsCount}</div>
            <p className="text-xs text-muted-foreground">アラート</p>
          </div>
          <div className="flex flex-col items-center justify-center p-3">
            <PartyPopper className="h-6 w-6 text-muted-foreground mb-1" />
            <div className="text-xl font-bold">{applauseCount}</div>
            <p className="text-xs text-muted-foreground">ブラボー</p>
          </div>
          <div className="flex flex-col items-center justify-center p-3">
            <FolderClock className="h-6 w-6 text-muted-foreground mb-1" />
            <div className="text-xl font-bold">{logsCount}</div>
            <p className="text-xs text-muted-foreground">今日のログ</p>
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex justify-end p-2 bg-muted/10 border-t">
        <Button variant="ghost" size="sm" asChild className="text-xs">
          <Link href={`/dashboard/locations/${location.uid}`}>
            詳細を見る
            <ArrowRight className="ml-1 h-3 w-3" />
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
