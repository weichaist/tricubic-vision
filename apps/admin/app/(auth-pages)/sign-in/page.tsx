import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ShieldIcon } from "lucide-react";
import { LoginForm } from "./login-form";

// Import the client component

export default function Login() {
  return (
    <div className="flex flex-col items-center justify-center">
      <div className="mb-6 flex flex-col items-center">
        <div className="mb-2 flex items-center justify-center rounded-full bg-primary/10 p-2">
          <ShieldIcon className="h-6 w-6 text-primary" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight">Tricubic Vision</h1>
        <p className="text-sm text-muted-foreground">管理ポータルへログイン</p>
      </div>

      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-center text-xl">ログイン</CardTitle>
          <CardDescription className="text-center">
            認証情報を入力してアクセスしてください
          </CardDescription>
        </CardHeader>
        <CardContent>
          <LoginForm />
        </CardContent>
        <CardFooter className="flex justify-center border-t p-4">
          <p className="text-xs text-muted-foreground">
            Tricubic Vision © {new Date().getFullYear()}
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
