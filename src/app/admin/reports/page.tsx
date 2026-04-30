"use client";

import { useState, useEffect } from "react";
import { GlassCard } from "@/components/ui/glass-card";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/shared/loading-spinner";
import { DateRangePicker } from "@/components/shared/date-range-picker";
import { Clock, Receipt, FileText, Download, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type ReportType = "timecard" | "expense";

const reportTypes: { id: ReportType; icon: typeof Clock; title: string; desc: string }[] = [
  { id: "timecard", icon: Clock, title: "タイムカード", desc: "個人別の出退勤記録一覧" },
  { id: "expense", icon: Receipt, title: "交通費精算書", desc: "経費申請の精算書出力" },
];

interface StaffOption {
  id: string;
  name: string;
  department: string | null;
}

interface TimecardRecord {
  work_date: string;
  clock_in: string | null;
  clock_out: string | null;
  work_min: number;
  break_min: number;
  overtime_min: number;
  is_late: boolean;
}

interface TimecardUser {
  user: { full_name: string };
  records: TimecardRecord[];
  totals: { work_min: number; break_min: number; overtime_min: number; late_count: number };
}

interface ExpenseRecord {
  expense_date: string;
  category: string;
  description: string | null;
  amount: number;
  status: string;
}

interface ExpenseUser {
  user: { full_name: string };
  records: ExpenseRecord[];
  total_amount: number;
}

function formatMin(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${h}:${String(m).padStart(2, "0")}`;
}

export default function AdminReportsPage() {
  const today = new Date().toISOString().split("T")[0];
  const monthStart = today.slice(0, 8) + "01";
  const [from, setFrom] = useState(monthStart);
  const [to, setTo] = useState(today);
  const [selected, setSelected] = useState<ReportType>("timecard");
  const [targetDept, setTargetDept] = useState("all");
  const [targetStaff, setTargetStaff] = useState("all");
  const [isGenerating, setIsGenerating] = useState(false);

  const [staffList, setStaffList] = useState<StaffOption[]>([]);
  const [departments, setDepartments] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Preview data
  const [previewData, setPreviewData] = useState<TimecardUser[] | null>(null);
  const [expensePreviewData, setExpensePreviewData] = useState<ExpenseUser[] | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [fetchedReportData, setFetchedReportData] = useState<any>(null);
  const [previewReady, setPreviewReady] = useState(false);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: users } = await supabase
        .from("core_users")
        .select("id, full_name, department")
        .eq("is_active", true)
        .order("full_name");

      const list: StaffOption[] = (users ?? []).map((u) => ({
        id: u.id,
        name: u.full_name,
        department: u.department,
      }));
      setStaffList(list);

      const depts = [...new Set(list.map((u) => u.department).filter(Boolean))] as string[];
      setDepartments(depts.sort());
      setIsLoading(false);
    }
    load();
  }, []);

  const filteredStaff = targetDept === "all"
    ? staffList
    : staffList.filter((s) => s.department === targetDept);

  const handlePreview = async () => {
    setIsGenerating(true);
    setPreviewReady(false);
    try {
      const params = new URLSearchParams({ from, to, user_id: targetStaff, department: targetDept });
      const endpoint = selected === "timecard" ? "/api/reports/timecard" : "/api/reports/expense";
      const res = await fetch(`${endpoint}?${params}`);

      if (!res.ok) {
        console.error("Failed to fetch report data");
        setIsGenerating(false);
        return;
      }

      const data = await res.json();
      setFetchedReportData(data);

      if (selected === "timecard") {
        setPreviewData(data.users);
        setExpensePreviewData(null);
      } else {
        setPreviewData(null);
        setExpensePreviewData(data.users);
      }
      setPreviewReady(true);
    } catch (err) {
      console.error("Preview failed:", err);
    }
    setIsGenerating(false);
  };

  const handleDownload = async () => {
    if (!fetchedReportData) return;
    if (selected === "timecard") {
      const { generateTimecardPDF } = await import("@/lib/pdf/generate-timecard");
      await generateTimecardPDF(fetchedReportData);
    } else {
      const { generateExpensePDF } = await import("@/lib/pdf/generate-expense");
      await generateExpensePDF(fetchedReportData);
    }
  };

  if (isLoading) return <LoadingSpinner />;

  return (
    <div className="grid grid-cols-[180px_200px_1fr] gap-6 h-[calc(100vh-10rem)]">
      {/* 左: 帳票種別選択 */}
      <div className="space-y-3">
        <h3 className="text-sm text-zinc-500 tracking-widest mb-4">帳票種別</h3>
        {reportTypes.map((r) => {
          const Icon = r.icon;
          const isActive = selected === r.id;
          return (
            <GlassCard
              key={r.id}
              className={`p-3 cursor-pointer transition-all ${
                isActive ? "border-white/30 bg-white/[0.06]" : "glass-hover"
              }`}
              onClick={() => { setSelected(r.id); setPreviewData(null); setExpensePreviewData(null); setPreviewReady(false); setFetchedReportData(null); }}
            >
              <div className="flex items-center gap-2">
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? "text-white" : "text-zinc-500"}`} />
                <div>
                  <p className={`text-xs font-medium ${isActive ? "text-white" : "text-zinc-400"}`}>
                    {r.title}
                  </p>
                  <p className="text-[10px] text-zinc-500 mt-0.5">{r.desc}</p>
                </div>
              </div>
            </GlassCard>
          );
        })}
      </div>

      {/* 中央: 条件設定 */}
      <GlassCard className="p-5 space-y-5">
        <h4 className="text-sm font-medium">出力条件</h4>

        <div className="space-y-2">
          <label className="text-xs text-zinc-500 tracking-widest">期間</label>
          <DateRangePicker from={from} to={to} onChange={(f, t) => { setFrom(f); setTo(t); }} />
        </div>

        <div className="space-y-2">
          <label className="text-xs text-zinc-500 tracking-widest">部署</label>
          <select
            value={targetDept}
            onChange={(e) => { setTargetDept(e.target.value); setTargetStaff("all"); }}
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none"
          >
            <option className="bg-black" value="all">全部署</option>
            {departments.map((d) => (
              <option key={d} className="bg-black" value={d}>{d}</option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-xs text-zinc-500 tracking-widest">対象者</label>
          <select
            value={targetStaff}
            onChange={(e) => setTargetStaff(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none"
          >
            <option className="bg-black" value="all">全スタッフ</option>
            {filteredStaff.map((s) => (
              <option key={s.id} className="bg-black" value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>

        <Button size="md" onClick={handlePreview} disabled={isGenerating} className="gap-2 w-full">
          {isGenerating ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <FileText className="w-4 h-4" />
          )}
          {isGenerating ? "読込中..." : "プレビュー"}
        </Button>

        {previewReady && (
          <Button size="md" onClick={handleDownload} className="gap-2 w-full mt-2">
            <Download className="w-4 h-4" />
            PDFダウンロード
          </Button>
        )}
      </GlassCard>

      {/* 右: プレビュー */}
      <GlassCard className="p-6 flex flex-col">
        <h4 className="text-sm font-medium mb-4">プレビュー</h4>
        {selected === "timecard" ? (
          <div className="flex-1 bg-white/[0.02] rounded-xl border border-white/10 p-4 overflow-auto">
            <div className="text-xs space-y-3">
              <div className="text-center mb-4">
                <p className="text-sm font-medium">タイムカード</p>
                <p className="text-zinc-500 mt-1">{from} 〜 {to}</p>
              </div>
              {previewData && previewData.length > 0 ? (
                previewData.map((u, idx) => (
                  <div key={idx} className="mb-6">
                    <p className="text-xs text-zinc-400 mb-2 font-medium">{u.user.full_name}</p>
                    <table className="w-full text-left">
                      <thead>
                        <tr className="border-b border-white/10 text-zinc-500">
                          <th className="py-1.5 pr-2">日付</th>
                          <th className="py-1.5 pr-2">出勤</th>
                          <th className="py-1.5 pr-2">退勤</th>
                          <th className="py-1.5 pr-2">休憩</th>
                          <th className="py-1.5 pr-2">実働</th>
                          <th className="py-1.5">残業</th>
                        </tr>
                      </thead>
                      <tbody className="text-zinc-300">
                        {u.records.map((r, ri) => (
                          <tr key={ri} className="border-b border-white/5">
                            <td className="py-1.5 pr-2">{r.work_date}</td>
                            <td className="py-1.5 pr-2">{r.clock_in ?? "-"}</td>
                            <td className="py-1.5 pr-2">{r.clock_out ?? "-"}</td>
                            <td className="py-1.5 pr-2">{formatMin(r.break_min)}</td>
                            <td className="py-1.5 pr-2">{formatMin(r.work_min)}</td>
                            <td className="py-1.5">{r.overtime_min > 0 ? formatMin(r.overtime_min) : "-"}</td>
                          </tr>
                        ))}
                        <tr className="border-t border-white/20 font-medium text-white">
                          <td className="py-1.5" colSpan={3}>合計</td>
                          <td className="py-1.5 pr-2">{formatMin(u.totals.break_min)}</td>
                          <td className="py-1.5 pr-2">{formatMin(u.totals.work_min)}</td>
                          <td className="py-1.5">{formatMin(u.totals.overtime_min)}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                ))
              ) : (
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-white/10 text-zinc-500">
                      <th className="py-1.5 pr-2">日付</th>
                      <th className="py-1.5 pr-2">出勤</th>
                      <th className="py-1.5 pr-2">退勤</th>
                      <th className="py-1.5 pr-2">休憩</th>
                      <th className="py-1.5">実働</th>
                    </tr>
                  </thead>
                  <tbody className="text-zinc-300">
                    <tr><td colSpan={5} className="py-4 text-center text-zinc-500">PDF生成後にプレビュー表示</td></tr>
                  </tbody>
                </table>
              )}
            </div>
          </div>
        ) : (
          <div className="flex-1 bg-white/[0.02] rounded-xl border border-white/10 p-4 overflow-auto">
            <div className="text-xs space-y-3">
              <div className="text-center mb-4">
                <p className="text-sm font-medium">交通費精算書</p>
                <p className="text-zinc-500 mt-1">{from} 〜 {to}</p>
              </div>
              {expensePreviewData && expensePreviewData.length > 0 ? (
                expensePreviewData.map((u, idx) => (
                  <div key={idx} className="mb-6">
                    <p className="text-xs text-zinc-400 mb-2 font-medium">{u.user.full_name}</p>
                    <table className="w-full text-left">
                      <thead>
                        <tr className="border-b border-white/10 text-zinc-500">
                          <th className="py-1.5 pr-2">日付</th>
                          <th className="py-1.5 pr-2">カテゴリ</th>
                          <th className="py-1.5 pr-2">内容</th>
                          <th className="py-1.5 pr-2 text-right">金額</th>
                          <th className="py-1.5">状態</th>
                        </tr>
                      </thead>
                      <tbody className="text-zinc-300">
                        {u.records.map((r, ri) => (
                          <tr key={ri} className="border-b border-white/5">
                            <td className="py-1.5 pr-2">{r.expense_date}</td>
                            <td className="py-1.5 pr-2">{r.category}</td>
                            <td className="py-1.5 pr-2">{r.description ?? "-"}</td>
                            <td className="py-1.5 pr-2 text-right">¥{r.amount.toLocaleString()}</td>
                            <td className="py-1.5">{r.status}</td>
                          </tr>
                        ))}
                        <tr className="border-t border-white/20 font-medium text-white">
                          <td className="py-1.5" colSpan={3}>合計</td>
                          <td className="py-1.5 pr-2 text-right">¥{u.total_amount.toLocaleString()}</td>
                          <td></td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                ))
              ) : (
                <div className="flex items-center justify-center py-12 text-zinc-500">
                  <div className="text-center">
                    <FileText className="w-10 h-10 mx-auto mb-3" />
                    <p className="text-sm">交通費精算書</p>
                    <p className="text-xs mt-1">プレビューボタンで確認</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </GlassCard>
    </div>
  );
}
