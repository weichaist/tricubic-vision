"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/utils/supabase/client";
import { Shield, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
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
import { Database } from "@/database.types";
import { RuleEditForm } from "@/components/rules/rule-edit-form";

type Rule = Database["public"]["Tables"]["rules"]["Row"];
type Location = Database["public"]["Tables"]["locations"]["Row"] & {
  companies?: {
    name: string;
  };
};

export default function EditRulePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const supabase = createClient();
  const unwrappedParams = use(params);
  const ruleId = unwrappedParams.id;
  
  // Fetch current user to get role
  const { data: currentUser, isLoading: userLoading } = useQuery({
    queryKey: ["current-user"],
    queryFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("uid", user.id)
        .single();

      if (error) {
        console.error("Error fetching user:", error);
        return null;
      }

      return data;
    },
  });
  
  // Check if user is admin
  const isAdmin = currentUser?.role === "admin";

  // Fetch rule data
  const { data: rule, isLoading: ruleLoading } = useQuery({
    queryKey: ["rule", ruleId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rules")
        .select("*")
        .eq("uid", ruleId)
        .single();

      if (error) {
        throw new Error(error.message);
      }

      return data as Rule;
    },
  });

  // Fetch locations for the dropdown
  const { data: locations, isLoading: locationsLoading } = useQuery({
    queryKey: ["locations-for-rule"],
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

  // Render loading state while checking user or rule
  if (userLoading || ruleLoading || !rule) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }
  
  // Show access denied if user is not admin
  if (!isAdmin) {
    return (
      <div className="flex h-screen w-full flex-col">
        <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12">
          <div className="flex items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem className="hidden md:block">
                  <BreadcrumbLink asChild>
                    <Link href="/dashboard">ダッシュボード</Link>
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
                <BreadcrumbItem className="hidden md:block">
                  <BreadcrumbLink asChild>
                    <Link href="/dashboard/rules">ルール</Link>
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
                <BreadcrumbItem>
                  <BreadcrumbPage>編集</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
          <div className="flex items-center justify-center min-h-[400px]">
            <Card className="w-full max-w-md">
              <CardHeader className="text-center">
                <Shield className="h-12 w-12 mx-auto text-red-500 mb-4" />
                <CardTitle className="text-xl">アクセス拒否</CardTitle>
                <CardDescription>
                  このページにアクセスする権限がありません。管理者のみがルールを編集できます。
                </CardDescription>
              </CardHeader>
              <CardFooter className="flex justify-center">
                <Button onClick={() => router.push("/dashboard/rules")} variant="outline">
                  ルール一覧に戻る
                </Button>
              </CardFooter>
            </Card>
          </div>
        </div>
      </div>
    );
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
                <BreadcrumbLink href="/dashboard">
                  ダッシュボード
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator className="hidden md:block" />
              <BreadcrumbItem className="hidden md:block">
                <BreadcrumbLink href="/dashboard/rules">
                  ルール管理
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator className="hidden md:block" />
              <BreadcrumbItem>
                <BreadcrumbPage>編集</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </header>
      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        <RuleEditForm 
          rule={rule} 
          locations={locations} 
          locationsLoading={locationsLoading} 
          ruleId={ruleId} 
          router={router} 
        />
      </div>
    </>
  );
}
