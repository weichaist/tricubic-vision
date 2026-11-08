"use client";

import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/utils/supabase/client";
import {
  Shield,
  Loader2,
  Plus,
  MoreHorizontal,
  Pencil,
  Trash2,
} from "lucide-react";
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
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import toast from "react-hot-toast";
import { Database } from "@/database.types";

type Rule = Database["public"]["Tables"]["rules"]["Row"] & {
  locations?: {
    name: string;
  };
};

export default function RulesPage() {
  const router = useRouter();
  const supabase = createClient();
  const queryClient = useQueryClient();

  // Fetch rules
  const { data: rules, isLoading } = useQuery({
    queryKey: ["rules"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rules")
        .select("*, locations(name)")
        .order("status", { ascending: true })
        .order("updated_at", { ascending: false });

      if (error) {
        throw new Error(error.message);
      }

      return data as Rule[];
    },
  });

  // Delete rule mutation
  const deleteRuleMutation = useMutation({
    mutationFn: async (ruleId: string) => {
      const { error } = await supabase.from("rules").delete().eq("uid", ruleId);

      if (error) {
        throw new Error(error.message);
      }

      return ruleId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rules"] });
      toast.success("ルールが削除されました");
    },
    onError: (error) => {
      toast.error(`エラー: ${error.message}`);
    },
  });

  // Handle delete rule
  const handleDelete = (ruleId: string) => {
    if (confirm("このルールを削除してもよろしいですか？")) {
      deleteRuleMutation.mutate(ruleId);
    }
  };

  // Translate status to Japanese
  const getStatusText = (status: string) => {
    switch (status.toLowerCase()) {
      case "active":
        return "有効";
      case "inactive":
        return "保留中";
      default:
        return status;
    }
  };

  // Get badge variant based on status
  const getBadgeVariant = (status: string) => {
    switch (status.toLowerCase()) {
      case "active":
        return "default";
      case "inactive":
        return "secondary";
      default:
        return "default";
    }
  };

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
              <BreadcrumbItem>
                <BreadcrumbPage>ルール管理</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
        <div className="ml-auto flex items-center gap-2 px-4">
          <Button onClick={() => router.push("/dashboard/rules/add")}>
            <Plus className="mr-2 h-4 w-4" />
            新規ルール追加
          </Button>
        </div>
      </header>
      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Shield className="h-5 w-5 mr-2" />
              ルール一覧
            </CardTitle>
            <CardDescription>登録されている全てのルール</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ルール名</TableHead>
                  <TableHead className="hidden lg:table-cell">詳細</TableHead>
                  <TableHead className="hidden md:table-cell">拠点</TableHead>
                  <TableHead className="hidden md:table-cell">
                    ステータス
                  </TableHead>
                  <TableHead className="w-[80px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8">
                      <div className="flex justify-center">
                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                      </div>
                    </TableCell>
                  </TableRow>
                ) : rules && rules.length > 0 ? (
                  rules.map((rule) => (
                    <TableRow
                      key={rule.uid}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() =>
                        router.push(`/dashboard/rules/${rule.uid}/edit`)
                      }
                    >
                      <TableCell className="font-medium max-w-[270px]">{rule.name}</TableCell>
                      <TableCell className="hidden lg:table-cell max-w-[480px] ">
                        {rule.details}
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {rule.locations?.name || "全社"}
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <Badge variant={getBadgeVariant(rule.status)}>
                          {getStatusText(rule.status)}
                        </Badge>
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                              <span className="sr-only">メニュー</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() =>
                                router.push(`/dashboard/rules/${rule.uid}/edit`)
                              }
                            >
                              <Pencil className="mr-2 h-4 w-4" />
                              <span>編集</span>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => handleDelete(rule.uid)}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              <span>削除</span>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8">
                      <div className="flex flex-col items-center justify-center">
                        <Shield className="h-8 w-8 text-muted-foreground mb-2" />
                        <p className="text-muted-foreground">
                          ルールがありません
                        </p>
                        <Button
                          variant="outline"
                          className="mt-4"
                          onClick={() => router.push("/dashboard/rules/add")}
                        >
                          <Plus className="mr-2 h-4 w-4" />
                          新規ルール追加
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
