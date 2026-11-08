"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  MapPin,
  Plus,
  MoreHorizontal,
  Pencil,
  Trash2,
  Loader2,
} from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";
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
import { createClient } from "@/utils/supabase/client";

// Types
type Location = {
  uid: string;
  name: string;
  address: string | null;
  created_at: string | null;
  companies: {
    uid: string;
    name: string;
  } | null;
};

type SupabaseError = {
  message: string;
};

export default function LocationsPage() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  // We rely on server-side authentication checks in dashboard layout

  // Fetch locations
  const { data: locations, isLoading } = useQuery({
    queryKey: ["locations"],
    queryFn: async () => {
      const { data, error } = await supabase.from("locations").select(`
          uid,
          name,
          address,
          created_at,
          companies (
            uid,
            name
          )
        `);

      if (error) {
        toast.error("拠点データの取得に失敗しました");
        console.error("Error fetching locations:", error);
        return [];
      }

      return data as Location[];
    },
  });

  // Delete location mutation
  const deleteMutation = useMutation({
    mutationFn: async (locationId: string) => {
      const { error } = await supabase
        .from("locations")
        .delete()
        .eq("uid", locationId);

      if (error) throw error;
      return { success: true };
    },
    onSuccess: () => {
      toast.success("拠点が削除されました");
      // Refetch locations
      queryClient.invalidateQueries({ queryKey: ["locations"] });
    },
    onError: (error: SupabaseError) => {
      toast.error(`拠点の削除に失敗しました: ${error.message}`);
    },
  });

  // Handle delete
  const handleDelete = (locationId: string) => {
    if (confirm("この拠点を削除してもよろしいですか？")) {
      deleteMutation.mutate(locationId);
    }
  };

  // Show loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin" />
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
              <BreadcrumbItem>
                <BreadcrumbPage>拠点管理</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
        <div className="ml-auto flex items-center gap-2 px-4">
          <Button asChild size="sm">
            <Link href="/dashboard/locations/add">
              <Plus className="mr-2 h-4 w-4" />
              拠点追加
            </Link>
          </Button>
        </div>
      </header>
      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              拠点一覧
            </CardTitle>
            <CardDescription>登録されている全ての拠点</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>拠点名</TableHead>
                  <TableHead>住所</TableHead>
                  <TableHead className="hidden md:table-cell">会社</TableHead>
                  <TableHead className="hidden md:table-cell">作成日</TableHead>
                  <TableHead className="w-[80px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {locations && locations.length > 0 ? (
                  locations.map((location) => (
                    <TableRow key={location.uid}>
                      <TableCell className="font-medium">
                        <Link 
                          href={`/dashboard/locations/${location.uid}`}
                          className="hover:underline hover:text-blue-600 transition-colors"
                        >
                          {location.name}
                        </Link>
                      </TableCell>
                      <TableCell>{location.address || "未設定"}</TableCell>
                      <TableCell className="hidden md:table-cell">
                        {location.companies?.name}
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {new Date(location.created_at || "").toLocaleDateString(
                          "ja-JP"
                        )}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                              <span className="sr-only">メニュー</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem>
                              <Pencil className="mr-2 h-4 w-4" />
                              <span>編集</span>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => handleDelete(location.uid)}
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
                    <TableCell
                      colSpan={5}
                      className="text-center py-6 text-muted-foreground"
                    >
                      拠点が登録されていません
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
