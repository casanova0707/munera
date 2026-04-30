"use client";

import { useEffect, useState, useCallback } from "react";
import { DataTable } from "@/components/shared/data-table";
import { LoadingSpinner } from "@/components/shared/loading-spinner";
import { GlassCard } from "@/components/ui/glass-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MapPin, Plus, Pencil, Trash2, Save } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { createClient } from "@/lib/supabase/client";

interface LocationRow extends Record<string, unknown> {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  radius: number;
}

interface LocationForm {
  name: string;
  address: string;
  latitude: string;
  longitude: string;
  radius_meters: string;
}

const emptyForm: LocationForm = {
  name: "",
  address: "",
  latitude: "",
  longitude: "",
  radius_meters: "100",
};

export default function AdminLocationsPage() {
  const { toast } = useToast();
  const [data, setData] = useState<LocationRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState<LocationForm>(emptyForm);

  const load = useCallback(async () => {
    const supabase = createClient();
    const { data: workplaces } = await supabase
      .from("core_workplaces")
      .select("id, name, address, latitude, longitude, radius_meters, is_active")
      .eq("is_active", true)
      .order("name");

    const rows: LocationRow[] = (workplaces ?? []).map((w) => ({
      id: w.id,
      name: w.name,
      address: w.address ?? "",
      lat: w.latitude,
      lng: w.longitude,
      radius: w.radius_meters,
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

  const openEdit = (row: LocationRow) => {
    setEditingId(row.id);
    setForm({
      name: row.name,
      address: row.address,
      latitude: String(row.lat),
      longitude: String(row.lng),
      radius_meters: String(row.radius),
    });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.latitude || !form.longitude) return;
    setIsSaving(true);

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setIsSaving(false); return; }

    const payload = {
      name: form.name,
      address: form.address || null,
      latitude: parseFloat(form.latitude),
      longitude: parseFloat(form.longitude),
      radius_meters: parseInt(form.radius_meters) || 100,
    };

    if (editingId) {
      const { error } = await supabase.from("core_workplaces").update(payload).eq("id", editingId);
      if (error) { toast("更新に失敗しました", "error"); setIsSaving(false); return; }
      toast("拠点を更新しました", "success");
    } else {
      // Get tenant_id from current user
      const { data: coreUser } = await supabase
        .from("core_users")
        .select("tenant_id")
        .eq("supabase_auth_id", user.id)
        .single();
      if (!coreUser) { setIsSaving(false); return; }

      const { error } = await supabase.from("core_workplaces").insert({
        ...payload,
        tenant_id: coreUser.tenant_id,
      });
      if (error) { toast("登録に失敗しました", "error"); setIsSaving(false); return; }
      toast("拠点を登録しました", "success");
    }

    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm);
    await load();
    setIsSaving(false);
  };

  const handleDelete = async (id: string) => {
    const supabase = createClient();
    // Soft delete — set is_active = false
    await supabase.from("core_workplaces").update({ is_active: false }).eq("id", id);
    await load();
  };

  const columns = [
    {
      key: "name",
      header: "拠点名",
      render: (row: Record<string, unknown>) => (
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-emerald-500" />
          {row.name as string}
        </div>
      ),
    },
    { key: "address", header: "住所" },
    {
      key: "coords",
      header: "座標",
      render: (row: Record<string, unknown>) => (
        <span className="font-mono text-xs text-zinc-400">
          {row.lat as number}, {row.lng as number}
        </span>
      ),
    },
    {
      key: "radius",
      header: "半径",
      render: (row: Record<string, unknown>) => `${row.radius}m`,
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
            onClick={(e) => { e.stopPropagation(); openEdit(row as LocationRow); }}
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
        <h3 className="text-sm text-zinc-500 tracking-widest">拠点管理</h3>
        <Button size="sm" className="gap-1" onClick={openCreate}>
          <Plus className="w-4 h-4" /> 追加
        </Button>
      </div>

      {showForm && (
        <GlassCard className="p-6 mb-6">
          <h4 className="text-sm font-medium mb-4">
            {editingId ? "拠点編集" : "新規拠点登録"}
          </h4>
          <div className="grid grid-cols-3 gap-4">
            <Input
              label="拠点名 *"
              placeholder="本社"
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
            />
            <Input
              label="住所"
              placeholder="東京都渋谷区..."
              value={form.address}
              onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))}
            />
            <Input
              label="半径（m）"
              type="number"
              placeholder="100"
              value={form.radius_meters}
              onChange={(e) => setForm((p) => ({ ...p, radius_meters: e.target.value }))}
            />
            <Input
              label="緯度 *"
              type="number"
              step="any"
              placeholder="35.6812"
              value={form.latitude}
              onChange={(e) => setForm((p) => ({ ...p, latitude: e.target.value }))}
            />
            <Input
              label="経度 *"
              type="number"
              step="any"
              placeholder="139.7671"
              value={form.longitude}
              onChange={(e) => setForm((p) => ({ ...p, longitude: e.target.value }))}
            />
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

      <DataTable columns={columns} data={data} />
    </>
  );
}
