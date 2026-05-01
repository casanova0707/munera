"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ExpenseForm } from "@/components/expense/expense-form";
import { LoadingSpinner } from "@/components/shared/loading-spinner";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/ui/toast";

export default function NewExpensePage() {
  const router = useRouter();
  const { toast } = useToast();
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    async function loadCategories() {
      const supabase = createClient();
      const { data } = await supabase
        .from("exp_categories")
        .select("id, name")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });

      setCategories(data ?? []);
      setIsLoading(false);
    }
    loadCategories();
  }, []);

  const handleSubmit = async (data: {
    category_id: string;
    expense_date: string;
    amount: number;
    description: string;
    receiptImage?: string;
  }) => {
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/expense/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result = await res.json();

      if (res.ok && result.success) {
        toast("経費を申請しました", "success");
        router.push("/staff/expense");
      } else {
        const errMsg = typeof result.error === "string" ? result.error : JSON.stringify(result.error);
        toast(`申請エラー: ${errMsg}`, "error");
      }
    } catch (err) {
      toast("経費申請に失敗しました", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) return <LoadingSpinner />;

  return (
    <>
      <Link
        href="/staff/expense"
        className="inline-flex items-center gap-1 text-xs text-zinc-500 hover:text-white transition-colors mb-6"
      >
        <ArrowLeft className="w-3 h-3" />
        戻る
      </Link>

      <h2 className="text-2xl font-light mb-8">経費申請</h2>

      <ExpenseForm
        categories={categories}
        onSubmit={handleSubmit}
        isSubmitting={isSubmitting}
      />
    </>
  );
}
