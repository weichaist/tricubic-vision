"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/utils/supabase/client";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import { toZonedTime } from "date-fns-tz";
import { Tables } from "@/database.types";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight, Download } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertDetailsViewer } from "./alert-details-viewer";

// Use the database schema type with joined users table
interface Alert extends Tables<"alerts"> {
  users?: {
    first_name: string | null;
    last_name: string | null;
  } | null;
}

// Define the structure of the details field
interface LocationAlertsTableProps {
  locationId: string;
  itemsPerPage?: number;
}

export function LocationAlertsTable({
  locationId,
  itemsPerPage = 100,
}: LocationAlertsTableProps) {
  const supabase = createClient();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Get current page from URL or default to 1
  const currentPage = parseInt(searchParams.get("page") || "1", 10);

  // Get filter values from URL
  const dateFrom = searchParams.get("dateFrom") || "";
  const dateTo = searchParams.get("dateTo") || "";
  const ruleUid = searchParams.get("ruleUid") || "";

  // Create a new URLSearchParams instance for navigation
  const createQueryString = (name: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(name, value);
    } else {
      params.delete(name);
    }
    return params.toString();
  };

  // Update multiple query parameters at once
  const updateFilters = (filters: Record<string, string>) => {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(filters).forEach(([key, value]) => {
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
    });
    // Reset to page 1 when filters change
    params.set("page", "1");
    router.push(`${pathname}?${params.toString()}`);
  };

  // Export function to download all alerts as CSV
  const exportAlerts = async () => {
    setIsExporting(true);
    try {
      let query = supabase
        .from("alerts")
        .select("*, users(first_name, last_name)")
        .eq("location_uid", locationId)
        .order("timestamp", { ascending: false });

      // Apply same filters as the table
      if (dateFrom) {
        query = query.gte("timestamp", dateFrom);
      }
      if (dateTo) {
        query = query.lte("timestamp", dateTo);
      }
      if (ruleUid && ruleUid !== "all") {
        query = query.eq("rule_uid", ruleUid);
      }

      const { data, error } = await query;

      if (error) {
        console.error("Error fetching alerts for export:", error);
        alert("エクスポート中にエラーが発生しました");
        return;
      }

      if (!data || data.length === 0) {
        alert("エクスポートするデータがありません");
        return;
      }

      // Convert to CSV
      const headers = [
        "日時",
        "アラート名",
        "ユーザー名",
        "詳細",
        "アラートID",
        "場所ID",
        "会社ID",
        "ルールID",
        "ユーザーID",
      ];

      const csvContent = [
        headers.join(","),
        ...data.map((alert) =>
          [
            alert.timestamp ? `"${formatDate(alert.timestamp)}"` : "",
            `"${alert.name.replace(/"/g, '""')}"`,
            alert.users
              ? `"${alert.users.last_name || ""} ${alert.users.first_name || ""}"`.trim()
              : `"${alert.user_uid || ""}"`,
            alert.details
              ? `"${JSON.stringify(alert.details).replace(/"/g, '""')}"`
              : "",
            `"${alert.uid}"`,
            `"${alert.location_uid}"`,
            `"${alert.company_uid || ""}"`,
            `"${alert.rule_uid || ""}"`,
            `"${alert.user_uid || ""}"`,
          ].join(",")
        ),
      ].join("\n");

      // Add BOM for proper UTF-8 display in Excel
      const bom = "\uFEFF";
      const blob = new Blob([bom + csvContent], {
        type: "text/csv;charset=utf-8;",
      });

      // Create download link
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);

      // Generate filename with current date
      const now = new Date();
      const dateStr = format(now, "yyyy-MM-dd_HH-mm-ss");
      link.setAttribute("download", `alerts_export_${dateStr}.csv`);

      // Trigger download
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Export error:", error);
      alert("エクスポート中にエラーが発生しました");
    } finally {
      setIsExporting(false);
    }
  };

  // Fetch total count of alerts for pagination
  const { data: countData } = useQuery({
    queryKey: ["location-alerts-count", locationId, dateFrom, dateTo, ruleUid],
    queryFn: async () => {
      let query = supabase
        .from("alerts")
        .select("*", { count: "exact", head: true })
        .eq("location_uid", locationId);

      // Apply date filters
      if (dateFrom) {
        query = query.gte("timestamp", dateFrom);
      }
      if (dateTo) {
        query = query.lte("timestamp", dateTo);
      }

      // Apply rule filter
      if (ruleUid && ruleUid !== "all") {
        query = query.eq("rule_uid", ruleUid);
      }

      const { count, error } = await query;

      if (error) {
        console.error("Error fetching alerts count:", error);
        return 0;
      }

      return count || 0;
    },
    refetchInterval: 60000, // Refetch every minute
  });

  const totalCount = countData ?? 0;

  // Fetch alerts with pagination
  const { data: alerts = [], isLoading } = useQuery<Alert[]>({
    queryKey: [
      "location-alerts",
      locationId,
      currentPage,
      itemsPerPage,
      dateFrom,
      dateTo,
      ruleUid,
    ],
    queryFn: async () => {
      let query = supabase
        .from("alerts")
        .select("*, users(first_name, last_name)")
        .eq("location_uid", locationId)
        .order("timestamp", { ascending: false });

      // Apply date filters
      if (dateFrom) {
        query = query.gte("timestamp", dateFrom);
      }
      if (dateTo) {
        query = query.lte("timestamp", dateTo);
      }

      // Apply rule filter
      if (ruleUid && ruleUid !== "all") {
        query = query.eq("rule_uid", ruleUid);
      }

      const { data, error } = await query.range(from, from + itemsPerPage - 1);

      if (error) {
        console.error("Error fetching alerts:", error);
        return [];
      }

      return data || [];
    },
    refetchInterval: 60000, // Refetch every minute
  });

  // Fetch available rules for the filter dropdown
  const { data: rules = [] } = useQuery({
    queryKey: ["location-rules", locationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rules")
        .select("uid, name")
        .or(`location_uid.is.null,location_uid.eq.${locationId}`)
        .order("name");

      if (error) {
        console.error("Error fetching rules:", error);
        return [];
      }

      return data || [];
    },
  });

  // Calculate pagination values
  const totalPages = Math.ceil(totalCount / itemsPerPage);
  const from = (currentPage - 1) * itemsPerPage;
  const to = Math.min(from + itemsPerPage, totalCount);

  // Function to handle row click
  const handleRowClick = (alert: Alert) => {
    setSelectedAlert(alert);
    setIsSheetOpen(true);
  };

  // Navigate to a specific page
  const goToPage = (page: number) => {
    router.push(`${pathname}?${createQueryString("page", page.toString())}`);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "-";
    try {
      // Parse the timestamptz from Supabase (already in UTC/ISO format)
      // and convert to Tokyo timezone for display
      const date = new Date(dateString);
      const tokyoDate = toZonedTime(date, 'Asia/Tokyo');
      
      return format(tokyoDate, "yyyy年MM月dd日 HH:mm:ss", {
        locale: ja,
      });
    } catch {
      return dateString;
    }
  };

  return (
    <>
      {/* Filters */}
      <Card className="mb-6">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>フィルター</CardTitle>
          <Button
            onClick={exportAlerts}
            disabled={isExporting || totalCount === 0}
            variant="outline"
            size="sm"
          >
            <Download className="h-4 w-4 mr-2" />
            {isExporting ? "エクスポート中..." : "データエクスポート"}
          </Button>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="dateFrom">開始日</Label>
              <Input
                id="dateFrom"
                type="datetime-local"
                value={dateFrom}
                onChange={(e) =>
                  updateFilters({ dateFrom: e.target.value, dateTo, ruleUid })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dateTo">終了日</Label>
              <Input
                id="dateTo"
                type="datetime-local"
                value={dateTo}
                onChange={(e) =>
                  updateFilters({ dateFrom, dateTo: e.target.value, ruleUid })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ruleUid">ルール</Label>
              <Select
                value={ruleUid}
                onValueChange={(value) =>
                  updateFilters({ dateFrom, dateTo, ruleUid: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="ルールを選択" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">すべてのルール</SelectItem>
                  {rules.map((rule) => (
                    <SelectItem key={rule.uid} value={rule.uid}>
                      {rule.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          {(dateFrom || dateTo || ruleUid) && (
            <div className="mt-4">
              <Button
                variant="outline"
                onClick={() =>
                  updateFilters({ dateFrom: "", dateTo: "", ruleUid: "" })
                }
              >
                フィルターをクリア
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Table>
        <TableCaption className="text-right">
          {totalCount > 0
            ? `${totalCount}件のアラート中 ${from + 1}～${to}件目を表示`
            : "アラートはありません"}
        </TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead>日時</TableHead>
            <TableHead>アラート名</TableHead>
            <TableHead>ユーザー名</TableHead>
            <TableHead>詳細</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <TableRow>
              <TableCell colSpan={4} className="text-center">
                読み込み中...
              </TableCell>
            </TableRow>
          ) : alerts.length === 0 ? (
            <TableRow>
              <TableCell colSpan={4} className="text-center">
                アラートはありません
              </TableCell>
            </TableRow>
          ) : (
            alerts.map((alert) => (
              <TableRow
                key={alert.uid}
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => handleRowClick(alert)}
              >
                <TableCell>{formatDate(alert.timestamp)}</TableCell>
                <TableCell>{alert.name.split("(")[0]}</TableCell>
                <TableCell>
                  {alert.users
                    ? `${alert.users.last_name || ""}`
                    : alert.user_uid}
                </TableCell>
                <TableCell>
                  {alert.details
                    ? JSON.stringify(alert.details).substring(0, 50) + "..."
                    : "-"}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="w-full flex items-center justify-center space-x-2 py-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => goToPage(Math.max(1, currentPage - 1))}
            disabled={currentPage <= 1}
          >
            <ChevronLeft className="h-4 w-4" />
            前へ
          </Button>
          <div className="flex items-center gap-1 mx-2">
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              // Show pages around current page
              let pageNum;
              if (totalPages <= 5) {
                pageNum = i + 1;
              } else if (currentPage <= 3) {
                pageNum = i + 1;
              } else if (currentPage >= totalPages - 2) {
                pageNum = totalPages - 4 + i;
              } else {
                pageNum = currentPage - 2 + i;
              }

              return (
                <Button
                  key={pageNum}
                  variant={currentPage === pageNum ? "default" : "outline"}
                  size="sm"
                  onClick={() => goToPage(pageNum)}
                  className="w-9"
                >
                  {pageNum}
                </Button>
              );
            })}

            {totalPages > 5 && currentPage < totalPages - 2 && (
              <>
                {currentPage < totalPages - 3 && (
                  <span className="mx-1">...</span>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => goToPage(totalPages)}
                  className="w-9"
                >
                  {totalPages}
                </Button>
              </>
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => goToPage(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage >= totalPages}
          >
            次へ
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent className="overflow-y-auto">
          {selectedAlert && (
            <>
              <SheetHeader>
                <SheetTitle>{selectedAlert.name.split("(")[0]}</SheetTitle>
                <SheetDescription>
                  {formatDate(selectedAlert.timestamp)}
                </SheetDescription>
              </SheetHeader>
              <div className="mt-6 space-y-4">
                <div className="grid gap-2">
                  <h3 className="text-sm font-medium">ユーザー</h3>
                  <p className="text-sm">
                    {selectedAlert.users
                      ? `${selectedAlert.users.last_name || ""} ${selectedAlert.users.first_name || ""}`
                      : selectedAlert.user_uid}
                  </p>
                </div>
              
                <AlertDetailsViewer alert={selectedAlert} />

                <div className="grid gap-2">
                  <h3 className="text-sm font-medium">その他の情報</h3>
                  <div className="rounded-md bg-muted p-4 text-sm">
                    <p>
                      <strong>アラートID:</strong> {selectedAlert.uid}
                    </p>
                    <p>
                      <strong>場所ID:</strong> {selectedAlert.location_uid}
                    </p>
                    {selectedAlert.company_uid && (
                      <p>
                        <strong>会社ID:</strong> {selectedAlert.company_uid}
                      </p>
                    )}
                    {selectedAlert.rule_uid && (
                      <p>
                        <strong>ルールID:</strong> {selectedAlert.rule_uid}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}
