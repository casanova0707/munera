"use client";

interface StatusCircleProps {
  status: "off_duty" | "working" | "on_break";
}

const statusLabels: Record<StatusCircleProps["status"], string> = {
  off_duty: "退勤中",
  working: "勤務中",
  on_break: "休憩中",
};

export function StatusCircle({ status }: StatusCircleProps) {
  return (
    <div className="relative flex justify-center py-12">
      <div className="w-64 h-64 rounded-full border border-white/5 flex flex-col items-center justify-center relative">
        <div className="absolute inset-0 rounded-full border-t-2 border-white/30 rotate-45" />
        <span className="text-xs text-zinc-500 tracking-widest">
          現在のステータス
        </span>
        <span className="text-4xl font-light mt-2 tracking-tighter">
          {statusLabels[status]}
        </span>
      </div>
    </div>
  );
}
