"use client";

import { useEffect, useState } from "react";
import { GlassCard } from "@/components/ui/glass-card";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/shared/loading-spinner";
import { LogOut, User } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

interface UserProfile {
  full_name: string;
  email: string | null;
  department: string | null;
  position: string | null;
  employee_code: string | null;
  avatar_url: string | null;
  role: string;
}

export default function StaffProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setIsLoading(false); return; }

      const { data } = await supabase
        .from("core_users")
        .select("full_name, email, department, position, employee_code, avatar_url, role")
        .eq("supabase_auth_id", user.id)
        .single();

      setProfile(data as UserProfile | null);
      setIsLoading(false);
    }
    load();
  }, []);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  };

  if (isLoading) return <LoadingSpinner />;

  return (
    <>
      <h2 className="text-2xl font-light mb-8">プロフィール</h2>

      <div className="flex flex-col items-center mb-8">
        <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-zinc-700 to-zinc-400 flex items-center justify-center mb-4 overflow-hidden">
          {profile?.avatar_url ? (
            <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
          ) : (
            <User className="w-8 h-8 text-zinc-300" />
          )}
        </div>
        <p className="text-lg font-medium">{profile?.full_name ?? "未設定"}</p>
        <p className="text-xs text-zinc-500 mt-1">{profile?.email ?? ""}</p>
      </div>

      <div className="space-y-3">
        <GlassCard className="p-4">
          <div className="flex justify-between items-center">
            <span className="text-sm text-zinc-400">部署</span>
            <span className="text-sm">{profile?.department ?? "-"}</span>
          </div>
        </GlassCard>
        <GlassCard className="p-4">
          <div className="flex justify-between items-center">
            <span className="text-sm text-zinc-400">役職</span>
            <span className="text-sm">{profile?.position ?? "-"}</span>
          </div>
        </GlassCard>
        <GlassCard className="p-4">
          <div className="flex justify-between items-center">
            <span className="text-sm text-zinc-400">社員番号</span>
            <span className="text-sm font-mono">{profile?.employee_code ?? "-"}</span>
          </div>
        </GlassCard>
        <GlassCard className="p-4">
          <div className="flex justify-between items-center">
            <span className="text-sm text-zinc-400">ロール</span>
            <span className="text-sm">{profile?.role?.toUpperCase() ?? "-"}</span>
          </div>
        </GlassCard>
      </div>

      <div className="mt-8">
        <Button
          variant="outline"
          size="lg"
          onClick={handleLogout}
          className="gap-2 border-red-500/30 text-red-400 hover:bg-red-500/10"
        >
          <LogOut className="w-4 h-4" />
          ログアウト
        </Button>
      </div>
    </>
  );
}
