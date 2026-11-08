"use client";

import * as React from "react";
import { Map, Settings2, Users, Gauge, Shield } from "lucide-react";

import { NavMain } from "@/components/nav-main";
import { NavLocations } from "@/components/nav-locations";
import { NavUser } from "@/components/nav-user";
import { TeamSwitcher } from "@/components/team-switcher";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar";

// Sidebar header and navigation
const data = {
  teams: [
    {
      name: "Tricubic Vision",
      logo: "/logo.png",
      plan: "管理ポータル",
    },
  ],
  navMain: [
    {
      title: "探知結果",
      url: "/dashboard",
      icon: Gauge,
      isActive: true,
      items: [
        {
          title: "概要",
          url: "/dashboard",
        },
      ],
    },
    {
      title: "ルール管理",
      url: "/dashboard/rules",
      icon: Shield,
      isActive: true,
      items: [
        {
          title: "ルール一覧",
          url: "/dashboard/rules",
        },
        {
          title: "ルール追加",
          url: "/dashboard/rules/add",
        },
      ],
    },
    {
      title: "拠点管理",
      url: "/dashboard/locations",
      icon: Map,
      items: [
        {
          title: "拠点追加",
          url: "/dashboard/locations/add",
        },
        {
          title: "拠点一覧",
          url: "/dashboard/locations",
        },
      ],
    },
    {
      title: "アカウント管理",
      url: "/dashboard/accounts",
      icon: Users,
      items: [
        {
          title: "新規アカウント作成",
          url: "/dashboard/accounts/create",
        },
        {
          title: "アカウント一覧",
          url: "/dashboard/accounts",
        },
      ],
    },
    {
      title: "設定",
      url: "/settings",
      icon: Settings2,
      items: [
        {
          title: "一般",
          url: "#",
        },
        {
          title: "アカウント",
          url: "#",
        },
      ],
    },
  ],
};

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <TeamSwitcher teams={data.teams} />
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
        <NavLocations />
      </SidebarContent>
      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
