"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { GlassCard } from "@/components/ui/glass-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { LoadingSpinner } from "@/components/shared/loading-spinner";
import { ApprovalActions } from "@/components/expense/approval-actions";
import { ArrowLeft, ImageIcon } from "lucide-react";
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
  applicant: string;
  department: string;
  category: string;
  receiptUrl: string | null;
}

export default function AdminExpenseDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [expense, setExpense] = useState<ExpenseDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data } = await supabase
        .from("exp_applications")
        .select("id, expense_date, amount, description, status, submitted_at, user:core_users(full_name, department), category:exp_categories(name)")
        .eq("id", params.id as string)
        .single();

      if (data) {
        const userObj = data.user as unknown as { full_name: string; department: string | null } | null;
        const catObj = data.category as unknown as { name: string } | null;

        // Check for receipt
        const { data: receipts } = await supabase
          .from("exp_receipt_images")
          .select("image_url")
          .eq("application_id", data.id)
          .limit(1);

        setExpense({
          id: data.id,
          expense_date: data.expense_date,
          amount: data.amount,
          description: data.description,
          status: data.status as ExpenseStatus,
          submitted_at: data.submitted_at,
          applicant: userObj?.full_name ?? "不明",
          department: userObj?.department ?? "",
          category: catObj?.name ?? "未分類",
          receiptUrl: receipts?.[0]?.image_url ?? null,
        });
      }
      setIsLoading(false);
    }
    load();
  }, [params.id]);

  const handleAction = async (action: "approved" | "rejected" | "on_hold", comment?: string) => {
    const res = await fetch("/api/expense/approve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        application_id: params.id,
        action,
        comment,
      }),
    });

    if (res.ok) {
      router.push("/admin/expense");
    }
  };

  if (isLoading) return <LoadingSpinner />;

  if (!expense) {
    return (
      <>
        <Link
          href="/admin/expense"
          className="inline-flex items-center gap-1 text-xs text-zinc-500 hover:text-white transition-colors mb-6"
        >
          <ArrowLeft className="w-3 h-3" />
          一覧に戻る
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
        href="/admin/expense"
        className="inline-flex items-center gap-1 text-xs text-zinc-500 hover:text-white transition-colors mb-6"
      >
        <ArrowLeft className="w-3 h-3" />
        一覧に戻る
      </Link>

      <div className="grid grid-cols-[240px_1fr_280px] gap-6 h-[calc(100vh-12rem)]">
        {/* 左: 経費詳細 */}
        <GlassCard className="p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium">経費詳細</h3>
            <StatusBadge status={expense.status} type="expense" />
          </div>

          <div className="space-y-3 text-sm">
            <div>
              <p className="text-xs text-zinc-500">申請者</p>
              <p className="mt-0.5">{expense.applicant}</p>
            </div>
            <div>
              <p className="text-xs text-zinc-500">部署</p>
              <p className="mt-0.5">{expense.department || "未設定"}</p>
            </div>
            <div>
              <p className="text-xs text-zinc-500">カテゴリ</p>
              <p className="mt-0.5">{expense.category}</p>
            </div>
            <div>
              <p className="text-xs text-zinc-500">日付</p>
              <p className="mt-0.5">{formatDate(expense.expense_date)}</p>
            </div>
            <div>
              <p className="text-xs text-zinc-500">金額</p>
              <p className="mt-0.5 text-base font-medium">{formatJPY(expense.amount)}</p>
            </div>
            {expense.submitted_at && (
              <div>
                <p className="text-xs text-zinc-500">申請日時</p>
                <p className="mt-0.5">
                  {new Date(expense.submitted_at).toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" })}
                </p>
              </div>
            )}
            <div className="border-t border-white/5 pt-3">
              <p className="text-xs text-zinc-500">内容</p>
              <p className="mt-0.5">{expense.description}</p>
            </div>
          </div>
        </GlassCard>

        {/* 中央: 領収書 */}
        <GlassCard className="p-6 flex flex-col">
          <h3 className="text-sm font-medium mb-4">領収書</h3>
          {expense.receiptUrl ? (
            <div className="flex-1 bg-white/[0.02] rounded-xl overflow-hidden border border-white/10">
              <img
                src={expense.receiptUrl}
                alt="領収書"
                className="w-full h-full object-contain"
              />
            </div>
          ) : (
            <div className="flex-1 bg-white/[0.02] rounded-xl flex items-center justify-center border border-dashed border-white/10">
              <div className="text-center text-zinc-500">
                <ImageIcon className="w-12 h-12 mx-auto mb-3" />
                <p className="text-sm">領収書なし</p>
              </div>
            </div>
          )}
        </GlassCard>

        {/* 右: 承認アクション */}
        <GlassCard className="p-5">
          <h3 className="text-xs text-zinc-500 uppercase tracking-widest mb-4">
            承認アクション
          </h3>
          {expense.status === "submitted" ? (
            <ApprovalActions
              onApprove={(comment) => handleAction("approved", comment)}
              onReject={(comment) => handleAction("rejected", comment)}
              onHold={(comment) => handleAction("on_hold", comment)}
            />
          ) : (
            <p className="text-sm text-zinc-500">
              この申請は既に処理済みです（{expense.status}）
            </p>
          )}
        </GlassCard>
      </div>
    </>
  );
}
