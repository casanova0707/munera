"use client";

import { useEffect, useState } from "react";
import { GlassCard } from "@/components/ui/glass-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LoadingSpinner } from "@/components/shared/loading-spinner";
import { createClient } from "@/lib/supabase/client";
import { Loader2 } from "lucide-react";

interface TenantInfo {
  name: string;
  postal_code: string;
  address: string;
  phone: string;
}

interface Settings {
  closing_day: string;
  gps_radius_default: string;
  break_minutes_default: string;
  work_minutes_default: string;
  late_threshold_minutes: string;
  pre_overtime_detection: string;
  offsite_reason_required: string;
}

export default function AdminSettingsPage() {
  const [tenant, setTenant] = useState<TenantInfo>({ name: "", postal_code: "", address: "", phone: "" });
  const [settings, setSettings] = useState<Settings>({
    closing_day: "25",
    gps_radius_default: "100",
    break_minutes_default: "60",
    work_minutes_default: "480",
    late_threshold_minutes: "10",
    pre_overtime_detection: "true",
    offsite_reason_required: "true",
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setIsLoading(false); return; }

      const { data: coreUser } = await supabase
        .from("core_users")
        .select("tenant_id")
        .eq("supabase_auth_id", user.id)
        .single();
      if (!coreUser) { setIsLoading(false); return; }

      // Load tenant info
      const { data: tenantData } = await supabase
        .from("core_tenants")
        .select("name, postal_code, address, phone")
        .eq("id", coreUser.tenant_id)
        .single();
      if (tenantData) {
        setTenant({
          name: tenantData.name ?? "",
          postal_code: tenantData.postal_code ?? "",
          address: tenantData.address ?? "",
          phone: tenantData.phone ?? "",
        });
      }

      // Load settings
      const { data: settingsData } = await supabase
        .from("sys_settings")
        .select("key, value")
        .eq("tenant_id", coreUser.tenant_id);

      if (settingsData) {
        const map: Record<string, string> = {};
        for (const s of settingsData) {
          map[s.key] = typeof s.value === "string" ? s.value : JSON.stringify(s.value).replace(/"/g, "");
        }
        setSettings((prev) => ({ ...prev, ...map }));
      }

      setIsLoading(false);
    }
    load();
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    setMessage("");

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setIsSaving(false); return; }

    const { data: coreUser } = await supabase
      .from("core_users")
      .select("tenant_id")
      .eq("supabase_auth_id", user.id)
      .single();
    if (!coreUser) { setIsSaving(false); return; }

    // Update tenant info
    await supabase
      .from("core_tenants")
      .update({
        name: tenant.name,
        postal_code: tenant.postal_code,
        address: tenant.address,
        phone: tenant.phone,
      })
      .eq("id", coreUser.tenant_id);

    // Update settings
    for (const [key, value] of Object.entries(settings)) {
      await supabase
        .from("sys_settings")
        .upsert(
          { tenant_id: coreUser.tenant_id, key, value: value },
          { onConflict: "tenant_id,key" }
        );
    }

    setMessage("保存しました");
    setIsSaving(false);
    setTimeout(() => setMessage(""), 3000);
  };

  if (isLoading) return <LoadingSpinner />;

  return (
    <>
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-sm text-zinc-500 tracking-widest">組織設定</h3>
        <div className="flex items-center gap-3">
          {message && <span className="text-xs text-emerald-400">{message}</span>}
          <Button size="sm" onClick={handleSave} disabled={isSaving}>
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : "設定を保存"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* 組織情報 */}
        <GlassCard className="p-5 space-y-3">
          <h4 className="text-sm font-medium text-zinc-400 mb-2">組織情報</h4>
          <Input label="組織名" value={tenant.name} onChange={(e) => setTenant((p) => ({ ...p, name: e.target.value }))} />
          <Input label="郵便番号" value={tenant.postal_code} onChange={(e) => setTenant((p) => ({ ...p, postal_code: e.target.value }))} />
          <Input label="住所" value={tenant.address} onChange={(e) => setTenant((p) => ({ ...p, address: e.target.value }))} />
          <Input label="電話番号" value={tenant.phone} onChange={(e) => setTenant((p) => ({ ...p, phone: e.target.value }))} />
        </GlassCard>

        {/* 勤怠設定 */}
        <GlassCard className="p-5 space-y-3">
          <h4 className="text-sm font-medium text-zinc-400 mb-2">勤怠設定</h4>
          <Input
            label="締め日（毎月N日）"
            type="number"
            value={settings.closing_day}
            onChange={(e) => setSettings((p) => ({ ...p, closing_day: e.target.value }))}
          />
          <Input
            label="GPS検知半径 (m)"
            type="number"
            value={settings.gps_radius_default}
            onChange={(e) => setSettings((p) => ({ ...p, gps_radius_default: e.target.value }))}
          />
          <Input
            label="デフォルト休憩 (分)"
            type="number"
            value={settings.break_minutes_default}
            onChange={(e) => setSettings((p) => ({ ...p, break_minutes_default: e.target.value }))}
          />
          <Input
            label="所定労働時間 (分)"
            type="number"
            value={settings.work_minutes_default}
            onChange={(e) => setSettings((p) => ({ ...p, work_minutes_default: e.target.value }))}
          />
          <Input
            label="遅刻判定閾値 (分)"
            type="number"
            value={settings.late_threshold_minutes}
            onChange={(e) => setSettings((p) => ({ ...p, late_threshold_minutes: e.target.value }))}
          />
          <div className="flex items-center gap-3 pt-2">
            <input
              type="checkbox"
              id="pre-ot"
              checked={settings.pre_overtime_detection === "true"}
              onChange={(e) => setSettings((p) => ({ ...p, pre_overtime_detection: e.target.checked ? "true" : "false" }))}
              className="rounded"
            />
            <label htmlFor="pre-ot" className="text-xs text-zinc-400">前残業の自動検知</label>
          </div>
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="offsite"
              checked={settings.offsite_reason_required === "true"}
              onChange={(e) => setSettings((p) => ({ ...p, offsite_reason_required: e.target.checked ? "true" : "false" }))}
              className="rounded"
            />
            <label htmlFor="offsite" className="text-xs text-zinc-400">場所相違時の理由入力を強制</label>
          </div>
        </GlassCard>

        {/* LINE連携 */}
        <GlassCard className="p-5 space-y-3">
          <h4 className="text-sm font-medium text-zinc-400 mb-2">LINE連携</h4>
          <p className="text-xs text-zinc-500">
            LINE キーは環境変数（.env.local）で管理しています。
            Supabase ダッシュボードまたはサーバー設定で変更してください。
          </p>
          <div className="pt-2 space-y-2">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${process.env.NEXT_PUBLIC_LINE_CALLBACK_URL ? "bg-emerald-400" : "bg-zinc-600"}`} />
              <span className="text-xs text-zinc-400">LINE Login</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-zinc-600" />
              <span className="text-xs text-zinc-400">LINE Messaging</span>
            </div>
          </div>
        </GlassCard>
      </div>
    </>
  );
}
