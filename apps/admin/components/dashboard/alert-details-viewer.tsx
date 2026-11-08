"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";
import { Button } from "@/components/ui/button";

import { ExternalLink } from "lucide-react";
import { Database } from "@/database.types";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import { toZonedTime } from "date-fns-tz";
import { EvaluationButtons, EvaluationCounts } from "@/components/ui/evaluation-buttons-v2";

type Alert = Database["public"]["Tables"]["alerts"]["Row"];
type Clip = Database["public"]["Tables"]["clips"]["Row"];

interface AlertDetailsViewerProps {
  alert: Alert;
}

interface MotionDetails {
  x?: string;
  y?: string;
  z?: string;
  magnitude?: string;
  threshold?: string;
  timestamp?: string;
  motion_type?: string;
  videoUrl?: string;
  [key: string]: unknown;
}

export function AlertDetailsViewer({ alert }: AlertDetailsViewerProps) {
  const supabase = createClient();
  const [relatedClips, setRelatedClips] = useState<Clip[]>([]);
  const [isLoadingClips, setIsLoadingClips] = useState(false);

  // Parse alert details
  const details = alert.details as MotionDetails | null;
  const hasMotionData = details && details.timestamp && details.motion_type;

  // Fetch related clips when we have motion data with timestamp
  useEffect(() => {
    if (!hasMotionData || !details?.timestamp) return;

    const fetchRelatedClips = async () => {
      setIsLoadingClips(true);
      try {
        // Parse the motion timestamp (already in UTC)
        const motionTimestamp = new Date(alert.timestamp!);
        
        // Look for clips that end within 10 minutes before to 10 minutes after the motion event
        const searchStartTime = new Date(motionTimestamp.getTime() - 10 * 60 * 1000); // 10 minutes before
        const searchEndTime = new Date(motionTimestamp.getTime() + 10 * 60 * 1000); // 10 minutes after

        const { data, error } = await supabase
          .from("clips")
          .select("*")
          .eq("location_uid", alert.location_uid)
          .gte("recording_stop_timestamp", searchStartTime.toISOString())
          .lte("recording_stop_timestamp", searchEndTime.toISOString())
          .order("recording_stop_timestamp", { ascending: true })
          .limit(5); // Limit to 5 most relevant clips

        if (error) {
          console.error("Error fetching related clips:", error);
          return;
        }

        setRelatedClips(data || []);
      } catch (error) {
        console.error("Error processing timestamp:", error);
      } finally {
        setIsLoadingClips(false);
      }
    };

    fetchRelatedClips();
  }, [alert.location_uid, alert.timestamp, details?.timestamp, hasMotionData, supabase]);

  const formatMotionValue = (value: string | undefined, unit: string = "") => {
    if (!value) return "-";
    const num = parseFloat(value);
    return isNaN(num) ? value : `${num.toFixed(2)}${unit}`;
  };

  const formatTimestamp = (timestamp: string | undefined) => {
    if (!timestamp) return "-";
    try {
      // Parse the timestamptz from Supabase (already in UTC/ISO format)
      // and convert to Tokyo timezone for display
      const date = new Date(timestamp);
      const tokyoDate = toZonedTime(date, 'Asia/Tokyo');
      
      return format(tokyoDate, "yyyy年MM月dd日 HH:mm:ss", {
        locale: ja,
      });
    } catch {
      return timestamp;
    }
  };

  const getMotionTypeLabel = (motionType: string | undefined) => {
    const labels: Record<string, string> = {
      sudden_stop: "急停止",
      sudden_acceleration: "急加速",
      sharp_turn: "急カーブ",
      collision: "衝突",
      vibration: "振動",
    };
    return labels[motionType || ""] || motionType || "-";
  };

  return (
    <div className="space-y-4">
     

      {/* Motion Data Section */}
      {hasMotionData && (
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-blue-600">モーション検知データ</h4>
          
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="font-medium">種類:</span>
              <span className="ml-2 px-2 py-1 bg-orange-100 text-orange-800 rounded text-xs">
                {getMotionTypeLabel(details?.motion_type)}
              </span>
            </div>
            <div>
              <span className="font-medium">検知時刻:</span>
              <span className="ml-2">{formatTimestamp(details?.timestamp)}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="font-medium">加速度 (G):</span>
              <div className="ml-2 space-y-1">
                <div>X: {formatMotionValue(details?.x, "G")}</div>
                <div>Y: {formatMotionValue(details?.y, "G")}</div>
                <div>Z: {formatMotionValue(details?.z, "G")}</div>
              </div>
            </div>
            <div>
              <span className="font-medium">強度:</span>
              <div className="ml-2 space-y-1">
                <div>合成値: {formatMotionValue(details?.magnitude, "G")}</div>
                <div>閾値: {formatMotionValue(details?.threshold, "G")}</div>
                <div className={`font-medium ${
                  details?.magnitude && details?.threshold && 
                  parseFloat(details.magnitude) > parseFloat(details.threshold)
                    ? "text-red-600" 
                    : "text-green-600"
                }`}>
                  {details?.magnitude && details?.threshold && 
                   parseFloat(details.magnitude) > parseFloat(details.threshold)
                    ? "閾値超過" 
                    : "閾値内"}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Related Clips Section */}
      {hasMotionData && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium text-green-600">関連動画</h4>
            {isLoadingClips && (
              <div className="text-xs text-muted-foreground">検索中...</div>
            )}
          </div>
          
          {relatedClips.length > 0 ? (
            <div className="space-y-2">
              {relatedClips.map((clip) => (
                <div key={clip.uid} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <div className="text-sm">
                    <div className="font-medium">
                      {formatTimestamp(clip.recording_stop_timestamp || undefined)}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {clip.video_url && (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => window.open(clip.video_url!, "_blank")}
                        >
                          <ExternalLink className="h-3 w-3 mr-1" />
                          開く
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : !isLoadingClips && hasMotionData ? (
            <div className="text-sm text-muted-foreground p-2 bg-gray-50 rounded">
              関連するクリップが見つかりませんでした
            </div>
          ) : null}
        </div>
      )}

      {/* Video URL from details (if exists) */}
      {details?.videoUrl && (
        <div className="space-y-3">
          <h4 className="text-sm font-medium">動画</h4>
          <video
            src={details.videoUrl}
            controls
            className="w-full rounded-md"
            style={{ maxHeight: "300px" }}
          />
        </div>
      )}

      {/* Raw Details Section */}
      <div className="space-y-3">
        <h4 className="text-sm font-medium">詳細情報 (Raw)</h4>
        <div className="rounded-md bg-muted p-4 text-sm">
          {alert.details ? (
            <div className="space-y-2">
              {Object.entries(alert.details).map(([key, value]) => (
                <div key={key} className="break-words">
                  <span className="font-medium">{key}: </span>
                  <span className="whitespace-pre-wrap">
                    {key === "videoUrl" ? (
                      <button
                        className="text-blue-500 hover:underline"
                        onClick={() => window.open(String(value), "_blank")}
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
              ))}
            </div>
          ) : (
            <p>詳細情報はありません</p>
          )}
        </div>
      </div>
       {/* Evaluation Section */}
       <div className="flex flex-col items-center justify-between p-3 bg-gray-50 rounded-lg border">
        <div>
          <h4 className="text-sm font-medium text-gray-900 mb-1">このアラートを評価してください</h4>
          <p className="text-xs text-gray-600">品質向上のためにアラートの評価をお願いします</p>
        </div>
        <div className="flex items-center justify-between gap-3 mt-3">
          <EvaluationCounts itemType="alert" itemUid={alert.uid} />
          <EvaluationButtons
            itemType="alert"
            itemUid={alert.uid}
            locationUid={alert.location_uid}
            companyUid={alert.company_uid}
          />
        </div>
      </div>
    </div>
    
  );
} 