"use client";

import { useState } from "react";
import { Check, X, Pause } from "lucide-react";

interface ApprovalActionsProps {
  onApprove: (comment: string) => void;
  onReject: (comment: string) => void;
  onHold: (comment: string) => void;
  isProcessing?: boolean;
}

export function ApprovalActions({
  onApprove,
  onReject,
  onHold,
  isProcessing = false,
}: ApprovalActionsProps) {
  const [comment, setComment] = useState("");

  return (
    <div className="space-y-4">
      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="コメント（任意）"
        className="w-full h-20 bg-white/5 border border-white/10 rounded-xl p-3 text-sm text-white outline-none resize-none placeholder:text-zinc-500 focus:border-white/20"
      />
      <div className="flex flex-col gap-2">
        <button
          onClick={() => onApprove(comment)}
          disabled={isProcessing}
          className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-sm font-medium bg-emerald-600 hover:bg-emerald-700 text-white transition-colors disabled:opacity-50"
        >
          <Check className="w-4 h-4" /> 承認
        </button>
        <button
          onClick={() => onHold(comment)}
          disabled={isProcessing}
          className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-sm font-medium bg-yellow-600 hover:bg-yellow-700 text-white transition-colors disabled:opacity-50"
        >
          <Pause className="w-4 h-4" /> 保留
        </button>
        <button
          onClick={() => onReject(comment)}
          disabled={isProcessing}
          className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-sm font-medium bg-red-600 hover:bg-red-700 text-white transition-colors disabled:opacity-50"
        >
          <X className="w-4 h-4" /> 却下
        </button>
      </div>
    </div>
  );
}
