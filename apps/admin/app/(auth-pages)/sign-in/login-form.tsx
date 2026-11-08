"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LockIcon, MailIcon } from "lucide-react";
import { useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

export function LoginForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const router = useRouter();

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      toast.error("メールアドレスとパスワードを入力してください");
      return;
    }
    
    try {
      setIsLoading(true);
      const supabase = createClient();
      
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) {
        toast.error(error.message || "ログインに失敗しました");
        return;
      }
      
      toast.success("ログインに成功しました");
      router.push("/dashboard");
      router.refresh();
    } catch (error) {
      toast.error("ログイン中にエラーが発生しました");
      console.error("Sign in error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form className="space-y-4" onSubmit={handleSignIn}>
      <div className="space-y-2">
        <Label htmlFor="email" className="text-sm font-medium">
          メールアドレス
        </Label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-muted-foreground">
            <MailIcon className="h-5 w-5" />
          </div>
          <Input
            id="email"
            type="email"
            placeholder="メールアドレスを入力"
            className="pl-10"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={isLoading}
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="password" className="text-sm font-medium">
          パスワード
        </Label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-muted-foreground">
            <LockIcon className="h-5 w-5" />
          </div>
          <Input
            id="password"
            type="password"
            placeholder="パスワードを入力"
            className="pl-10"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={isLoading}
          />
        </div>
      </div>

      <Button 
        className="w-full mt-2" 
        type="submit" 
        disabled={isLoading}
      >
        {isLoading ? "ログイン中..." : "ログイン"}
      </Button>
    </form>
  );
}
