"use client";

import { StatusCircle } from "@/components/attendance/status-circle";
import { GlassCard } from "@/components/ui/glass-card";
import { LoadingSpinner } from "@/components/shared/loading-spinner";
import { useAttendanceStatus } from "@/hooks/use-attendance-status";
import { formatWorkTime } from "@/lib/attendance/calculator";
import { Clock, TrendingUp, Calendar, ArrowRight } from "lucide-react";
import Link from "next/link";

export default function StaffDashboard() {
  const { status, todayClocks, monthlySummary, isLoading } =
    useAttendanceStatus();

  if (isLoading) {
    return <LoadingSpinner />;
  }

  // Today's clock times
  const firstIn = todayClocks.find((c) => c.record_type === "clock_in");
  const lastOut = [...todayClocks]
    .reverse()
    .find((c) => c.record_type === "clock_out");

  const formatTime = (iso: string) =>
    new Date(iso).toLocaleTimeString("ja-JP", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Asia/Tokyo",
    });

  // Calculate today's elapsed work time
  let todayWorkMin = 0;
  if (firstIn && status === "working") {
    const now = new Date();
    todayWorkMin = Math.floor(
      (now.getTime() - new Date(firstIn.punched_at).getTime()) / 60000
    );
  } else if (firstIn && lastOut) {
    todayWorkMin = Math.floor(
      (new Date(lastOut.punched_at).getTime() -
        new Date(firstIn.punched_at).getTime()) /
        60000
    );
  }

  return (
    <>
      <StatusCircle status={status} />

      {/* Quick action: go to punch page */}
      <Link
        href="/staff/attendance"
        className="mt-6 flex items-center justify-between w-full p-4 rounded-xl border border-zinc-800 hover:border-zinc-600 transition-colors"
      >
        <span className="text-sm">
          {status === "off_duty" ? "出勤する" : status === "working" ? "退勤する" : "休憩を終了する"}
        </span>
        <ArrowRight className="w-4 h-4 text-zinc-500" />
      </Link>

      {/* Today's info */}
      <div className="mt-8">
        <p className="text-[10px] text-zinc-500 tracking-widest mb-3">
          本日
        </p>
        <GlassCard className="p-5">
          <div className="flex items-center gap-3 mb-4">
            <Clock className="w-4 h-4 text-zinc-500" />
            <span className="text-sm text-zinc-400">勤務時間</span>
          </div>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-[10px] text-zinc-600">出勤</p>
              <p className="text-lg font-light mt-1">
                {firstIn ? formatTime(firstIn.punched_at) : "--:--"}
              </p>
            </div>
            <div>
              <p className="text-[10px] text-zinc-600">退勤</p>
              <p className="text-lg font-light mt-1">
                {lastOut ? formatTime(lastOut.punched_at) : "--:--"}
              </p>
            </div>
            <div>
              <p className="text-[10px] text-zinc-600">稼働</p>
              <p className="text-lg font-light mt-1">
                {todayWorkMin > 0 ? formatWorkTime(todayWorkMin) : "--"}
              </p>
            </div>
          </div>
          {todayClocks.length > 0 && (
            <div className="mt-4 pt-3 border-t border-zinc-800">
              <div className="space-y-1">
                {todayClocks.map((c) => {
                  const labels: Record<string, string> = {
                    clock_in: "出勤",
                    clock_out: "退勤",
                    break_start: "休憩開始",
                    break_end: "休憩終了",
                  };
                  return (
                    <div
                      key={c.id}
                      className="flex justify-between text-xs text-zinc-500"
                    >
                      <span>{labels[c.record_type]}</span>
                      <span>{formatTime(c.punched_at)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </GlassCard>
      </div>

      {/* Monthly summary */}
      <div className="mt-6">
        <p className="text-[10px] text-zinc-500 tracking-widest mb-3">
          今月のサマリー
        </p>
        <div className="grid grid-cols-2 gap-4">
          <GlassCard gradient className="p-5">
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="w-3 h-3 text-zinc-600" />
              <p className="text-[10px] text-zinc-500 tracking-widest">
                稼働
              </p>
            </div>
            <p className="text-xl font-light">
              {formatWorkTime(monthlySummary.totalWorkMin)}
            </p>
            <p className="text-[10px] text-zinc-600 mt-1">
              {monthlySummary.daysWorked}日出勤
            </p>
          </GlassCard>
          <GlassCard gradient className="p-5">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-3 h-3 text-zinc-600" />
              <p className="text-[10px] text-zinc-500 tracking-widest">
                残業
              </p>
            </div>
            <p className="text-xl font-light text-orange-200">
              {formatWorkTime(monthlySummary.totalOvertimeMin)}
            </p>
          </GlassCard>
        </div>
      </div>
    </>
  );
}
