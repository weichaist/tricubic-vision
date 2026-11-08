"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/utils/supabase/client";
import { Shield, Loader2, Plus } from "lucide-react";
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
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import toast from "react-hot-toast";
import { Database } from "@/database.types";

type Rule = Database["public"]["Tables"]["rules"]["Row"];
type Location = Database["public"]["Tables"]["locations"]["Row"] & {
  companies?: {
    name: string;
  };
};

export default function AddRulePage() {
  const router = useRouter();
  const supabase = createClient();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState<{
    name: string;
    details: string;
    location_uid: string | null;
    status: string;
  }>({
    name: "",
    details: "",
    location_uid: null,
    status: "active",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch current user to get company_uid and role
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

  // Create rule mutation
  const createRuleMutation = useMutation({
    mutationFn: async (
      newRule: Omit<Rule, "uid" | "created_at" | "updated_at">
    ) => {
      const { data, error } = await supabase
        .from("rules")
        .insert(newRule)
        .select("*")
        .single();

      if (error) {
        throw new Error(error.message);
      }

      return data;
    },
    onSuccess: () => {
      // Invalidate queries and redirect
      queryClient.invalidateQueries({ queryKey: ["dashboard-rules"] });
      toast.success("ルールが追加されました");
      router.push("/dashboard/rules");
    },
    onError: (error) => {
      toast.error(`エラー: ${error.message}`);
      setIsSubmitting(false);
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Validate form
    if (!formData.name) {
      toast.error("ルール名は必須です");
      setIsSubmitting(false);
      return;
    }

    // Submit the form
    createRuleMutation.mutate({
      name: formData.name,
      details: formData.details || null,
      location_uid: formData.location_uid,
      status: formData.status,
      company_uid: currentUser?.company_uid || null,
    });
  };
  
  // Check if user is admin
  const isAdmin = currentUser?.role === "admin";

  // Render loading state while checking user
  if (userLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
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
                  <BreadcrumbPage>追加</BreadcrumbPage>
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
                  このページにアクセスする権限がありません。管理者のみがルールを追加できます。
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
  
  // If user is admin, show the form
  return (
    <>
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
                <BreadcrumbPage>追加</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </header>
      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        <div className="grid grid-cols-1 gap-4">
          <Card>
            <form onSubmit={handleSubmit}>
              <CardHeader>
                <CardTitle>新しいルールを追加</CardTitle>
                <CardDescription>
                  ルールの詳細を入力してください。
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">ルール名 *</Label>
                  <Input
                    id="name"
                    placeholder="ルール名を入力"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="details">詳細</Label>
                  <Textarea
                    id="details"
                    placeholder="ルールの詳細を入力"
                    value={formData.details}
                    onChange={(e) =>
                      setFormData({ ...formData, details: e.target.value })
                    }
                    rows={4}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="location">ロケーション</Label>
                  <Select
                    value={formData.location_uid || "none"}
                    onValueChange={(value) =>
                      setFormData({
                        ...formData,
                        location_uid: value === "none" ? null : value,
                      })
                    }
                  >
                    <SelectTrigger id="location">
                      <SelectValue placeholder="ロケーションを選択" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">全社</SelectItem>
                      {locations?.map((location) => (
                        <SelectItem key={location.uid} value={location.uid}>
                          {location.name}
                          {location.companies?.name
                            ? ` (${location.companies.name})`
                            : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {locationsLoading && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      ロケーションを読み込み中...
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="status">ステータス</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value) =>
                      setFormData({ ...formData, status: value })
                    }
                  >
                    <SelectTrigger id="status">
                      <SelectValue placeholder="ステータスを選択" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">有効</SelectItem>
                      <SelectItem value="inactive">無効</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
              <CardFooter className="flex justify-between">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push("/dashboard/rules")}
                >
                  キャンセル
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      保存中...
                    </>
                  ) : (
                    <>
                      <Plus className="mr-2 h-4 w-4" />
                      ルールを追加
                    </>
                  )}
                </Button>
              </CardFooter>
            </form>
          </Card>
        </div>
      </div>
    </>
  );
}
