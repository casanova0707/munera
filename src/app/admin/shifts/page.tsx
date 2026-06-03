"use client";

import { useState, useCallback, useEffect } from "react";
import { GlassCard } from "@/components/ui/glass-card";
import { LoadingSpinner } from "@/components/shared/loading-spinner";
import { ChevronLeft, ChevronRight, X, Settings } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

// ── Types ──
interface ShiftPattern {
  id: string;
  name: string;
  label: string; // 短縮ラベル（1文字）
  bgColor: string;
  textColor: string;
  hoursPerDay: number;
}

interface StaffMember {
  id: string;
  name: string;
}

type CellValue = string | null; // shift_id or OFF_MARKER or null

const OFF_MARKER = "__off__";
const DOW_LABELS = ["日", "月", "火", "水", "木", "金", "土"];

// Color palette for shifts (背景色ベース)
const SHIFT_COLORS = [
  { bgColor: "bg-blue-600", textColor: "text-white" },
  { bgColor: "bg-emerald-600", textColor: "text-white" },
  { bgColor: "bg-purple-600", textColor: "text-white" },
  { bgColor: "bg-amber-500", textColor: "text-black" },
  { bgColor: "bg-cyan-600", textColor: "text-white" },
  { bgColor: "bg-rose-600", textColor: "text-white" },
  { bgColor: "bg-indigo-600", textColor: "text-white" },
  { bgColor: "bg-teal-600", textColor: "text-white" },
];

