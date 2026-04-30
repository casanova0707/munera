"use client";

import { useSearchParams } from "next/navigation";
import { GlassCard } from "@/components/ui/glass-card";
import { Button } from "@/components/ui/button";
import { Smartphone, Mail } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Suspense } from "react";

function LoginContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");

  const handleGoogleLogin = async () => {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  };

  const errorMessages: Record<string, string> = {
    no_code: "認証コードが取得できませんでした",
    auth_failed: "認証に失敗しました",
    no_account: "アカウントが登録されていません。管理者にお問い合わせください。",
  };

  return (
    <GlassCard className="w-full max-w-sm p-8 space-y-8">
      <div className="text-center">
        <h1 className="text-2xl font-bold tracking-tighter">MUNERA</h1>
        <p className="text-xs text-zinc-500 mt-2 tracking-widest uppercase">
          勤怠ポータル
        </p>
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
          <p className="text-xs text-red-400 text-center">
            {errorMessages[error] ?? "ログインに失敗しました"}
          </p>
        </div>
      )}

      <div className="space-y-4">
        <Button
          size="lg"
          onClick={handleGoogleLogin}
          className="gap-3 bg-white text-black hover:bg-zinc-200"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          Google でログイン
        </Button>

        <a href="/login/line">
          <Button
            size="lg"
            className="bg-[#06C755] text-white hover:bg-[#05b34d] gap-3 mt-4"
          >
            <Smartphone className="w-5 h-5" />
            LINE でログイン
          </Button>
        </a>

        <div className="relative py-2">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-zinc-800" />
          </div>
          <div className="relative flex justify-center">
            <span className="bg-black px-3 text-[10px] text-zinc-600">
              または
            </span>
          </div>
        </div>

        <a href="/login/admin">
          <Button size="lg" variant="outline" className="gap-3">
            <Mail className="w-5 h-5" />
            メールでログイン
          </Button>
        </a>
      </div>

      <p className="text-center text-[10px] text-zinc-500">
        Powered by Munera v1.0
      </p>
    </GlassCard>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginContent />
    </Suspense>
  );
}
