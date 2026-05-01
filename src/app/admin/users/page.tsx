"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { DataTable } from "@/components/shared/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";
import { Input } from "@/components/ui/input";
import { LoadingSpinner } from "@/components/shared/loading-spinner";
import { Plus } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { createClient } from "@/lib/supabase/client";

interface UserRow extends Record<string, unknown> {
  id: string;
  code: string;
  name: string;
  department: string;
  role: string;
  status: string;
}

const roleVariant: Record<string, "success" | "pending" | "alert" | "default"> = {
  admin: "alert",
  sv: "pending",
  staff: "default",
};

const columns = [
  { key: "code", header: "社員番号" },
  { key: "name", header: "氏名" },
  { key: "department", header: "部署" },
  {
    key: "role",
    header: "権限",
    render: (row: Record<string, unknown>) => (
      <Badge variant={roleVariant[row.role as string] ?? "default"}>
        {(row.role as string).toUpperCase()}
      </Badge>
    ),
  },
  {
    key: "status",
    header: "状態",
    render: (row: Record<string, unknown>) => (
      <Badge variant={row.status === "有効" ? "success" : "default"}>
        {row.status as string}
      </Badge>
    ),
  },
];

export default function AdminUsersPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [data, setData] = useState<UserRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // New user form state
  const [form, setForm] = useState({
    full_name: "",
    full_name_kana: "",
    employee_code: "",
    email: "",
    department: "",
    role: "staff" as "staff" | "sv" | "admin",
  });

  const load = async () => {
    const supabase = createClient();
    const { data: users } = await supabase
      .from("core_users")
      .select("id, employee_code, full_name, department, role, is_active")
      .order("employee_code", { ascending: true });

    const rows: UserRow[] = (users ?? []).map((u) => ({
      id: u.id,
      code: u.employee_code ?? "-",
      name: u.full_name,
      department: u.department ?? "-",
      role: u.role,
      status: u.is_active ? "有効" : "無効",
    }));

    setData(rows);
    setIsLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async () => {
    if (!form.full_name || !form.employee_code) return;
    setIsSaving(true);

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setIsSaving(false); return; }

    const { data: coreUser } = await supabase
      .from("core_users")
      .select("tenant_id")
      .eq("supabase_auth_id", user.id)
      .single();
    if (!coreUser) { setIsSaving(false); return; }

    // Create core_users record with a placeholder auth_id
    // When the user logs in via LINE/Google, the trigger will update this
    const placeholderAuthId = crypto.randomUUID();

    const { error } = await supabase.from("core_users").insert({
      supabase_auth_id: placeholderAuthId,
      tenant_id: coreUser.tenant_id,
      full_name: form.full_name,
      full_name_kana: form.full_name_kana || null,
      employee_code: form.employee_code,
      email: form.email || null,
      department: form.department || null,
      role: form.role,
      auth_method: "email",
    });

    if (error) {
      toast("スタッフの登録に失敗しました", "error");
    } else {
      toast("スタッフを登録しました", "success");
      setShowForm(false);
      setForm({ full_name: "", full_name_kana: "", employee_code: "", email: "", department: "", role: "staff" });
      await load();
    }
    setIsSaving(false);
  };

  if (isLoading) return <LoadingSpinner />;

  return (
    <>
      <div className="flex justify-between items-center mb-8">
        <h3 className="text-sm text-zinc-500 tracking-widest">スタッフ管理</h3>
        <Button size="sm" className="gap-1" onClick={() => setShowForm(!showForm)}>
          <Plus className="w-4 h-4" /> 追加
        </Button>
      </div>

      {showForm && (
        <GlassCard className="p-6 mb-6">
          <h4 className="text-sm font-medium mb-4">新規スタッフ登録</h4>
          <div className="grid grid-cols-3 gap-4">
            <Input label="氏名 *" placeholder="山田 太郎" value={form.full_name} onChange={(e) => setForm((p) => ({ ...p, full_name: e.target.value }))} />
            <Input label="氏名（カナ）" placeholder="ヤマダ タロウ" value={form.full_name_kana} onChange={(e) => setForm((p) => ({ ...p, full_name_kana: e.target.value }))} />
            <Input label="社員番号 *" placeholder="EMP-005" value={form.employee_code} onChange={(e) => setForm((p) => ({ ...p, employee_code: e.target.value }))} />
            <Input label="メール" placeholder="yamada@example.com" value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} />
            <Input label="部署" placeholder="営業部" value={form.department} onChange={(e) => setForm((p) => ({ ...p, department: e.target.value }))} />
            <div className="space-y-1.5">
              <label className="text-xs text-zinc-500 tracking-widest">権限</label>
              <select
                value={form.role}
                onChange={(e) => setForm((p) => ({ ...p, role: e.target.value as "staff" | "sv" | "admin" }))}
                className="w-full bg-transparent border border-white/10 rounded-lg px-3 py-2 text-sm outline-none"
              >
                <option className="bg-black" value="staff">Staff</option>
                <option className="bg-black" value="sv">SV</option>
                <option className="bg-black" value="admin">Admin</option>
              </select>
            </div>
          </div>
          <div className="flex gap-3 mt-6">
            <Button size="md" onClick={handleCreate} disabled={isSaving}>
              {isSaving ? "登録中..." : "登録"}
            </Button>
            <Button size="md" variant="ghost" onClick={() => setShowForm(false)}>キャンセル</Button>
          </div>
        </GlassCard>
      )}

      <DataTable
        columns={columns}
        data={data}
        onRowClick={(row) => router.push(`/admin/users/${row.id}`)}
      />
    </>
  );
}