export default function AdminShiftsPage() {
  const [year, setYear] = useState(() => {
    const now = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Tokyo" }));
    return now.getFullYear();
  });
  const [month, setMonth] = useState(() => {
    const now = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Tokyo" }));
    return now.getMonth();
  });

  const [patterns, setPatterns] = useState<ShiftPattern[]>([]);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [grid, setGrid] = useState<Record<string, CellValue[]>>({});
  const [selectedStaff, setSelectedStaff] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [tenantId, setTenantId] = useState<string | null>(null);

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const patternMap = new Map(patterns.map((p) => [p.id, p]));

  // シフトの循環順序: パターン1 → パターン2 → ... → 休 → クリア → パターン1
  const cycleOrder: CellValue[] = [...patterns.map((p) => p.id), OFF_MARKER, null];

  // ── Load data ──
  const load = useCallback(async () => {
    setIsLoading(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setIsLoading(false); return; }

    const { data: coreUser } = await supabase
      .from("core_users")
      .select("id, tenant_id")
      .eq("supabase_auth_id", user.id)
      .single();
    if (!coreUser) { setIsLoading(false); return; }
    setTenantId(coreUser.tenant_id);

    // Load shifts (patterns)
    const { data: shifts } = await supabase
      .from("attn_shifts")
      .select("id, name, start_time, end_time, break_minutes")
      .eq("tenant_id", coreUser.tenant_id)
      .eq("is_active", true)
      .order("name");

    const shiftPatterns: ShiftPattern[] = (shifts ?? []).map((s, i) => {
      const [sh, sm] = s.start_time.split(":").map(Number);
      const [eh, em] = s.end_time.split(":").map(Number);
      let hours = (eh * 60 + em - sh * 60 - sm - s.break_minutes) / 60;
      if (hours < 0) hours += 24;
      const c = SHIFT_COLORS[i % SHIFT_COLORS.length];
      // 短縮ラベル: 最初の1文字
      const label = s.name.charAt(0);
      return { id: s.id, name: s.name, label, hoursPerDay: Math.round(hours * 10) / 10, ...c };
    });
    setPatterns(shiftPatterns);

    // Load staff
    const { data: users } = await supabase
      .from("core_users")
      .select("id, full_name")
      .eq("tenant_id", coreUser.tenant_id)
      .eq("is_active", true)
      .order("full_name");
    const staffList = (users ?? []).map((u) => ({ id: u.id, name: u.full_name }));
    setStaff(staffList);

    // Load assignments for this month
    const monthStr = `${year}-${(month + 1).toString().padStart(2, "0")}`;
    const startDate = `${monthStr}-01`;
    const endDate = `${monthStr}-${daysInMonth.toString().padStart(2, "0")}`;

    const { data: assignments } = await supabase
      .from("attn_shift_assignments")
      .select("user_id, shift_id, work_date, is_day_off")
      .eq("tenant_id", coreUser.tenant_id)
      .gte("work_date", startDate)
      .lte("work_date", endDate);

    // Build grid
    const newGrid: Record<string, CellValue[]> = {};
    for (const s of staffList) {
      newGrid[s.id] = new Array(daysInMonth).fill(null);
    }
    if (assignments) {
      for (const a of assignments) {
        if (!newGrid[a.user_id]) continue;
        const day = new Date(a.work_date + "T00:00:00").getDate() - 1;
        newGrid[a.user_id][day] = a.is_day_off ? OFF_MARKER : a.shift_id;
      }
    }
    setGrid(newGrid);
    setIsLoading(false);
  }, [year, month, daysInMonth]);

  useEffect(() => { load(); }, [load]);

  // ── Month navigation ──
  const prevMonth = () => {
    if (month === 0) { setYear(year - 1); setMonth(11); }
    else { setMonth(month - 1); }
  };
  const nextMonth = () => {
    if (month === 11) { setYear(year + 1); setMonth(0); }
    else { setMonth(month + 1); }
  };

  // ── セルタップ → シフト循環切り替え ──
  const handleCellTap = useCallback(async (staffId: string, dayIndex: number) => {
    // 選択中のスタッフのみ編集可能
    if (selectedStaff !== staffId) return;

    const currentValue = grid[staffId]?.[dayIndex] ?? null;
    const currentIdx = cycleOrder.indexOf(currentValue);
    const nextIdx = (currentIdx + 1) % cycleOrder.length;
    const nextValue = cycleOrder[nextIdx];

    // UIを即座に更新
    setGrid((prev) => {
      const updated = { ...prev };
      updated[staffId] = [...(updated[staffId] ?? [])];
      updated[staffId][dayIndex] = nextValue;
      return updated;
    });

    // DB保存
    const supabase = createClient();
    const workDate = `${year}-${(month + 1).toString().padStart(2, "0")}-${(dayIndex + 1).toString().padStart(2, "0")}`;

    if (nextValue === null) {
      await supabase
        .from("attn_shift_assignments")
        .delete()
        .eq("user_id", staffId)
        .eq("work_date", workDate);
    } else {
      await supabase
        .from("attn_shift_assignments")
        .upsert({
          tenant_id: tenantId,
          user_id: staffId,
          shift_id: nextValue === OFF_MARKER ? null : nextValue,
          work_date: workDate,
          is_day_off: nextValue === OFF_MARKER,
        }, { onConflict: "user_id,work_date" });
    }
  }, [selectedStaff, grid, cycleOrder, tenantId, year, month]);

  // ── Summaries ──
  const staffSummary = (staffId: string) => {
    const cells = grid[staffId] ?? [];
    let workDays = 0;
    let hours = 0;
    cells.forEach((cell) => {
      if (cell && cell !== OFF_MARKER) {
        const p = patternMap.get(cell);
        workDays++;
        hours += p?.hoursPerDay ?? 8;
      }
    });
    return { workDays, hours, totalDays: daysInMonth };
  };

  const getWeeklySummary = (staffId: string) => {
    const cells = grid[staffId] ?? [];
    const weeks: { weekNum: number; hours: number; days: number }[] = [];
    let weekIdx = 0;
    for (let d = 0; d < daysInMonth; d++) {
      const dow = new Date(year, month, d + 1).getDay();
      if (dow === 1 && d > 0) weekIdx++;
      if (!weeks[weekIdx]) weeks[weekIdx] = { weekNum: weekIdx + 1, hours: 0, days: 0 };
      const cell = cells[d];
      if (cell && cell !== OFF_MARKER) {
        const p = patternMap.get(cell);
        weeks[weekIdx].hours += p?.hoursPerDay ?? 8;
        weeks[weekIdx].days++;
      }
    }
    return weeks.filter(Boolean);
  };

  const totalPlanned = staff.reduce((sum, s) => sum + staffSummary(s.id).hours, 0);

  if (isLoading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3 flex-wrap">
          <Link
            href="/admin/shifts/patterns"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white text-xs transition-all"
          >
            <Settings className="w-3.5 h-3.5" />
            パターン設定
          </Link>
          <GlassCard className="inline-flex items-center px-4 py-2 gap-1">
            <span className="text-xs text-zinc-400 mr-1">予定</span>
            <span className="text-lg font-medium text-emerald-400">{totalPlanned}</span>
            <span className="text-xs text-zinc-400">h</span>
          </GlassCard>
          <GlassCard className="inline-flex items-center px-4 py-2 gap-1">
            <span className="text-xs text-zinc-400 mr-1">人数</span>
            <span className="text-lg font-medium">{staff.length}</span>
            <span className="text-xs text-zinc-400">名</span>
          </GlassCard>
        </div>
        <div className="flex items-center gap-4">
          <button onClick={prevMonth} className="p-2 rounded-lg hover:bg-white/10 transition-colors">
            <ChevronLeft className="w-5 h-5 text-zinc-300" />
          </button>
          <span className="text-base font-medium min-w-[120px] text-center">
            {year}年{month + 1}月
          </span>
          <button onClick={nextMonth} className="p-2 rounded-lg hover:bg-white/10 transition-colors">
            <ChevronRight className="w-5 h-5 text-zinc-300" />
          </button>
        </div>
      </div>

      {/* 凡例 + タップ説明 */}
      <div className="flex items-center gap-3 flex-wrap">
        {patterns.map((p) => (
          <div key={p.id} className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg ${p.bgColor}`}>
            <span className={`text-xs font-bold ${p.textColor}`}>{p.label}</span>
            <span className={`text-xs ${p.textColor} opacity-80`}>{p.name}</span>
          </div>
        ))}
        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-700">
          <span className="text-xs font-bold text-zinc-300">休</span>
        </div>
        {selectedStaff && (
          <span className="text-xs text-zinc-400 ml-2">
            タップでシフト切替: {patterns.map((p) => p.label).join(" → ")} → 休 → クリア
          </span>
        )}
      </div>

      {/* スタッフ選択 */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-zinc-400 mr-1">編集対象:</span>
        {staff.map((s) => (
          <button
            key={s.id}
            onClick={() => setSelectedStaff(selectedStaff === s.id ? null : s.id)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
              selectedStaff === s.id
                ? "bg-blue-600 text-white ring-2 ring-blue-400"
                : "bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-zinc-200"
            }`}
          >
            {s.name}
          </button>
        ))}
      </div>

      {/* Calendar Grid */}
      <GlassCard className="overflow-x-auto p-4">
        {selectedStaff ? (
          // 選択中のスタッフのカレンダー（大きいセル）
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-white">
                {staff.find((s) => s.id === selectedStaff)?.name}
                <span className="text-zinc-400 ml-2 font-normal">のシフト</span>
              </h3>
              <button
                onClick={() => setSelectedStaff(null)}
                className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
              >
                <X className="w-4 h-4 text-zinc-400" />
              </button>
            </div>

            {/* 曜日ヘッダー */}
            <div className="grid grid-cols-7 gap-1 mb-1">
              {DOW_LABELS.map((label, i) => (
                <div
                  key={label}
                  className={`text-center text-xs font-medium py-1 ${
                    i === 0 ? "text-red-400" : i === 6 ? "text-blue-400" : "text-zinc-400"
                  }`}
                >
                  {label}
                </div>
              ))}
            </div>

            {/* カレンダーセル */}
            <div className="grid grid-cols-7 gap-1">
              {/* 月初の空セル */}
              {Array.from({ length: new Date(year, month, 1).getDay() }, (_, i) => (
                <div key={`empty-${i}`} className="aspect-square" />
              ))}

              {days.map((d) => {
                const dayIndex = d - 1;
                const cell = grid[selectedStaff]?.[dayIndex] ?? null;
                const pattern = cell && cell !== OFF_MARKER ? patternMap.get(cell) : null;
                const isOff = cell === OFF_MARKER;
                const dow = new Date(year, month, d).getDay();

                return (
                  <button
                    key={d}
                    onClick={() => handleCellTap(selectedStaff, dayIndex)}
                    className={`aspect-square rounded-xl flex flex-col items-center justify-center transition-all active:scale-95 ${
                      pattern
                        ? `${pattern.bgColor} shadow-lg`
                        : isOff
                        ? "bg-zinc-800 border border-zinc-700"
                        : "bg-white/5 border border-white/10 hover:border-white/20"
                    }`}
                  >
                    <span
                      className={`text-xs ${
                        pattern
                          ? `${pattern.textColor} opacity-70`
                          : dow === 0
                          ? "text-red-400"
                          : dow === 6
                          ? "text-blue-400"
                          : "text-zinc-400"
                      }`}
                    >
                      {d}
                    </span>
                    <span
                      className={`text-sm font-bold mt-0.5 ${
                        pattern
                          ? pattern.textColor
                          : isOff
                          ? "text-zinc-500"
                          : "text-transparent"
                      }`}
                    >
                      {pattern ? pattern.label : isOff ? "休" : "・"}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* 月間サマリー */}
            <div className="grid grid-cols-4 gap-4 mt-6">
              {(() => {
                const s = staffSummary(selectedStaff);
                return (
                  <>
                    <div className="text-center">
                      <p className="text-xs text-zinc-400">出勤日数</p>
                      <p className="text-2xl font-light mt-1">
                        {s.workDays}
                        <span className="text-sm text-zinc-500">日</span>
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-zinc-400">月間時間</p>
                      <p className="text-2xl font-light mt-1">
                        {s.hours}
                        <span className="text-sm text-zinc-500">h</span>
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-zinc-400">目安との差</p>
                      <p
                        className={`text-2xl font-light mt-1 ${
                          s.hours - 160 > 0
                            ? "text-red-400"
                            : s.hours - 160 === 0
                            ? "text-emerald-400"
                            : "text-yellow-400"
                        }`}
                      >
                        {s.hours - 160 >= 0 ? "+" : ""}
                        {s.hours - 160}
                        <span className="text-sm text-zinc-500">h</span>
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-zinc-400">休日数</p>
                      <p className="text-2xl font-light mt-1">
                        {s.totalDays - s.workDays}
                        <span className="text-sm text-zinc-500">日</span>
                      </p>
                    </div>
                  </>
                );
              })()}
            </div>

            {/* 週別内訳 */}
            <div className="mt-6">
              <p className="text-xs text-zinc-400 mb-3">週別内訳</p>
              <div className="grid grid-cols-5 gap-3">
                {getWeeklySummary(selectedStaff).map((w) => (
                  <GlassCard key={w.weekNum} className="p-3 text-center">
                    <p className="text-xs text-zinc-500">W{w.weekNum}</p>
                    <p
                      className={`text-lg font-light mt-0.5 ${
                        w.hours > 40 ? "text-red-400" : "text-white"
                      }`}
                    >
                      {w.hours}
                      <span className="text-xs text-zinc-500">h</span>
                    </p>
                    <p className="text-xs text-zinc-500 mt-0.5">{w.days}日</p>
                  </GlassCard>
                ))}
              </div>
              {getWeeklySummary(selectedStaff).some((w) => w.hours > 40) && (
                <p className="text-xs text-red-400 mt-3">
                  ⚠ 週40時間を超過している週があります
                </p>
              )}
            </div>
          </div>
        ) : (
          // 全員一覧（読み取り専用のコンパクト表示）
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="border-b border-white/10">
                <th className="sticky left-0 z-10 bg-black/80 backdrop-blur-sm text-left p-2 text-xs text-zinc-400 w-28 min-w-[112px]">
                  スタッフ
                </th>
                {days.map((d) => {
                  const dow = new Date(year, month, d).getDay();
                  return (
                    <th key={d} className="p-1 text-center min-w-[36px]">
                      <div
                        className={`text-[10px] ${
                          dow === 0 ? "text-red-400" : dow === 6 ? "text-blue-400" : "text-zinc-500"
                        }`}
                      >
                        {DOW_LABELS[dow]}
                      </div>
                      <div
                        className={`text-xs font-medium ${
                          dow === 0 ? "text-red-400" : dow === 6 ? "text-blue-400" : "text-zinc-300"
                        }`}
                      >
                        {d}
                      </div>
                    </th>
                  );
                })}
                <th className="sticky right-0 z-10 bg-black/80 backdrop-blur-sm p-2 text-xs text-zinc-400 text-center min-w-[72px]">
                  合計
                </th>
              </tr>
            </thead>
            <tbody>
              {staff.map((s) => {
                const summary = staffSummary(s.id);
                return (
                  <tr
                    key={s.id}
                    className="border-b border-white/5 hover:bg-white/[0.03] cursor-pointer transition-colors"
                    onClick={() => setSelectedStaff(s.id)}
                  >
                    <td className="sticky left-0 z-10 bg-black/80 backdrop-blur-sm p-2">
                      <span className="text-xs font-medium text-zinc-200 hover:text-blue-400 transition-colors">
                        {s.name}
                      </span>
                    </td>
                    {(grid[s.id] ?? []).map((cell, i) => {
                      const pattern =
                        cell && cell !== OFF_MARKER ? patternMap.get(cell) : null;
                      const isOff = cell === OFF_MARKER;
                      return (
                        <td key={i} className="p-0.5 text-center">
                          <div
                            className={`w-full py-1 rounded text-[10px] font-bold ${
                              pattern
                                ? `${pattern.bgColor} ${pattern.textColor}`
                                : isOff
                                ? "bg-zinc-800 text-zinc-500"
                                : ""
                            }`}
                          >
                            {pattern ? pattern.label : isOff ? "休" : ""}
                          </div>
                        </td>
                      );
                    })}
                    <td className="sticky right-0 z-10 bg-black/80 backdrop-blur-sm p-2 text-center">
                      <span
                        className={`text-xs font-medium ${
                          summary.hours > 160 ? "text-red-400" : "text-emerald-400"
                        }`}
                      >
                        {summary.workDays}日
                      </span>
                      <span className="text-[10px] text-zinc-400 ml-1">{summary.hours}h</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </GlassCard>
    </div>
  );
}
