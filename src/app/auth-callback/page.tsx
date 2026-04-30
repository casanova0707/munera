"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { LoadingSpinner } from "@/components/shared/loading-spinner";
import { Suspense } from "react";

function AuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [debug, setDebug] = useState("starting...");

  useEffect(() => {
    async function handleAuth() {
      const code = searchParams.get("code");
      setDebug(`code: ${code ? code.substring(0, 10) + "..." : "(none)"}`);

      if (!code) {
        router.replace("/login?error=no_code");
        return;
      }

      // Use the auth client that stores code_verifier in localStorage
      const supabase = createClient();

      const { error } = await supabase.auth.exchangeCodeForSession(code);

      if (error) {
        router.replace(`/login?error=auth_failed&detail=${encodeURIComponent(error.message)}`);
        return;
      }

      // Get user and role
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.replace("/login?error=auth_failed&detail=no_user");
        return;
      }

      const { data: coreUser } = await supabase
        .from("core_users")
        .select("id, role")
        .eq("supabase_auth_id", user.id)
        .single();

      if (coreUser) {
        const dest = coreUser.role === "admin" || coreUser.role === "sv"
          ? "/admin/dashboard"
          : "/staff/dashboard";
        router.replace(dest);
      } else {
        router.replace("/login?error=no_account");
      }
    }

    handleAuth();
  }, [router, searchParams]);

  return (
    <div className="min-h-dvh flex items-center justify-center bg-black">
      <div className="text-center">
        <LoadingSpinner />
        <p className="text-sm text-zinc-500 mt-4">認証中...</p>
        <p className="text-xs text-zinc-700 mt-2 font-mono">{debug}</p>
      </div>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <AuthCallbackContent />
    </Suspense>
  );
}
