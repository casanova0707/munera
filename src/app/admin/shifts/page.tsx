"use client";

import { useState, useCallback, useEffect } from "react";
import { GlassCard } from "@/components/ui/glass-card";
import { LoadingSpinner } from "@/components/shared/loading-spinner";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

// ── Types ──
interface ShiftPattern {
  id: string;
  name: string;
  color: string;
  dotColor: string;
  textColor: string;
  hoursPerDay: number;
}

interface StaffMember {
  id: string;
  name: string;
}

type CellValue = string | null; // shift_id or null

const OFF_MARKER = "__off__";
const DOW_LABELS = ["日", "月", "火", "水", "木", "金", "土"];

// Color palette for shifts
const COLORS = [
  { color: "bg-blue-500", dotColor: "bg-blue-400", textColor: "text-blue-400" },
  { color: "bg-emerald-500", dotColor: "bg-emerald-400", textColor: "text-emerald-400" },
  { color: "bg-purple-500", dotColor: "bg-purple-400", textColor: "text-purple-400" },
  { color: "bg-amber-500", dotColor: "bg-amber-400", textColor: "text-amber-400" },
  { color: "bg-cyan-500", dotColor: "bg-cyan-400", textColor: "text-cyan-400" },
];

const OFF_STYLE = { color: "bg-zinc-700", dotColor: "bg-zinc-600", textColor: "text-zinc-600" };

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
  const [editingCell, setEditingCell] = useState<{ staffId: string; day: number } | null>(null);
  const [popupPos, setPopupPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [selectedStaff, setSelectedStaff] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const patternMap = new Map(patterns.map((p) => [p.id, p]));

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
      if (hours < 0) hours += 24; // night shift
      const c = COLORS[i % COLORS.length];
      return { id: s.id, name: s.name, hoursPerDay: Math.round(hours * 10) / 10, ...c };
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
    setSelectedStaff(null);
  };
  const nextMonth = () => {
    if (month === 11) { setYear(year + 1); setMonth(0); }
    else { setMonth(month + 1); }
    setSelectedStaff(null);
  };

  // ── Cell click ──
  const handleCellClick = useCallback((staffId: string, dayIndex: number, e: React.MouseEvent) => {
    setEditingCell((prev) =>
      prev?.staffId === staffId && prev?.day === dayIndex ? null : { staffId, day: dayIndex }
    );
    setPopupPos({ x: e.clientX, y: e.clientY });
  }, []);

  // ── Shift select ──
  const handleShiftSelect = useCallback(async (value: CellValue) => {
    if (!editingCell) return;
    const { staffId, day } = editingCell;

    setGrid((prev) => {
      const updated = { ...prev };
      updated[staffId] = [...(updated[staffId] ?? [])];
      updated[staffId][day] = value;
      return updated;
    });
    setEditingCell(null);

    // Save to DB
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: coreUser } = await supabase
      .from("core_users")
      .select("tenant_id")
      .eq("supabase_auth_id", user.id)
      .single();
    if (!coreUser) return;

    const workDate = `${year}-${(month + 1).toString().padStart(2, "0")}-${(day + 1).toString().padStart(2, "0")}`;

    if (value === null) {
      await supabase
        .from("attn_shift_assignments")
        .delete()
        .eq("user_id", staffId)
        .eq("work_date", workDate);
    } else {
      await supabase
        .from("attn_shift_assignments")
        .upsert({
          tenant_id: coreUser.tenant_id,
          user_id: staffId,
          shift_id: value === OFF_MARKER ? null : value,
          work_date: workDate,
          is_day_off: value === OFF_MARKER,
        }, { onConflict: "user_id,work_date" });
    }
  }, [editingCell, year, month]);

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

  const staffNames = staff.reduce((map, s) => { map.set(s.id, s.name); return map; }, new Map<string, string>());

  const dailyTotals = days.map((_, i) =>
    staff.reduce((sum, s) => {
      const cell = grid[s.id]?.[i];
      return sum + (cell && cell !== OFF_MARKER ? 1 : 0);
    }, 0)
  );

  const totalPlanned = staff.reduce((sum, s) => sum + staffSummary(s.id).hours, 0);

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

  if (isLoading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <GlassCard className="inline-flex items-center px-4 py-2 gap-1">
            <span className="text-xs text-zinc-500 mr-1">予定</span>
            <span className="text-lg font-medium text-emerald-400">{totalPlanned}</span>
            <span className="text-xs text-zinc-500">h</span>
          </GlassCard>
          <GlassCard className="inline-flex items-center px-4 py-2 gap-1">
            <span className="text-xs text-zinc-500 mr-1">人数</span>
            <span className="text-lg font-medium">{staff.length}</span>
            <span className="text-xs text-zinc-500">名</span>
          </GlassCard>
          <div className="flex items-center gap-4 ml-6">
            {patterns.map((p) => (
              <div key={p.id} className="flex items-center gap-1.5">
                <span className={`w-2.5 h-2.5 rounded-full ${p.dotColor}`} />
                <span className="text-xs text-zinc-500">{p.name}</span>
              </div>
            ))}
            <div className="flex items-center gap-1.5">
              <span className={`w-2.5 h-2.5 rounded-full ${OFF_STYLE.dotColor}`} />
              <span className="text-xs text-zinc-500">休</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <button onClick={prevMonth} className="p-1.5 rounded-lg hover:bg-white/5 transition-colors">
            <ChevronLeft className="w-4 h-4 text-zinc-400" />
          </button>
          <span className="text-sm font-medium min-w-[100px] text-center">
            {year}年{month + 1}月
          </span>
          <button onClick={nextMonth} className="p-1.5 rounded-lg hover:bg-white/5 transition-colors">
            <ChevronRight className="w-4 h-4 text-zinc-400" />
          </button>
        </div>
      </div>

      {/* Grid */}
      <GlassCard className="overflow-x-auto">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="border-b border-white/10">
              <th className="sticky left-0 z-10 bg-black/80 backdrop-blur-sm text-left p-2 text-[10px] text-zinc-500 w-28 min-w-[112px]">日別合計</th>
              {days.map((d, i) => (
                <th key={d} className="p-1 text-center min-w-[32px]">
                  <span className={`text-[10px] font-medium ${dailyTotals[i] === 0 ? "text-zinc-700" : dailyTotals[i] >= staff.length * 0.8 ? "text-emerald-400" : "text-zinc-400"}`}>
                    {dailyTotals[i]}
                  </span>
                </th>
              ))}
              <th className="sticky right-0 z-10 bg-black/80 backdrop-blur-sm p-2 min-w-[72px]" />
            </tr>
            <tr className="border-b border-white/10">
              <th className="sticky left-0 z-10 bg-black/80 backdrop-blur-sm text-left p-2 text-[10px] text-zinc-500 w-28 min-w-[112px]">スタッフ</th>
              {days.map((d) => {
                const dow = new Date(year, month, d).getDay();
                const isSunday = dow === 0;
                const isWeekend = dow === 0 || dow === 6;
                return (
                  <th key={d} className="p-1 text-center min-w-[32px]">
                    <div className={`text-[10px] ${isSunday ? "text-red-400" : isWeekend ? "text-blue-400" : "text-zinc-600"}`}>{DOW_LABELS[dow]}</div>
                    <div className={`text-xs font-medium ${isSunday ? "text-red-400" : isWeekend ? "text-blue-400" : "text-zinc-300"}`}>{d}</div>
                  </th>
                );
              })}
              <th className="sticky right-0 z-10 bg-black/80 backdrop-blur-sm p-2 text-[10px] text-zinc-500 text-center min-w-[72px]">合計</th>
            </tr>
          </thead>
          <tbody>
            {staff.map((s) => {
              const summary = staffSummary(s.id);
              const isSelected = selectedStaff === s.id;
              return (
                <tr key={s.id} className={`border-b border-white/5 transition-colors ${isSelected ? "bg-white/[0.04]" : "hover:bg-white/[0.02]"}`}>
                  <td className="sticky left-0 z-10 bg-black/80 backdrop-blur-sm p-2">
                    <button
                      onClick={() => setSelectedStaff(isSelected ? null : s.id)}
                      className={`text-xs font-medium text-left truncate w-full transition-colors ${isSelected ? "text-blue-400" : "hover:text-blue-400"}`}
                    >
                      {s.name}
                    </button>
                  </td>
                  {(grid[s.id] ?? []).map((cell, i) => {
                    const pattern = cell && cell !== OFF_MARKER ? patternMap.get(cell) : null;
                    const isOff = cell === OFF_MARKER;
                    const isEditing = editingCell?.staffId === s.id && editingCell?.day === i;
                    return (
                      <td key={i} className="p-1 text-center relative">
                        <button
                          onClick={(e) => handleCellClick(s.id, i, e)}
                          className="w-full flex items-center justify-center py-1 rounded hover:bg-white/10 transition-colors"
                        >
                          {pattern ? (
                            <span className={`w-3 h-3 rounded-full ${pattern.dotColor}`} />
                          ) : isOff ? (
                            <span className={`w-3 h-3 rounded-full ${OFF_STYLE.dotColor} opacity-30`} />
                          ) : (
                            <span className="w-3 h-3" />
                          )}
                        </button>
                        {isEditing && (
                          <div className="fixed z-50" style={{ left: popupPos.x - 28, top: popupPos.y + 10 }}>
                            <div className="bg-zinc-900 border border-white/10 rounded-xl p-1.5 shadow-2xl flex flex-col gap-0.5 min-w-[56px]">
                              {patterns.map((p) => (
                                <button
                                  key={p.id}
                                  onClick={() => handleShiftSelect(p.id)}
                                  className={`flex items-center gap-1.5 px-2 py-1 rounded-lg hover:bg-white/10 text-[10px] ${p.textColor} transition-colors`}
                                >
                                  <span className={`w-2 h-2 rounded-full ${p.dotColor}`} />
                                  {p.name}
                                </button>
                              ))}
                              <button
                                onClick={() => handleShiftSelect(OFF_MARKER)}
                                className={`flex items-center gap-1.5 px-2 py-1 rounded-lg hover:bg-white/10 text-[10px] ${OFF_STYLE.textColor} transition-colors`}
                              >
                                <span className={`w-2 h-2 rounded-full ${OFF_STYLE.dotColor}`} />
                                休
                              </button>
                              {cell && (
                                <button
                                  onClick={() => handleShiftSelect(null)}
                                  className="flex items-center gap-1.5 px-2 py-1 rounded-lg hover:bg-white/10 text-[10px] text-zinc-500 transition-colors border-t border-white/5 mt-0.5 pt-1"
                                >
                                  クリア
                                </button>
                              )}
                            </div>
                          </div>
                        )}
                      </td>
                    );
                  })}
                  <td className="sticky right-0 z-10 bg-black/80 backdrop-blur-sm p-2 text-center">
                    <span className={`text-xs font-medium ${summary.hours > 160 ? "text-red-400" : "text-emerald-400"}`}>{summary.workDays}日</span>
                    <span className="text-[10px] text-zinc-500 ml-1">{summary.hours}h</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </GlassCard>

      {/* Staff detail panel */}
      {selectedStaff && (
        <GlassCard className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium">
              {staffNames.get(selectedStaff)}
              <span className="text-zinc-500 ml-2 font-normal">{year}年{month + 1}月 月間サマリー</span>
            </h3>
            <button onClick={() => setSelectedStaff(null)} className="p-1 rounded-lg hover:bg-white/10 transition-colors">
              <X className="w-4 h-4 text-zinc-500" />
            </button>
          </div>

          <div className="grid grid-cols-4 gap-4 mb-6">
            {(() => {
              const s = staffSummary(selectedStaff);
              return (
                <>
                  <div className="text-center">
                    <p className="text-[10px] text-zinc-500 uppercase tracking-widest">出勤日数</p>
                    <p className="text-2xl font-light mt-1">{s.workDays}<span className="text-sm text-zinc-500">日</span></p>
                  </div>
                  <div className="text-center">
                    <p className="text-[10px] text-zinc-500 uppercase tracking-widest">月間時間</p>
                    <p className="text-2xl font-light mt-1">{s.hours}<span className="text-sm text-zinc-500">h</span></p>
                  </div>
                  <div className="text-center">
                    <p className="text-[10px] text-zinc-500 uppercase tracking-widest">目安との差</p>
                    <p className={`text-2xl font-light mt-1 ${s.hours - 160 > 0 ? "text-red-400" : s.hours - 160 === 0 ? "text-emerald-400" : "text-yellow-400"}`}>
                      {s.hours - 160 >= 0 ? "+" : ""}{s.hours - 160}<span className="text-sm text-zinc-500">h</span>
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-[10px] text-zinc-500 uppercase tracking-widest">休日数</p>
                    <p className="text-2xl font-light mt-1">{s.totalDays - s.workDays}<span className="text-sm text-zinc-500">日</span></p>
                  </div>
                </>
              );
            })()}
          </div>

          <div>
            <p className="text-[10px] text-zinc-500 uppercase tracking-widest mb-3">週別内訳</p>
            <div className="grid grid-cols-5 gap-3">
              {getWeeklySummary(selectedStaff).map((w) => (
                <GlassCard key={w.weekNum} className="p-3 text-center">
                  <p className="text-[10px] text-zinc-500">W{w.weekNum}</p>
                  <p className={`text-lg font-light mt-0.5 ${w.hours > 40 ? "text-red-400" : "text-white"}`}>
                    {w.hours}<span className="text-[10px] text-zinc-500">h</span>
                  </p>
                  <p className="text-[10px] text-zinc-500 mt-0.5">{w.days}日</p>
                </GlassCard>
              ))}
            </div>
            {getWeeklySummary(selectedStaff).some((w) => w.hours > 40) && (
              <p className="text-xs text-red-400 mt-3">⚠ 週40時間を超過している週があります</p>
            )}
          </div>
        </GlassCard>
      )}
    </div>
  );
}
