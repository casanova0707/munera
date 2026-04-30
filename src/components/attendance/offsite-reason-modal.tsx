"use client";

import { useState } from "react";
import { GlassCard } from "@/components/ui/glass-card";
import { Button } from "@/components/ui/button";
import { MapPinOff } from "lucide-react";

interface OffsiteReasonModalProps {
  isOpen: boolean;
  distance: number;
  workplaceName: string;
  onSubmit: (reason: string) => void;
  onCancel: () => void;
}

export function OffsiteReasonModal({
  isOpen,
  distance,
  workplaceName,
  onSubmit,
  onCancel,
}: OffsiteReasonModalProps) {
  const [reason, setReason] = useState("");

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
      <GlassCard className="w-full max-w-sm p-6 space-y-6">
        <div className="flex items-center gap-3 text-red-400">
          <MapPinOff className="w-6 h-6" />
          <h3 className="text-lg font-medium">場所相違検知</h3>
        </div>

        <div className="space-y-2 text-sm">
          <p className="text-zinc-400">
            最寄り拠点: <span className="text-white">{workplaceName}</span>
          </p>
          <p className="text-zinc-400">
            距離: <span className="text-red-400">{Math.round(distance)}m</span>
          </p>
        </div>

        <div className="space-y-2">
          <label className="text-xs text-zinc-500 uppercase tracking-widest">
            理由を入力してください
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full h-24 bg-white/5 border border-white/10 rounded-xl p-3 text-sm text-white outline-none resize-none placeholder:text-zinc-500 focus:border-white/20"
            placeholder="例: 客先での打ち合わせのため"
          />
        </div>

        <div className="flex gap-3">
          <Button variant="ghost" size="md" onClick={onCancel} className="flex-1">
            キャンセル
          </Button>
          <Button
            size="md"
            onClick={() => onSubmit(reason)}
            disabled={!reason.trim()}
            className="flex-1"
          >
            打刻する
          </Button>
        </div>
      </GlassCard>
    </div>
  );
}
