"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { DataTable } from "@/components/shared/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { LoadingSpinner } from "@/components/shared/loading-spinner";
import { formatJPY } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import type { ExpenseStatus } from "@/types/database";

interface ExpenseRow extends Record<string, unknown> {
  id: string;
  name: string;
  date: string;
  category: string;
  amount: number;
  status: ExpenseStatus;
}

const columns = [
  { key: "name", header: "申請者" },
  { key: "date", header: "日付" },
  { key: "category", header: "カテゴリ" },
  {
    key: "amount",
    header: "金額",
    render: (row: Record<string, unknown>) => formatJPY(row.amount as number),
  },
  {
    key: "status",
    header: "状態",
    render: (row: Record<string, unknown>) => (
      <StatusBadge status={row.status as ExpenseStatus} type="expense" />
    ),
  },
];

export default function AdminExpensePage() {
  const router = useRouter();
  const [data, setData] = useState<ExpenseRow[]>([]);
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

      const { data: expenses } = await supabase
        .from("exp_applications")
        .select("id, expense_date, amount, description, status, user:core_users(full_name), category:exp_categories(name)")
        .order("expense_date", { ascending: false })
        .limit(100);

      const rows: ExpenseRow[] = (expenses ?? []).map((e: Record<string, unknown>) => {
        const userObj = e.user as { full_name: string } | null;
        const catObj = e.category as { name: string } | null;
        return {
          id: e.id as string,
          name: userObj?.full_name ?? "不明",
          date: (e.expense_date as string),
          category: catObj?.name ?? "未分類",
          amount: e.amount as number,
          status: e.status as ExpenseStatus,
        };
      });

      setData(rows);
      setIsLoading(false);
    }
    load();
  }, []);

  if (isLoading) return <LoadingSpinner />;

  return (
    <>
      <div className="flex justify-between items-center mb-8">
        <h3 className="text-sm text-zinc-500 uppercase tracking-widest">
          経費承認
        </h3>
      </div>
      <DataTable
        columns={columns}
        data={data}
        onRowClick={(row) => router.push(`/admin/expense/${row.id}`)}
      />
    </>
  );
}
