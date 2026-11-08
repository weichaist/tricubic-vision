"use client";

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/utils/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, ShieldCheck, Plus } from "lucide-react";
import { RuleCard } from "./rule-card";
import { Database } from "@/database.types";
import Link from "next/link";

type Rule = Database["public"]["Tables"]["rules"]["Row"] & {
  locations?: {
    name: string;
  };
};

export function RulesSection() {
  const supabase = createClient();

  const { data: rules, isLoading } = useQuery({
    queryKey: ["dashboard-rules"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rules")
        .select("*")
        .order("status", { ascending: true })
        .limit(50);

      if (error) {
        throw new Error(error.message);
      }

      return data as Rule[];
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <ShieldCheck className="h-5 w-5 mr-2" />
          <h2 className="text-xl font-semibold">ルール</h2>
        </div>
        <Button asChild size="sm">
          <Link href="/dashboard/rules/add">
            <Plus className="h-4 w-4 mr-1" />
            <span>ルールを追加</span>
          </Link>
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : rules && rules.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {rules.map((rule) => (
            <RuleCard key={rule.uid} rule={rule} />
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-8">
            <ShieldCheck className="h-8 w-8 text-muted-foreground mb-2" />
            <p className="text-muted-foreground">ルールがありません</p>
            <Button asChild className="mt-4" variant="outline">
              <Link href="/dashboard/rules/add">
                <Plus className="h-4 w-4 mr-1" />
                <span>ルールを追加</span>
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
