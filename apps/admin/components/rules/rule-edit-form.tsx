"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/utils/supabase/client";
import { Loader2, Shield } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import toast from "react-hot-toast";
import { Database } from "@/database.types";

type Rule = Database["public"]["Tables"]["rules"]["Row"];
type Location = Database["public"]["Tables"]["locations"]["Row"] & {
  companies?: {
    name: string;
  };
};

// Define form validation schema
const formSchema = z.object({
  name: z.string().min(1, { message: "ルール名は必須です" }),
  details: z.string().optional().nullable(),
  location_uid: z.string().nullable(),
  status: z.enum(["active", "inactive", ""]),
});

type FormValues = z.infer<typeof formSchema>;

interface RuleEditFormProps {
  rule: Rule;
  locations: Location[] | undefined;
  locationsLoading: boolean;
  ruleId: string;
  router: { push: (href: string) => void };
}

export function RuleEditForm({ 
  rule, 
  locations, 
  locationsLoading, 
  ruleId, 
  router 
}: RuleEditFormProps) {
  const supabase = createClient();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initialize React Hook Form with rule data
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: rule.name,
      details: rule.details || "",
      location_uid: rule.location_uid || null,
      status: (rule.status as "active" | "inactive") || "inactive",
    },
  });

  // Update rule mutation
  const updateRuleMutation = useMutation({
    mutationFn: async (
      updatedRule: Omit<Rule, "uid" | "created_at" | "updated_at"> & {
        uid: string;
      }
    ) => {
      const { data, error } = await supabase
        .from("rules")
        .update({
          name: updatedRule.name,
          details: updatedRule.details || null,
          location_uid: updatedRule.location_uid,
          status: updatedRule.status,
          updated_at: new Date().toISOString(),
        })
        .eq("uid", updatedRule.uid)
        .select("*")
        .single();

      if (error) {
        throw new Error(error.message);
      }

      return data;
    },
    onSuccess: (data) => {
      // Invalidate queries and redirect
      queryClient.invalidateQueries({ queryKey: ["rules"] });
      queryClient.invalidateQueries({ queryKey: ["rule", data.uid] });
      toast.success("ルールが更新されました");
      router.push("/dashboard/rules");
    },
    onError: (error) => {
      toast.error(`エラーが発生しました: ${error.message}`);
      setIsSubmitting(false);
    },
  });

  const onSubmit = form.handleSubmit((data) => {
    setIsSubmitting(true);

    // Submit the form
    updateRuleMutation.mutate({
      uid: ruleId,
      name: data.name,
      details: data.details || null,
      location_uid: data.location_uid,
      status: data.status,
      company_uid: rule?.company_uid || null,
    });
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          ルール編集
        </CardTitle>
        <CardDescription>ルール情報を編集してください。</CardDescription>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={onSubmit}>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>ルール名 *</FormLabel>
                  <FormControl>
                    <Input placeholder="ルール名を入力" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="location_uid"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>拠点 *</FormLabel>
                  <Select
                    disabled={locationsLoading}
                    onValueChange={(value) => {
                      field.onChange(value === "null" ? null : value);
                    }}
                    value={field.value || "null"}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="拠点を選択" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {locationsLoading ? (
                        <div className="flex items-center justify-center py-2">
                          <Loader2 className="h-4 w-4 animate-spin" />
                        </div>
                      ) : (
                        <>
                          <SelectItem value="null">
                            全社
                          </SelectItem>
                          {locations?.map((location) => (
                          <SelectItem
                            key={location.uid}
                            value={location.uid}
                          >
                            {location.name}
                          </SelectItem>
                          ))}
                        </>
                      )}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>ステータス</FormLabel>
                  <Select
                    onValueChange={(value) => {
                      field.onChange(value);
                    }}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="ステータスを選択" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="active">有効</SelectItem>
                      <SelectItem value="inactive">保留中</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="details"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>詳細</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="ルールの詳細を入力"
                      rows={4}
                      {...field}
                      value={field.value || ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button
              variant="outline"
              type="button"
              onClick={() => router.push("/dashboard/rules")}
              disabled={isSubmitting}
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
                "保存"
              )}
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
} 