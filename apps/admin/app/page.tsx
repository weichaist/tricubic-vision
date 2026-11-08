import { hasEnvVars } from "@/utils/supabase/check-env-vars";
import {
  ArrowRight,
  BarChart2,
  Users,
  Settings,
  TrendingUp,
  AlertTriangle,
  MapPin,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4 md:p-8">
      <div className="w-full max-w-4xl space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
            Tricubic Vision 管理ポータルへようこそ
          </h1>
          <p className="text-muted-foreground">
            フォークリフト運転記録の分析結果を確認し、安全管理を向上させましょう
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center">
                <BarChart2 className="h-5 w-5 mr-2 text-primary" />
                <CardTitle>ダッシュボード</CardTitle>
              </div>
              <CardDescription>分析結果の確認</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                各拠点のフォークリフト運転記録の分析結果、安全スコア、危険運転の検出などを確認できます。
              </p>
              <div className="mt-4 flex justify-between text-sm">
                <div className="flex items-center">
                  <TrendingUp className="h-4 w-4 mr-1 text-green-500" />
                  <span>安全スコア</span>
                </div>
                <div className="flex items-center">
                  <AlertTriangle className="h-4 w-4 mr-1 text-amber-500" />
                  <span>危険検知</span>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              {hasEnvVars ? (
                <Button asChild className="w-full">
                  <Link href="/dashboard">
                    ダッシュボードへ <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              ) : (
                <Button disabled className="w-full">
                  環境設定が必要です
                </Button>
              )}
            </CardFooter>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center">
                <Users className="h-5 w-5 mr-2 text-primary" />
                <CardTitle>アカウント管理</CardTitle>
              </div>
              <CardDescription>拠点・ユーザー管理</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                拠点の追加・編集、各拠点のユーザーアカウントの管理、権限設定などを行えます。
              </p>
              <div className="mt-4 flex justify-between text-sm">
                <div className="flex items-center">
                  <MapPin className="h-4 w-4 mr-1 text-blue-500" />
                  <span>拠点管理</span>
                </div>
                <div className="flex items-center">
                  <Users className="h-4 w-4 mr-1 text-indigo-500" />
                  <span>ユーザー管理</span>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              {hasEnvVars ? (
                <Button asChild variant="outline" className="w-full">
                  <Link href="/dashboard">
                    アカウント管理へ <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              ) : (
                <Button disabled variant="outline" className="w-full">
                  環境設定が必要です
                </Button>
              )}
            </CardFooter>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center">
                <Settings className="h-5 w-5 mr-2 text-primary" />
                <CardTitle>設定</CardTitle>
              </div>
              <CardDescription>通知・ルール設定</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                通知設定やTricubic
                Visionが安全性を判断するためのルール管理を行えます。
              </p>
              <div className="mt-4 flex justify-between text-sm">
                <div className="flex items-center">
                  <svg
                    className="h-4 w-4 mr-1 text-purple-500"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                  </svg>
                  <span>通知設定</span>
                </div>
                <div className="flex items-center">
                  <svg
                    className="h-4 w-4 mr-1 text-red-500"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  <span>ルール管理</span>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              {hasEnvVars ? (
                <Button asChild variant="outline" className="w-full">
                  <Link href="/dashboard">
                    設定へ <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              ) : (
                <Button disabled variant="outline" className="w-full">
                  環境設定が必要です
                </Button>
              )}
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
}
