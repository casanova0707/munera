"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { GlassCard } from "@/components/ui/glass-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { LoadingSpinner } from "@/components/shared/loading-spinner";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { formatJPY } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import type { ExpenseStatus } from "@/types/database";

interface ExpenseDetail {
  id: string;
  expense_date: string;
  amount: number;
  description: string;
  status: ExpenseStatus;
  submitted_at: string | null;
  category: { name: string } | null;
}

export default function ExpenseDetailPage() {
  const params = useParams();
  const [expense, setExpense] = useState<ExpenseDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data } = await supabase
        .from("exp_applications")
        .select("id, expense_date, amount, description, status, submitted_at, category:exp_categories(name)")
        .eq("id", params.id as string)
        .single();

      setExpense(data as unknown as ExpenseDetail | null);
      setIsLoading(false);
    }
    load();
  }, [params.id]);

  if (isLoading) return <LoadingSpinner />;

  if (!expense) {
    return (
      <>
        <Link
          href="/staff/expense"
          className="inline-flex items-center gap-1 text-xs text-zinc-500 hover:text-white transition-colors mb-6"
        >
          <ArrowLeft className="w-3 h-3" />
          戻る
        </Link>
        <p className="text-zinc-500 text-sm">申請が見つかりません</p>
      </>
    );
  }

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr + "T00:00:00");
    return `${d.getFullYear()}.${(d.getMonth() + 1).toString().padStart(2, "0")}.${d.getDate().toString().padStart(2, "0")}`;
  };

  return (
    <>
      <Link
        href="/staff/expense"
        className="inline-flex items-center gap-1 text-xs text-zinc-500 hover:text-white transition-colors mb-6"
      >
        <ArrowLeft className="w-3 h-3" />
        戻る
      </Link>

      <h2 className="text-2xl font-light mb-8">申請詳細</h2>

      <GlassCard className="p-6 space-y-4">
        <div className="flex justify-between items-center">
          <span className="text-sm text-zinc-400">ステータス</span>
          <StatusBadge status={expense.status} type="expense" />
        </div>
        <div className="flex justify-between items-center border-t border-white/5 pt-4">
          <span className="text-sm text-zinc-400">カテゴリ</span>
          <span className="text-sm">{expense.category?.name ?? "未分類"}</span>
        </div>
        <div className="flex justify-between items-center border-t border-white/5 pt-4">
          <span className="text-sm text-zinc-400">日付</span>
          <span className="text-sm">{formatDate(expense.expense_date)}</span>
        </div>
        <div className="flex justify-between items-center border-t border-white/5 pt-4">
          <span className="text-sm text-zinc-400">金額</span>
          <span className="text-sm font-medium">{formatJPY(expense.amount)}</span>
        </div>
        <div className="flex justify-between items-center border-t border-white/5 pt-4">
          <span className="text-sm text-zinc-400">内容</span>
          <span className="text-sm">{expense.description}</span>
        </div>
        {expense.submitted_at && (
          <div className="flex justify-between items-center border-t border-white/5 pt-4">
            <span className="text-sm text-zinc-400">提出日時</span>
            <span className="text-xs text-zinc-500">
              {new Date(expense.submitted_at).toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" })}
            </span>
          </div>
        )}
      </GlassCard>
    </>
  );
}
