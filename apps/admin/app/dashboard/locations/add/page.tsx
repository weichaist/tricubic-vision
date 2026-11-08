"use client";

import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MapPin, Loader2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import toast from "react-hot-toast";

type Company = {
  uid: string;
  name: string;
};

type SupabaseError = {
  message: string;
};

// Export the main component directly since providers are at root level
export default function AddLocationPage() {
  const router = useRouter();
  const supabase = createClient();
  const [formData, setFormData] = useState({
    name: "",
    address: "",
    company_uid: "",
  });

  // We rely on server-side authentication checks in dashboard layout

  // Fetch companies for dropdown
  const { data: companies, isLoading: companiesLoading } = useQuery({
    queryKey: ["companies"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('companies')
        .select('uid, name');
      
      if (error) {
        toast.error("会社データの取得に失敗しました");
        return [];
      }
      
      return data;
    },
    // No need for conditional fetching based on auth
  });

  // Create location mutation
  const mutation = useMutation({
    mutationFn: async (locationData: typeof formData) => {
      const { data, error } = await supabase
        .from('locations')
        .insert([locationData])
        .select();
        
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("拠点が追加されました");
      router.push('/dashboard/locations');
    },
    onError: (error: SupabaseError) => {
      toast.error(`拠点の追加に失敗しました: ${error.message}`);
    },
  });

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate(formData);
  };

  // Handle form input changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Show loading state for companies
  if (companiesLoading) {
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
                <BreadcrumbLink href="/dashboard">ダッシュボード</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator className="hidden md:block" />
              <BreadcrumbItem className="hidden md:block">
                <BreadcrumbLink href="/dashboard/locations">拠点管理</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator className="hidden md:block" />
              <BreadcrumbItem>
                <BreadcrumbPage>拠点追加</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </header>
      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              拠点追加
            </CardTitle>
            <CardDescription>新しい拠点情報を入力してください。</CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">拠点名</Label>
                <Input 
                  id="name" 
                  name="name" 
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="拠点名を入力" 
                  required 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">住所</Label>
                <Input 
                  id="address" 
                  name="address" 
                  value={formData.address}
                  onChange={handleChange}
                  placeholder="住所を入力" 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="company_uid">会社</Label>
                <Select
                  disabled={companiesLoading}
                  value={formData.company_uid}
                  onValueChange={(value) => {
                    setFormData(prev => ({
                      ...prev,
                      company_uid: value
                    }));
                  }}
                >
                  <SelectTrigger id="company_uid" className="w-full">
                    <SelectValue placeholder="会社を選択" />
                  </SelectTrigger>
                  <SelectContent>
                    {companiesLoading ? (
                      <div className="flex items-center justify-center py-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                      </div>
                    ) : (
                      companies?.map((company: Company) => (
                        <SelectItem key={company.uid} value={company.uid}>
                          {company.name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                {/* Hidden input to maintain form validation */}
                <input 
                  type="hidden" 
                  name="company_uid" 
                  value={formData.company_uid} 
                  required 
                />
              </div>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button 
                variant="outline" 
                type="button" 
                onClick={() => router.back()}
                disabled={mutation.isPending}
              >
                キャンセル
              </Button>
              <Button 
                type="submit" 
                disabled={mutation.isPending}
              >
                {mutation.isPending ? (
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
        </Card>
      </div>
    </>
  );
}
