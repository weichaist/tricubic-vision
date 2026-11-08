"use client";

import {
  Folder,
  Forward,
  Loader2,
  MapPin,
  MoreHorizontal,
  Trash2,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/utils/supabase/client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

type Location = {
  uid: string;
  name: string;
  address: string | null;
  created_at: string;
  company_uid: string | null;
};

export function NavLocations() {
  const { isMobile } = useSidebar();
  const supabase = createClient();

  const { data: locations, isLoading } = useQuery({
    queryKey: ["sidebar-locations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("locations")
        .select("*")
        .order("name");

      if (error) {
        throw new Error(error.message);
      }

      return data as Location[];
    },
  });

  return (
    <SidebarGroup className="group-data-[collapsible=icon]:hidden">
      <SidebarGroupLabel>拠点</SidebarGroupLabel>
      <SidebarMenu>
        {isLoading ? (
          <SidebarMenuItem>
            <SidebarMenuButton>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>読み込み中...</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        ) : locations && locations.length > 0 ? (
          locations.map((location) => (
            <SidebarMenuItem key={location.uid}>
              <SidebarMenuButton asChild>
                <a href={`/dashboard/locations/${location.uid}`}>
                  <MapPin />
                  <span>{location.name}</span>
                </a>
              </SidebarMenuButton>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <SidebarMenuAction showOnHover>
                    <MoreHorizontal />
                    <span className="sr-only">More</span>
                  </SidebarMenuAction>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  className="w-48 rounded-lg"
                  side={isMobile ? "bottom" : "right"}
                  align={isMobile ? "end" : "start"}
                >
                  <DropdownMenuItem>
                    <Folder className="text-muted-foreground" />
                    <span>拠点を表示</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Forward className="text-muted-foreground" />
                    <span>拠点を共有</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem>
                    <Trash2 className="text-muted-foreground" />
                    <span>拠点を削除</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </SidebarMenuItem>
          ))
        ) : (
          <SidebarMenuItem>
            <SidebarMenuButton>
              <MapPin />
              <span>拠点が追加されました</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        )}
      </SidebarMenu>
    </SidebarGroup>
  );
}
