"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { BadgeCheck, Bell, ChevronsUpDown, LogOut } from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { createClient } from "@/utils/supabase/client";
import { Tables } from "@/database.types";

export function NavUser() {
  const { isMobile } = useSidebar();
  const router = useRouter();
  const [authUser, setAuthUser] = useState<{
    id: string;
    email: string;
  } | null>(null);
  const [dbUser, setDbUser] = useState<Tables<"users"> | null>(null);
  const [isSigningOut, setIsSigningOut] = useState(false);

  useEffect(() => {
    const fetchUser = async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        setAuthUser({
          id: user.id,
          email: user.email || "",
        });

        // Get user profile from the database
        const { data } = await supabase
          .from("users")
          .select("*")
          .eq("uid", user.id)
          .single();

        if (data) {
          setDbUser(data);
        }
      }
    };

    fetchUser();
  }, []);

  if (!authUser) {
    return null;
  }

  // Get display name from database or fallback to email username
  const displayName = dbUser
    ? [dbUser.first_name, dbUser.last_name].filter(Boolean).join(" ") ||
      authUser.email.split("@")[0]
    : authUser.email.split("@")[0] || "ユーザー";

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <Avatar className="h-8 w-8 rounded-lg">
                <AvatarFallback className="rounded-lg">
                  {displayName.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold">{displayName}</span>
                <span className="truncate text-xs">{authUser.email}</span>
              </div>
              <ChevronsUpDown className="ml-auto size-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                <Avatar className="h-8 w-8 rounded-lg">
                  <AvatarFallback className="rounded-lg">
                    {displayName.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">{displayName}</span>
                  <span className="truncate text-xs">{authUser.email}</span>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />

            <DropdownMenuGroup>
              <DropdownMenuItem>
                <BadgeCheck />
                アカウント
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Bell />
                通知
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <button
                className="flex w-full items-center gap-2 cursor-pointer px-2 py-1.5"
                onClick={async () => {
                  try {
                    setIsSigningOut(true);
                    const supabase = createClient();
                    await supabase.auth.signOut();
                    router.push("/sign-in");
                  } catch (error) {
                    console.error("Error signing out:", error);
                  } finally {
                    setIsSigningOut(false);
                  }
                }}
                disabled={isSigningOut}
              >
                <LogOut className="h-4 w-4" />
                {isSigningOut ? "サインアウト中..." : "ログアウト"}
              </button>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
