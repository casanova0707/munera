"use client";

import { useState } from "react";
import { GlassCard } from "@/components/ui/glass-card";
import { Button } from "@/components/ui/button";
import { ReceiptCamera } from "./receipt-camera";

interface ExpenseFormProps {
  categories: { id: string; name: string }[];
  onSubmit: (data: {
    category_id: string;
    expense_date: string;
    amount: number;
    description: string;
    receiptImage?: string;
  }) => void;
  isSubmitting?: boolean;
}

export function ExpenseForm({
  categories,
  onSubmit,
  isSubmitting = false,
}: ExpenseFormProps) {
  const [categoryId, setCategoryId] = useState("");
  const [expenseDate, setExpenseDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [receiptImage, setReceiptImage] = useState<string | undefined>();

  const handleSubmit = () => {
    if (!categoryId || !amount || !description) return;
    onSubmit({
      category_id: categoryId,
      expense_date: expenseDate,
      amount: Number(amount),
      description,
      receiptImage,
    });
  };

  return (
    <div className="space-y-4">
      <ReceiptCamera onCapture={setReceiptImage} capturedImage={receiptImage} />

      <GlassCard className="p-6 space-y-4">
        <div className="flex justify-between items-center border-b border-white/5 pb-3">
          <span className="text-sm text-zinc-400">Type</span>
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="bg-transparent text-right outline-none text-sm cursor-pointer text-white min-w-[120px] min-h-[44px]"
          >
            <option value="" className="bg-black">選択...</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id} className="bg-black">
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex justify-between items-center border-b border-white/5 pb-3">
          <span className="text-sm text-zinc-400">Date</span>
          <input
            type="date"
            value={expenseDate}
            onChange={(e) => setExpenseDate(e.target.value)}
            className="bg-transparent text-right outline-none text-sm"
          />
        </div>

        <div className="flex justify-between items-center border-b border-white/5 pb-3">
          <span className="text-sm text-zinc-400">Amount</span>
          <input
            type="text"
            inputMode="numeric"
            placeholder="¥0"
            value={amount ? `¥${Number(amount).toLocaleString()}` : ""}
            onChange={(e) => {
              const num = e.target.value.replace(/[^0-9]/g, "");
              setAmount(num);
            }}
            className="bg-transparent text-right outline-none text-sm w-32"
          />
        </div>

        <div className="flex justify-between items-center">
          <span className="text-sm text-zinc-400">Description</span>
          <input
            type="text"
            placeholder="内容を入力"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="bg-transparent text-right outline-none text-sm w-48 placeholder:text-zinc-500"
          />
        </div>
      </GlassCard>

      <Button
        size="lg"
        onClick={handleSubmit}
        disabled={isSubmitting || !categoryId || !amount || !description}
      >
        {isSubmitting ? "送信中..." : "Submit"}
      </Button>
    </div>
  );
}
