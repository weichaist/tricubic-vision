"use client";

import { Shield, Bell, PartyPopper } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Database } from "@/database.types";
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/utils/supabase/client";

type Rule = Database["public"]["Tables"]["rules"]["Row"];

interface RuleCardProps {
  rule: Rule;
}

export function RuleCard({ rule }: RuleCardProps) {
  const supabase = createClient();

  // Fetch alerts count for this rule
  const { data: alertsCount = 0 } = useQuery({
    queryKey: ["alerts-count", rule.uid],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("alerts")
        .select("*", { count: "exact", head: true })
        .eq("rule_uid", rule.uid);

      if (error) {
        console.error("Error fetching alerts count:", error);
        return 0;
      }

      return count || 0;
    },
  });

  // Fetch applause count for this rule
  const { data: applauseCount = 0 } = useQuery({
    queryKey: ["applause-count", rule.uid],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("applause")
        .select("*", { count: "exact", head: true })
        .eq("rule_uid", rule.uid);

      if (error) {
        console.error("Error fetching applause count:", error);
        return 0;
      }

      return count || 0;
    },
  });

  // Determine badge color based on status
  const getBadgeVariant = (status: string) => {
    switch (status.toLowerCase()) {
      case "active":
        return "default";
      case "pending":
        return "secondary";
      case "disabled":
        return "outline";
      default:
        return "default";
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

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-md font-medium truncate">
          {rule.name}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-2">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center">
            <Shield className="h-4 w-4 text-muted-foreground mr-1" />
            <Badge variant={getBadgeVariant(rule.status)}>
              {getStatusText(rule.status)}
            </Badge>
          </div>
        </div>

        <div className="grid grid-cols-2 divide-x">
          <div className="flex flex-col items-center justify-center p-3">
            <Bell className="h-6 w-6 text-muted-foreground mb-1.5" />
            <div className="text-xl font-bold">{alertsCount}</div>
            <p className="text-xs text-muted-foreground mt-1">アラート</p>
          </div>
          <div className="flex flex-col items-center justify-center p-3">
            <PartyPopper className="h-6 w-6 text-muted-foreground mb-1.5" />
            <div className="text-xl font-bold">{applauseCount}</div>
            <p className="text-xs text-muted-foreground mt-1">ブラボー</p>
          </div>
        </div>

        {rule.details && (
          <p className="text-sm mt-2 line-clamp-2 text-muted-foreground">
            {rule.details}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
