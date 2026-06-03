"use client";

import { useEffect, useState, useCallback } from "react";
import { DataTable } from "@/components/shared/data-table";
import { LoadingSpinner } from "@/components/shared/loading-spinner";
import { GlassCard } from "@/components/ui/glass-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Pencil, Trash2, Save, ArrowLeft, Clock } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

interface ShiftRow extends Record<string, unknown> {
  id: string;
  name: string;
  shift_type: string;
  start_time: string;
  end_time: string;
  break_minutes: number;
  hours: number;
}

interface ShiftForm {
  name: string;
  shift_type: string;
  start_time: string;
  end_time: string;
  break_minutes: string;
}

const emptyForm: ShiftForm = {
  name: "",
  shift_type: "day",
  start_time: "09:00",
  end_time: "18:00",
  break_minutes: "60",
};

const SHIFT_TYPE_LABELS: Record<string, string> = {
  day: "日勤",
  night: "夜勤",
  flex: "フレックス",
  custom: "カスタム",
};

function calcHours(start: string, end: string, breakMin: number): number {
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  let mins = eh * 60 + em - (sh * 60 + sm) - breakMin;
  if (mins < 0) mins += 24 * 60;
  return Math.round((mins / 60) * 10) / 10;
}

export default function ShiftPatternsPage() {
  const { toast } = useToast();
  const [data, setData] = useState<ShiftRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState<ShiftForm>(emptyForm);

  const load = useCallback(async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setIsLoading(false); return; }

    const { data: coreUser } = await supabase
      .from("core_users")
      .select("tenant_id")
      .eq("supabase_auth_id", user.id)
      .single();
    if (!coreUser) { setIsLoading(false); return; }

    const { data: shifts } = await supabase
      .from("attn_shifts")
      .select("id, name, shift_type, start_time, end_time, break_minutes, is_active")
      .eq("tenant_id", coreUser.tenant_id)
      .eq("is_active", true)
      .order("name");

    const rows: ShiftRow[] = (shifts ?? []).map((s) => ({
      id: s.id,
      name: s.name,
      shift_type: s.shift_type,
      start_time: s.start_time.slice(0, 5),
      end_time: s.end_time.slice(0, 5),
      break_minutes: s.break_minutes,
      hours: calcHours(s.start_time, s.end_time, s.break_minutes),
    }));

    setData(rows);
    setIsLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setShowForm(true);
  };

  const openEdit = (row: ShiftRow) => {
    setEditingId(row.id);
    setForm({
      name: row.name,
      shift_type: row.shift_type,
      start_time: row.start_time,
      end_time: row.end_time,
      break_minutes: String(row.break_minutes),
    });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.start_time || !form.end_time) {
      toast("名前・開始時刻・終了時刻は必須です", "error");
      return;
    }
    setIsSaving(true);

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setIsSaving(false); return; }

    const payload = {
      name: form.name,
      shift_type: form.shift_type,
      start_time: form.start_time,
      end_time: form.end_time,
      break_minutes: parseInt(form.break_minutes) || 60,
    };

    if (editingId) {
      const { error } = await supabase.from("attn_shifts").update(payload).eq("id", editingId);
      if (error) { toast("更新に失敗しました", "error"); setIsSaving(false); return; }
      toast("シフトパターンを更新しました", "success");
    } else {
      const { data: coreUser } = await supabase
        .from("core_users")
        .select("tenant_id")
        .eq("supabase_auth_id", user.id)
        .single();
      if (!coreUser) { setIsSaving(false); return; }

      const { error } = await supabase.from("attn_shifts").insert({
        ...payload,
        tenant_id: coreUser.tenant_id,
      });
      if (error) { toast("登録に失敗しました", "error"); setIsSaving(false); return; }
      toast("シフトパターンを登録しました", "success");
    }

    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm);
    await load();
    setIsSaving(false);
  };

  const handleDelete = async (id: string) => {
    const supabase = createClient();
    await supabase.from("attn_shifts").update({ is_active: false }).eq("id", id);
    toast("シフトパターンを削除しました", "success");
    await load();
  };

  const previewHours = calcHours(form.start_time || "09:00", form.end_time || "18:00", parseInt(form.break_minutes) || 60);

  const columns = [
    {
      key: "name",
      header: "パターン名",
      render: (row: Record<string, unknown>) => (
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-blue-400" />
          <span className="font-medium">{row.name as string}</span>
        </div>
      ),
    },
    {
      key: "shift_type",
      header: "種別",
      render: (row: Record<string, unknown>) => (
        <span className="text-xs px-2 py-1 rounded-full bg-white/5 text-zinc-300">
          {SHIFT_TYPE_LABELS[row.shift_type as string] ?? row.shift_type}
        </span>
      ),
    },
    {
      key: "time",
      header: "時間帯",
      render: (row: Record<string, unknown>) => (
        <span className="font-mono text-sm">
          {row.start_time as string} 〜 {row.end_time as string}
        </span>
      ),
    },
    {
      key: "break_minutes",
      header: "休憩",
      render: (row: Record<string, unknown>) => `${row.break_minutes}分`,
    },
    {
      key: "hours",
      header: "実働",
      render: (row: Record<string, unknown>) => (
        <span className="text-emerald-400 font-medium">{row.hours as number}h</span>
      ),
    },
    {
      key: "actions",
      header: "",
      render: (row: Record<string, unknown>) => (
        <div className="flex gap-2 justify-end">
          <Button
            size="sm"
            variant="ghost"
            className="gap-1 text-zinc-400 hover:text-white"
            onClick={(e) => { e.stopPropagation(); openEdit(row as ShiftRow); }}
          >
            <Pencil className="w-3.5 h-3.5" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="gap-1 text-zinc-400 hover:text-red-400"
            onClick={(e) => { e.stopPropagation(); handleDelete(row.id as string); }}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      ),
    },
  ];

  if (isLoading) return <LoadingSpinner />;

  return (
    <>
      <div className="flex justify-between items-center mb-8">
        <div className="flex items-center gap-4">
          <Link
            href="/admin/shifts"
            className="p-2 rounded-lg hover:bg-white/10 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 text-zinc-400" />
          </Link>
          <h3 className="text-sm text-zinc-500 tracking-widest">シフトパターン設定</h3>
        </div>
        <Button size="sm" className="gap-1" onClick={openCreate}>
          <Plus className="w-4 h-4" /> 追加
        </Button>
      </div>

      {showForm && (
        <GlassCard className="p-6 mb-6">
          <h4 className="text-sm font-medium mb-4">
            {editingId ? "パターン編集" : "新規パターン登録"}
          </h4>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <Input
              label="パターン名 *"
              placeholder="日勤A"
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
            />
            <div className="space-y-1.5">
              <label className="text-xs text-zinc-500 uppercase tracking-widest">種別</label>
              <select
                value={form.shift_type}
                onChange={(e) => setForm((p) => ({ ...p, shift_type: e.target.value }))}
                className="w-full bg-transparent text-white outline-none"
              >
                {Object.entries(SHIFT_TYPE_LABELS).map(([val, label]) => (
                  <option key={val} value={val} className="bg-zinc-900">{label}</option>
                ))}
              </select>
            </div>
            <Input
              label="開始時刻 *"
              type="time"
              value={form.start_time}
              onChange={(e) => setForm((p) => ({ ...p, start_time: e.target.value }))}
            />
            <Input
              label="終了時刻 *"
              type="time"
              value={form.end_time}
              onChange={(e) => setForm((p) => ({ ...p, end_time: e.target.value }))}
            />
            <Input
              label="休憩（分）"
              type="number"
              placeholder="60"
              value={form.break_minutes}
              onChange={(e) => setForm((p) => ({ ...p, break_minutes: e.target.value }))}
            />
            <div className="space-y-1.5">
              <label className="text-xs text-zinc-500 uppercase tracking-widest">実働時間</label>
              <p className="text-2xl font-light text-emerald-400">{previewHours}<span className="text-sm text-zinc-500 ml-1">h</span></p>
            </div>
          </div>
          <div className="flex gap-3 mt-6">
            <Button size="md" onClick={handleSave} disabled={isSaving} className="gap-1">
              <Save className="w-4 h-4" />
              {isSaving ? "保存中..." : editingId ? "更新" : "登録"}
            </Button>
            <Button size="md" variant="ghost" onClick={() => { setShowForm(false); setEditingId(null); }}>
              キャンセル
            </Button>
          </div>
        </GlassCard>
      )}

      <DataTable columns={columns} data={data} emptyMessage="シフトパターンが登録されていません。「追加」から作成してください。" />
    </>
  );
}
