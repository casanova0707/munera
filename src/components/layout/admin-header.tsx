"use client";

import { usePathname } from "next/navigation";

const pageTitles: Record<string, string> = {
  "/admin/dashboard": "ダッシュボード",
  "/admin/attendance": "勤怠一覧",
  "/admin/attendance/daily": "日次明細",
  "/admin/attendance/overtime": "残業承認",
  "/admin/users": "スタッフ管理",
  "/admin/expense": "経費承認",
  "/admin/locations": "拠点管理",
  "/admin/shifts": "シフト管理",
  "/admin/reports": "帳票・レポート",
  "/admin/settings": "設定",
  "/admin/audit": "監査ログ",
};

export function AdminHeader() {
  const pathname = usePathname();
  const title = pageTitles[pathname ?? ""] ?? "MUNERA";

  return (
    <header className="h-20 border-b border-white/5 flex items-center justify-between px-10">
      <h2 className="text-lg font-medium">{title}</h2>
      <div className="flex items-center gap-4 text-xs text-zinc-400">
        <span>
          Status:{" "}
          <span className="text-green-500">正常</span>
        </span>
        <div className="w-8 h-8 rounded-full bg-zinc-800" />
      </div>
    </header>
  );
}
