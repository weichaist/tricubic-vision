"use client";

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/utils/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, MapPin, Plus } from "lucide-react";
import { LocationCard } from "./location-card";
import { Database } from "@/database.types";
import Link from "next/link";

type Location = Database["public"]["Tables"]["locations"]["Row"] & {
  companies?: {
    name: string;
  };
};

export function LocationsSection() {
  const supabase = createClient();

  const { data: locations, isLoading } = useQuery({
    queryKey: ["dashboard-locations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("locations")
        .select("*, companies(name)")
        .order("name");
        
      if (error) {
        throw new Error(error.message);
      }
      
      return data as Location[];
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <MapPin className="h-5 w-5 mr-2" />
          <h2 className="text-xl font-semibold">拠点</h2>
        </div>
        <Button asChild size="sm">
          <Link href="/dashboard/locations/add">
            <Plus className="h-4 w-4 mr-1" />
            <span>拠点を追加</span>
          </Link>
        </Button>
      </div>
      
      {isLoading ? (
        <div className="flex justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : locations && locations.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {locations.map((location) => (
            <LocationCard key={location.uid} location={location} />
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-8">
            <MapPin className="h-8 w-8 text-muted-foreground mb-2" />
            <p className="text-muted-foreground">拠点がありません</p>
            <Button asChild className="mt-4" variant="outline">
              <Link href="/dashboard/locations/add">
                <Plus className="h-4 w-4 mr-1" />
                <span>拠点を追加</span>
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
