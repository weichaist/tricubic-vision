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
import { ChevronLeft, ChevronRight, Download, Play } from "lucide-react";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { debugClipAnalysis } from "@/utils/firebase/functions";
import toast from "react-hot-toast";

// Use the database schema type with joined users table
interface Log extends Tables<"logs"> {
  users?: {
    first_name: string | null;
    last_name: string | null;
  } | null;
  locations?: {
    company_uid: string;
  } | null;
}

interface LocationLogsTableProps {
  locationId: string;
  itemsPerPage?: number;
}

export function LocationLogsTable({
  locationId,
  itemsPerPage = 100,
}: LocationLogsTableProps) {
  const supabase = createClient();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [selectedLog, setSelectedLog] = useState<Log | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isDebugging, setIsDebugging] = useState(false);
  const [debugResult, setDebugResult] = useState<{
    rulesCount: number;
    durationMs: number;
    response: string;
  } | null>(null);
  const [isDebugDialogOpen, setIsDebugDialogOpen] = useState(false);

  // Get current page from URL or default to 1
  const currentPage = parseInt(searchParams.get("page") || "1", 10);

  // Get filter values from URL
  const dateFrom = searchParams.get("dateFrom") || "";
  const dateTo = searchParams.get("dateTo") || "";
  const status = searchParams.get("status") || "";
  const logUid = searchParams.get("logUid") || "";

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

  // Navigate to a specific page
  const goToPage = (page: number) => {
    router.push(`${pathname}?${createQueryString("page", page.toString())}`);
  };

  // Function to handle row click
  const handleRowClick = (log: Log) => {
    setSelectedLog(log);
    setIsSheetOpen(true);
  };

  // Fetch total count of logs for pagination
  const { data: countData } = useQuery({
    queryKey: ["location-logs-count", locationId, dateFrom, dateTo, status, logUid],
    queryFn: async () => {
      let query = supabase
        .from("logs")
        .select("*", { count: "exact", head: true })
        .eq("location_uid", locationId);

      // Apply date filters (using created_at for logs)
      if (dateFrom) {
        query = query.gte("created_at", dateFrom);
      }
      if (dateTo) {
        query = query.lte("created_at", dateTo);
      }

      // Apply status filter
      if (status && status !== "all") {
        query = query.eq("status", status);
      }

      // Apply log uid filter
      if (logUid) {
        query = query.eq("uid", logUid);
      }

      const { count, error } = await query;

      if (error) {
        console.error("Error fetching logs count:", error);
        return 0;
      }

      return count || 0;
    },
    refetchInterval: 60000, // Refetch every minute
  });

  const totalCount = countData ?? 0;

  // Calculate pagination values
  const totalPages = Math.ceil(totalCount / itemsPerPage);
  const from = (currentPage - 1) * itemsPerPage;
  const to = Math.min(from + itemsPerPage, totalCount);

  // Fetch logs with pagination
  const { data: logs = [], isLoading } = useQuery<Log[]>({
    queryKey: [
      "location-logs",
      locationId,
      currentPage,
      itemsPerPage,
      dateFrom,
      dateTo,
      status,
      logUid,
    ],
    queryFn: async () => {
      let query = supabase
        .from("logs")
        .select("*, users(first_name, last_name), locations(company_uid)")
        .eq("location_uid", locationId)
        .order("created_at", { ascending: false });

      // Apply date filters (using created_at for logs)
      if (dateFrom) {
        query = query.gte("created_at", dateFrom);
      }
      if (dateTo) {
        query = query.lte("created_at", dateTo);
      }

      // Apply status filter
      if (status && status !== "all") {
        query = query.eq("status", status);
      }

      // Apply log uid filter
      if (logUid) {
        query = query.eq("uid", logUid);
      }

      const { data, error } = await query.range(from, from + itemsPerPage - 1);

      if (error) {
        console.error("Error fetching logs:", error);
        return [];
      }

      return data || [];
    },
    refetchInterval: 60000, // Refetch every minute
  });

  // Get unique statuses for the filter dropdown
  const statusOptions = ["success", "error"];

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

  // Debug clip analysis function
  const handleDebugClip = async (videoUrl: string, companyUid: string) => {
    setIsDebugging(true);
    
    try {
      const result = await debugClipAnalysis({
        videoUrl: videoUrl,
        locationUid: null,
        companyUid: companyUid,
      });

      const debugResult = result;

      if (debugResult && debugResult.success === true) {
        // Show success toast with basic info
        toast.success(`デバッグ完了: ${((debugResult.durationMs || 0) / 1000).toFixed(2)}s`);
        
        // Set debug result and open dialog
        setDebugResult({
          rulesCount: debugResult.rulesCount || 0,
          durationMs: debugResult.durationMs || 0,
          response: debugResult.response || 'No response'
        });
        setIsDebugDialogOpen(true);
      } else {
        const errorMessage = debugResult?.error || 'Unknown error occurred';
        toast.error(`デバッグ実行に失敗しました: ${errorMessage}`);
      }
    } catch (err) {
      // More specific error handling
      const error = err as { code?: string; message?: string };
      if (error.code === 'functions/deadline-exceeded') {
        toast.error('処理がタイムアウトしました。動画が大きすぎるか、処理に時間がかかりすぎています。');
      } else if (error.code === 'functions/internal') {
        toast.error('Cloud Function内部エラーが発生しました。関数のログを確認してください。');
      } else if (error.code === 'functions/not-found') {
        toast.error('指定されたCloud Functionが見つかりません。');
      } else if (error.code === 'functions/unauthenticated') {
        toast.error('認証が必要です。ログインしてください。');
      } else if (error.code === 'functions/permission-denied') {
        toast.error('この操作を実行する権限がありません。');
      } else {
        toast.error(`再解析の呼び出しに失敗しました: ${error.message}`);
      }
    } finally {
      setIsDebugging(false);
    }
  };

  // Export function to download all logs as CSV
  const exportLogs = async () => {
    setIsExporting(true);
    try {
      let query = supabase
        .from("logs")
        .select("*, users(first_name, last_name), locations(company_uid)")
        .eq("location_uid", locationId)
        .order("created_at", { ascending: false });

      // Apply same filters as the table
      if (dateFrom) {
        query = query.gte("created_at", dateFrom);
      }
      if (dateTo) {
        query = query.lte("created_at", dateTo);
      }
      if (status && status !== "all") {
        query = query.eq("status", status);
      }

      const { data, error } = await query;

      if (error) {
        console.error("Error fetching logs for export:", error);
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
        "機能名",
        "ユーザー名",
        "メッセージ",
        "詳細",
        "ステータス",
        "実行時間(ms)",
        "ログID",
        "場所ID",
        "ユーザーID",
        "クリップID",
      ];

      const csvContent = [
        headers.join(","),
        ...data.map((log) =>
          [
            log.created_at ? `"${formatDate(log.created_at)}"` : "",
            `"${log.function_name || ""}"`,
            log.users
              ? `"${log.users.first_name || ""} ${log.users.last_name || ""}"`.trim()
              : `"${log.user_uid || ""}"`,
            `"${(log.message || "").replace(/"/g, '""')}"`,
            log.details
              ? `"${JSON.stringify(log.details).replace(/"/g, '""')}"`
              : "",
            `"${log.status || ""}"`,
            `"${log.duration_ms || ""}"`,
            `"${log.uid}"`,
            `"${log.location_uid || ""}"`,
            `"${log.user_uid || ""}"`,
            `"${log.clip_id || ""}"`,
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
      link.setAttribute("download", `logs_export_${dateStr}.csv`);

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

  return (
    <>
      {/* Filters */}
      <Card className="mb-6">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>フィルター</CardTitle>
          <Button
            onClick={exportLogs}
            disabled={isExporting || totalCount === 0}
            variant="outline"
            size="sm"
          >
            <Download className="h-4 w-4 mr-2" />
            {isExporting ? "エクスポート中..." : "データエクスポート"}
          </Button>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="dateFrom">開始日</Label>
              <Input
                id="dateFrom"
                type="datetime-local"
                value={dateFrom}
                onChange={(e) =>
                  updateFilters({ dateFrom: e.target.value, dateTo, status, logUid })
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
                  updateFilters({ dateFrom, dateTo: e.target.value, status, logUid })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">ステータス</Label>
              <Select
                value={status}
                onValueChange={(value) =>
                  updateFilters({ dateFrom, dateTo, status: value, logUid })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="ステータスを選択" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">すべてのステータス</SelectItem>
                  {statusOptions.map((statusOption) => (
                    <SelectItem key={statusOption} value={statusOption}>
                      {statusOption}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="logUid">ログUID</Label>
              <Input
                id="logUid"
                type="text"
                placeholder="ログUIDで検索"
                value={logUid}
                onChange={(e) =>
                  updateFilters({ dateFrom, dateTo, status, logUid: e.target.value })
                }
              />
            </div>
          </div>
          {(dateFrom || dateTo || status || logUid) && (
            <div className="mt-4">
              <Button
                variant="outline"
                onClick={() =>
                  updateFilters({ dateFrom: "", dateTo: "", status: "", logUid: "" })
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
            ? `${totalCount}件のログ中 ${from + 1}～${to}件目を表示`
            : "ログはありません"}
        </TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead>日時</TableHead>
            <TableHead>機能名</TableHead>
            <TableHead>ユーザー名</TableHead>
            <TableHead>詳細</TableHead>
            <TableHead>ステータス</TableHead>
            <TableHead>実行時間(ms)</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center">
                読み込み中...
              </TableCell>
            </TableRow>
          ) : logs.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center">
                ログはありません
              </TableCell>
            </TableRow>
          ) : (
            logs.map((log) => (
              <TableRow
                key={log.uid}
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => handleRowClick(log)}
              >
                <TableCell>{formatDate(log.created_at)}</TableCell>
                <TableCell>{log.function_name}</TableCell>
                <TableCell>
                  {log.users
                    ? `${log.users.first_name || ""} ${log.users.last_name || ""}`.trim()
                    : log.user_uid || "-"}
                </TableCell>
                <TableCell>
                  {log.details &&
                  typeof log.details === "object" &&
                  "response" in log.details
                    ? JSON.stringify(log.details.response).substring(0, 100) +
                      (JSON.stringify(log.details.response).length > 100
                        ? "..."
                        : "")
                    : "-"}
                </TableCell>
                <TableCell>{log.status}</TableCell>
                <TableCell>{log.duration_ms || "-"}</TableCell>
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
          {selectedLog && (
            <>
              <SheetHeader>
                <SheetTitle>{selectedLog.function_name}</SheetTitle>
                <SheetDescription>
                  {formatDate(selectedLog.created_at)}
                </SheetDescription>
              </SheetHeader>
              <div className="mt-6 space-y-4">
                <div className="grid gap-2">
                  <h3 className="text-sm font-medium">ユーザー</h3>
                  <p className="text-sm">
                    {selectedLog.users
                      ? `${selectedLog.users.first_name || ""} ${selectedLog.users.last_name || ""}`
                      : selectedLog.user_uid || "-"}
                  </p>
                </div>

                <div className="grid gap-2">
                  <h3 className="text-sm font-medium">メッセージ</h3>
                  <p className="text-sm rounded-md bg-muted p-4">
                    {selectedLog.message || "-"}
                  </p>
                </div>

                <div className="grid gap-2">
                  <h3 className="text-sm font-medium">詳細情報</h3>

                  {/* Video player for logs with video URLs */}
                  {typeof selectedLog.details === "object" &&
                    selectedLog.details !== null &&
                    "videoUrl" in selectedLog.details && (
                      <div className="mb-4">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="text-sm font-medium">動画</h4>
                          <Button
                            onClick={() => {
                              if (selectedLog.details && 
                                  typeof selectedLog.details === "object" && 
                                  "videoUrl" in selectedLog.details) {
                                handleDebugClip(String(selectedLog.details.videoUrl), selectedLog.locations?.company_uid || "");
                              }
                            }}
                            disabled={isDebugging}
                            size="sm"
                            variant="outline"
                          >
                            {isDebugging ? (
                              <>
                                <div className="mr-2 h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
                                再解析中...
                              </>
                            ) : (
                              <>
                                <Play className="mr-2 h-3 w-3" />
                                再解析実行
                              </>
                            )}
                          </Button>
                        </div>
                        <video
                          src={String(selectedLog.details.videoUrl)}
                          controls
                          className="w-full rounded-md"
                          style={{ maxHeight: "300px" }}
                        />
                      </div>
                    )}

                  <div className="rounded-md bg-muted p-4 text-sm">
                    {selectedLog.details ? (
                      <div className="space-y-2">
                        {Object.entries(selectedLog.details).map(
                          ([key, value]) => (
                            <div key={key} className="break-words">
                              <span className="font-medium">{key}: </span>
                              <span className="whitespace-pre-wrap">
                                {key === "videoUrl" ? (
                                  <button
                                    className="text-blue-500 hover:underline"
                                    onClick={() =>
                                      window.open(String(value), "_blank")
                                    }
                                  >
                                    動画を別ウィンドウで開く
                                  </button>
                                ) : typeof value === "object" ? (
                                  JSON.stringify(value, null, 2)
                                ) : (
                                  String(value)
                                )}
                              </span>
                            </div>
                          )
                        )}
                      </div>
                    ) : (
                      <p>詳細情報はありません</p>
                    )}
                  </div>
                </div>

                <div className="grid gap-2">
                  <h3 className="text-sm font-medium">その他の情報</h3>
                  <div className="rounded-md bg-muted p-4 text-sm">
                    <p>
                      <strong>ログID:</strong> {selectedLog.uid}
                    </p>
                    <p>
                      <strong>場所ID:</strong> {selectedLog.location_uid || "-"}
                    </p>
                    <p>
                      <strong>ステータス:</strong> {selectedLog.status}
                    </p>
                    <p>
                      <strong>実行時間:</strong>{" "}
                      {selectedLog.duration_ms || "-"}ms
                    </p>
                    {selectedLog.clip_id && (
                      <p>
                        <strong>クリップID:</strong> {selectedLog.clip_id}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Debug Result Dialog */}
      <Dialog open={isDebugDialogOpen} onOpenChange={setIsDebugDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>デバッグ結果</DialogTitle>
            <DialogDescription>
              クリップ解析のデバッグ実行結果
            </DialogDescription>
          </DialogHeader>
          
          {debugResult && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="text-sm font-medium">ルール数</div>
                  <div className="text-2xl font-bold text-blue-600">
                    {debugResult.rulesCount}
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="text-sm font-medium">実行時間</div>
                  <div className="text-2xl font-bold text-green-600">
                    {(debugResult.durationMs / 1000).toFixed(1)}s
                  </div>
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="text-sm font-medium">応答</div>
                <div className="max-h-64 overflow-y-auto rounded-md border bg-muted p-4">
                  <pre className="whitespace-pre-wrap text-sm">
                    {debugResult.response || 'No response'}
                  </pre>
                </div>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button onClick={() => setIsDebugDialogOpen(false)}>
              閉じる
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
