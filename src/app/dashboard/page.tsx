import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import LogoutButton from "@/components/auth/logout-button";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  // profiles テーブルからユーザー情報を取得
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  const displayName =
    profile?.full_name || profile?.username || user.email || "ユーザー";

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-lg">
        <div className="flex flex-col items-center space-y-4">
          {profile?.avatar_url && (
            <img
              src={profile.avatar_url}
              alt="アバター"
              className="h-20 w-20 rounded-full"
              referrerPolicy="no-referrer"
            />
          )}
          <h1 className="text-2xl font-bold text-gray-900">ダッシュボード</h1>
          <p className="text-gray-600">ようこそ、{displayName} さん</p>
          <p className="text-sm text-gray-400">{user.email}</p>
          <p className="text-xs text-gray-300">
            登録日: {profile?.created_at ? new Date(profile.created_at).toLocaleDateString("ja-JP") : "不明"}
          </p>
          <div className="pt-4">
            <LogoutButton />
          </div>
        </div>
      </div>
    </div>
  );
}
