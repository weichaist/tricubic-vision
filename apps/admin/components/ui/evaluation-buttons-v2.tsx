"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/utils/supabase/client";
import { Button } from "@/components/ui/button";
import { Database } from "@/database.types";
import toast from "react-hot-toast";

// Use the actual database types
type Evaluation = Database["public"]["Tables"]["evaluations"]["Row"];
type EvaluationInsert = Database["public"]["Tables"]["evaluations"]["Insert"];
type EvaluationUpdate = Database["public"]["Tables"]["evaluations"]["Update"];

interface EvaluationButtonsProps {
  itemType: "alert" | "applause";
  itemUid: string;
  locationUid: string;
  companyUid: string | null;
  size?: "sm" | "default" | "lg";
  variant?: "default" | "outline";
}

const evaluationConfig = {
  positive: { emoji: "⭕️", label: "良い", color: "bg-green-100 hover:bg-green-200 text-green-800" },
  neutral: { emoji: "🔼", label: "普通", color: "bg-yellow-100 hover:bg-yellow-200 text-yellow-800" },
  negative: { emoji: "❌", label: "悪い", color: "bg-red-100 hover:bg-red-200 text-red-800" },
} as const;

export function EvaluationButtons({
  itemType,
  itemUid,
  locationUid,
  companyUid,
  size = "sm",
  variant = "outline",
}: EvaluationButtonsProps) {
  const supabase = createClient();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Get current user
  const { data: user } = useQuery({
    queryKey: ["current-user"],
    queryFn: async () => {
      const { data, error } = await supabase.auth.getUser();
      if (error) throw error;
      return data.user;
    },
  });

  // Fetch current evaluation for this user and item
  const { data: currentEvaluation } = useQuery<Evaluation | null>({
    queryKey: ["evaluation", itemType, itemUid, user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      // Query based on item type using the appropriate column
      const column = itemType === "alert" ? "alert_uid" : "applause_uid";
      const { data, error } = await supabase
        .from("evaluations")
        .select("*")
        .eq(column, itemUid)
        .eq("evaluator_user_uid", user.id)
        .maybeSingle();

      if (error) {
        console.error("Error fetching evaluation:", error);
        return null;
      }
      return data;
    },
    enabled: !!user?.id,
  });

  // Mutation for creating/updating evaluation
  const evaluationMutation = useMutation({
    mutationFn: async (evaluationValue: "positive" | "neutral" | "negative") => {
      if (!user?.id) throw new Error("User not authenticated");

      if (currentEvaluation) {
        // Update existing evaluation
        const updateData: EvaluationUpdate = {
          evaluation_value: evaluationValue,
          updated_at: new Date().toISOString(),
        };

        const { data, error } = await supabase
          .from("evaluations")
          .update(updateData)
          .eq("uid", currentEvaluation.uid)
          .select()
          .single();

        if (error) throw error;
        return data;
      } else {
        // Create new evaluation
        const insertData: EvaluationInsert = {
          [itemType === "alert" ? "alert_uid" : "applause_uid"]: itemUid,
          evaluation_value: evaluationValue,
          evaluator_user_uid: user.id,
          location_uid: locationUid,
          company_uid: companyUid,
        };

        const { data, error } = await supabase
          .from("evaluations")
          .insert(insertData)
          .select()
          .single();

        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      // Invalidate and refetch evaluation query
      queryClient.invalidateQueries({
        queryKey: ["evaluation", itemType, itemUid, user?.id],
      });
      // Also invalidate counts
      queryClient.invalidateQueries({
        queryKey: ["evaluation-counts", itemType, itemUid],
      });
      
      const actionText = currentEvaluation ? "更新" : "保存";
      toast.success(`評価を${actionText}しました。`);
    },
    onError: (error) => {
      console.error("Error saving evaluation:", error);
      toast.error("評価の保存に失敗しました。");
    },
    onSettled: () => {
      setIsSubmitting(false);
    },
  });

  const handleEvaluation = async (value: "positive" | "neutral" | "negative") => {
    setIsSubmitting(true);
    evaluationMutation.mutate(value);
  };

  if (!user) {
    return null; // Don't show buttons if user is not authenticated
  }

  return (
    <div className="flex gap-1">
      {Object.entries(evaluationConfig).map(([value, config]) => {
        const isSelected = currentEvaluation?.evaluation_value === value;
        const isCurrentlySubmitting = isSubmitting && evaluationMutation.variables === value;
        
        return (
          <Button
            key={value}
            size={size}
            variant={variant}
            onClick={() => handleEvaluation(value as "positive" | "neutral" | "negative")}
            disabled={isSubmitting}
            className={`min-w-[2.5rem] ${
              isSelected ? config.color : ""
            } ${isCurrentlySubmitting ? "opacity-50" : ""}`}
            title={`${config.label}として評価`}
          >
            <span className="text-sm">{config.emoji}</span>
            {size !== "sm" && (
              <span className="ml-1 text-xs">{config.label}</span>
            )}
          </Button>
        );
      })}
    </div>
  );
}

// Hook for getting evaluation counts for an item
export function useEvaluationCounts(
  itemType: "alert" | "applause", 
  itemUid: string
) {
  const supabase = createClient();

  return useQuery({
    queryKey: ["evaluation-counts", itemType, itemUid],
    queryFn: async () => {
      // Query based on item type using the appropriate column
      const column = itemType === "alert" ? "alert_uid" : "applause_uid";
      const { data, error } = await supabase
        .from("evaluations")
        .select("evaluation_value")
        .eq(column, itemUid);

      if (error) {
        console.error("Error fetching evaluation counts:", error);
        return { positive: 0, neutral: 0, negative: 0, total: 0 };
      }

      const counts = data.reduce(
        (acc, evaluation) => {
          acc[evaluation.evaluation_value as keyof typeof acc]++;
          acc.total++;
          return acc;
        },
        { positive: 0, neutral: 0, negative: 0, total: 0 }
      );

      return counts;
    },
  });
}

// Component to display evaluation counts
export function EvaluationCounts({
  itemType,
  itemUid,
  showLabels = false,
}: {
  itemType: "alert" | "applause";
  itemUid: string;
  showLabels?: boolean;
}) {
  const { data: counts } = useEvaluationCounts(itemType, itemUid);

  if (!counts || counts.total === 0) {
    return null;
  }

  return (
    <div className="flex gap-1 text-xs text-muted-foreground">
      {counts.positive > 0 && (
        <span className="flex items-center gap-1">
          ⭕️ {counts.positive}
          {showLabels && <span>良い</span>}
        </span>
      )}
      {counts.neutral > 0 && (
        <span className="flex items-center gap-1">
          🔼 {counts.neutral}
          {showLabels && <span>普通</span>}
        </span>
      )}
      {counts.negative > 0 && (
        <span className="flex items-center gap-1">
          ❌ {counts.negative}
          {showLabels && <span>悪い</span>}
        </span>
      )}
    </div>
  );
} 