"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { GlassCard } from "@/components/ui/glass-card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/shared/status-badge";
import { LoadingSpinner } from "@/components/shared/loading-spinner";
import { EmptyState } from "@/components/shared/empty-state";
import { Plus } from "lucide-react";
import { formatJPY } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import type { ExpenseStatus } from "@/types/database";

interface ExpenseRow {
  id: string;
  expense_date: string;
  amount: number;
  description: string;
  status: ExpenseStatus;
  category: { name: string } | null;
}

export default function StaffExpenseListPage() {
  const [expenses, setExpenses] = useState<ExpenseRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setIsLoading(false);
        return;
      }

      const { data: coreUser } = await supabase
        .from("core_users")
        .select("id")
        .eq("supabase_auth_id", user.id)
        .single();

      if (!coreUser) {
        setIsLoading(false);
        return;
      }

      const { data } = await supabase
        .from("exp_applications")
        .select("id, expense_date, amount, description, status, category:exp_categories(name)")
        .eq("user_id", coreUser.id)
        .order("expense_date", { ascending: false })
        .limit(50);

      setExpenses((data ?? []) as unknown as ExpenseRow[]);
      setIsLoading(false);
    }
    load();
  }, []);

  if (isLoading) return <LoadingSpinner />;

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr + "T00:00:00");
    return `${(d.getMonth() + 1).toString().padStart(2, "0")}.${d.getDate().toString().padStart(2, "0")}`;
  };

  return (
    <>
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-2xl font-light">経費申請</h2>
        <Link href="/staff/expense/new">
          <Button size="sm" className="gap-1">
            <Plus className="w-4 h-4" /> 新規申請
          </Button>
        </Link>
      </div>

      {expenses.length === 0 ? (
        <EmptyState message="経費申請がありません" />
      ) : (
        <div className="space-y-3">
          {expenses.map((exp) => (
            <Link key={exp.id} href={`/staff/expense/${exp.id}`}>
              <GlassCard className="p-4 glass-hover cursor-pointer">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">
                      {exp.category?.name ?? "未分類"}
                    </p>
                    <p className="text-xs text-zinc-500 mt-1">
                      {formatDate(exp.expense_date)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm">{formatJPY(exp.amount)}</p>
                    <div className="mt-1">
                      <StatusBadge status={exp.status} type="expense" />
                    </div>
                  </div>
                </div>
              </GlassCard>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
