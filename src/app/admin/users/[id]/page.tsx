"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { GlassCard } from "@/components/ui/glass-card";
import { LoadingSpinner } from "@/components/shared/loading-spinner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Pencil, Save } from "lucide-react";
import Link from "next/link";
import { useToast } from "@/components/ui/toast";
import { createClient } from "@/lib/supabase/client";

interface UserDetail {
  id: string;
  full_name: string;
  full_name_kana: string | null;
  employee_code: string | null;
  email: string | null;
  phone: string | null;
  department: string | null;
  position: string | null;
  role: string;
  auth_method: string;
  is_active: boolean;
  hired_at: string | null;
  created_at: string;
}

const roleVariant: Record<string, "success" | "pending" | "alert" | "default"> = {
  admin: "alert",
  sv: "pending",
  staff: "default",
};

export default function AdminUserDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const [user, setUser] = useState<UserDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [form, setForm] = useState({
    full_name: "",
    full_name_kana: "",
    employee_code: "",
    email: "",
    phone: "",
    department: "",
    position: "",
    role: "staff" as string,
    is_active: true,
  });

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data } = await supabase
        .from("core_users")
        .select("id, full_name, full_name_kana, employee_code, email, phone, department, position, role, auth_method, is_active, hired_at, created_at")
        .eq("id", params.id as string)
        .single();

      const u = data as UserDetail | null;
      setUser(u);
      if (u) {
        setForm({
          full_name: u.full_name,
          full_name_kana: u.full_name_kana ?? "",
          employee_code: u.employee_code ?? "",
          email: u.email ?? "",
          phone: u.phone ?? "",
          department: u.department ?? "",
          position: u.position ?? "",
          role: u.role,
          is_active: u.is_active,
        });
      }
      setIsLoading(false);
    }
    load();
  }, [params.id]);

  const handleSave = async () => {
    if (!user || !form.full_name) return;
    setIsSaving(true);

    const supabase = createClient();
    const { error } = await supabase
      .from("core_users")
      .update({
        full_name: form.full_name,
        full_name_kana: form.full_name_kana || null,
        employee_code: form.employee_code || null,
        email: form.email || null,
        phone: form.phone || null,
        department: form.department || null,
        position: form.position || null,
        role: form.role,
        is_active: form.is_active,
      })
      .eq("id", user.id);

    if (error) {
      toast("更新に失敗しました", "error");
      setIsSaving(false);
      return;
    }

    toast("スタッフ情報を更新しました", "success");
    setUser({
      ...user,
        full_name: form.full_name,
        full_name_kana: form.full_name_kana || null,
        employee_code: form.employee_code || null,
        email: form.email || null,
        phone: form.phone || null,
        department: form.department || null,
        position: form.position || null,
        role: form.role,
        is_active: form.is_active,
    });
    setIsEditing(false);
    setIsSaving(false);
  };

  if (isLoading) return <LoadingSpinner />;

  if (!user) {
    return (
      <>
        <Link
          href="/admin/users"
          className="inline-flex items-center gap-1 text-xs text-zinc-500 hover:text-white transition-colors mb-6"
        >
          <ArrowLeft className="w-3 h-3" />
          一覧に戻る
        </Link>
        <p className="text-zinc-500 text-sm">ユーザーが見つかりません</p>
      </>
    );
  }

  const InfoRow = ({ label, value }: { label: string; value: string | null }) => (
    <div className="flex justify-between items-center py-3 border-b border-white/5 last:border-0">
      <span className="text-sm text-zinc-500">{label}</span>
      <span className="text-sm">{value || "-"}</span>
    </div>
  );

  return (
    <>
      <Link
        href="/admin/users"
        className="inline-flex items-center gap-1 text-xs text-zinc-500 hover:text-white transition-colors mb-6"
      >
        <ArrowLeft className="w-3 h-3" />
        一覧に戻る
      </Link>

      <div className="flex items-center gap-4 mb-8">
        <h3 className="text-lg font-medium">{user.full_name}</h3>
        <Badge variant={roleVariant[user.role] ?? "default"}>
          {user.role.toUpperCase()}
        </Badge>
        <Badge variant={user.is_active ? "success" : "default"}>
          {user.is_active ? "有効" : "無効"}
        </Badge>
        <div className="ml-auto">
          {isEditing ? (
            <div className="flex gap-2">
              <Button size="sm" onClick={handleSave} disabled={isSaving} className="gap-1">
                <Save className="w-3.5 h-3.5" />
                {isSaving ? "保存中..." : "保存"}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => {
                setIsEditing(false);
                // Reset form to current user data
                setForm({
                  full_name: user.full_name,
                  full_name_kana: user.full_name_kana ?? "",
                  employee_code: user.employee_code ?? "",
                  email: user.email ?? "",
                  phone: user.phone ?? "",
                  department: user.department ?? "",
                  position: user.position ?? "",
                  role: user.role,
                  is_active: user.is_active,
                });
              }}>
                キャンセル
              </Button>
            </div>
          ) : (
            <Button size="sm" variant="outline" onClick={() => setIsEditing(true)} className="gap-1">
              <Pencil className="w-3.5 h-3.5" />
              編集
            </Button>
          )}
        </div>
      </div>

      {isEditing ? (
        <div className="grid grid-cols-2 gap-6">
          <GlassCard className="p-6">
            <h4 className="text-sm font-medium text-zinc-400 mb-4">基本情報</h4>
            <div className="space-y-4">
              <Input label="氏名 *" value={form.full_name} onChange={(e) => setForm((p) => ({ ...p, full_name: e.target.value }))} />
              <Input label="氏名（カナ）" value={form.full_name_kana} onChange={(e) => setForm((p) => ({ ...p, full_name_kana: e.target.value }))} />
              <Input label="社員番号" value={form.employee_code} onChange={(e) => setForm((p) => ({ ...p, employee_code: e.target.value }))} />
              <Input label="メール" value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} />
              <Input label="電話番号" value={form.phone} onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))} />
            </div>
          </GlassCard>

          <GlassCard className="p-6">
            <h4 className="text-sm font-medium text-zinc-400 mb-4">所属・権限</h4>
            <div className="space-y-4">
              <Input label="部署" value={form.department} onChange={(e) => setForm((p) => ({ ...p, department: e.target.value }))} />
              <Input label="役職" value={form.position} onChange={(e) => setForm((p) => ({ ...p, position: e.target.value }))} />
              <div className="space-y-1.5">
                <label className="text-xs text-zinc-500 tracking-widest">権限</label>
                <select
                  value={form.role}
                  onChange={(e) => setForm((p) => ({ ...p, role: e.target.value }))}
                  className="w-full bg-transparent border border-white/10 rounded-lg px-3 py-2 text-sm outline-none"
                >
                  <option className="bg-black" value="staff">Staff</option>
                  <option className="bg-black" value="sv">SV</option>
                  <option className="bg-black" value="admin">Admin</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs text-zinc-500 tracking-widest">状態</label>
                <select
                  value={form.is_active ? "active" : "inactive"}
                  onChange={(e) => setForm((p) => ({ ...p, is_active: e.target.value === "active" }))}
                  className="w-full bg-transparent border border-white/10 rounded-lg px-3 py-2 text-sm outline-none"
                >
                  <option className="bg-black" value="active">有効</option>
                  <option className="bg-black" value="inactive">無効</option>
                </select>
              </div>
              <InfoRow label="認証方式" value={user.auth_method} />
              <InfoRow
                label="入社日"
                value={user.hired_at ? new Date(user.hired_at + "T00:00:00").toLocaleDateString("ja-JP") : null}
              />
              <InfoRow
                label="登録日"
                value={new Date(user.created_at).toLocaleDateString("ja-JP", { timeZone: "Asia/Tokyo" })}
              />
            </div>
          </GlassCard>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-6">
          <GlassCard className="p-6">
            <h4 className="text-sm font-medium text-zinc-400 mb-4">基本情報</h4>
            <InfoRow label="氏名" value={user.full_name} />
            <InfoRow label="氏名（カナ）" value={user.full_name_kana} />
            <InfoRow label="社員番号" value={user.employee_code} />
            <InfoRow label="メール" value={user.email} />
            <InfoRow label="電話番号" value={user.phone} />
          </GlassCard>

          <GlassCard className="p-6">
            <h4 className="text-sm font-medium text-zinc-400 mb-4">所属・権限</h4>
            <InfoRow label="部署" value={user.department} />
            <InfoRow label="役職" value={user.position} />
            <InfoRow label="認証方式" value={user.auth_method} />
            <InfoRow
              label="入社日"
              value={user.hired_at ? new Date(user.hired_at + "T00:00:00").toLocaleDateString("ja-JP") : null}
            />
            <InfoRow
              label="登録日"
              value={new Date(user.created_at).toLocaleDateString("ja-JP", { timeZone: "Asia/Tokyo" })}
            />
          </GlassCard>
        </div>
      )}
    </>
  );
}
