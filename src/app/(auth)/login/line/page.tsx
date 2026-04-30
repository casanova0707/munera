"use client";

import { useEffect } from "react";
import { Loader2 } from "lucide-react";

export default function LineLoginRedirect() {
  useEffect(() => {
    // Redirect to LINE OAuth via our API route
    window.location.href = "/api/auth/line";
  }, []);

  return (
    <div className="flex flex-col items-center gap-4">
      <Loader2 className="w-8 h-8 animate-spin text-[#06C755]" />
      <p className="text-sm text-zinc-400">LINE ログインへ移動中...</p>
    </div>
  );
}
