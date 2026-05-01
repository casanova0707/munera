"use client";

import { useCallback, useRef } from "react";
import { ClockSlider } from "@/components/attendance/clock-slider";
import { StatusCircle } from "@/components/attendance/status-circle";
import { GpsStatus } from "@/components/attendance/gps-status";
import { OffsiteReasonModal } from "@/components/attendance/offsite-reason-modal";
import { GlassCard } from "@/components/ui/glass-card";
import { LoadingSpinner } from "@/components/shared/loading-spinner";
import { useGeolocation } from "@/hooks/use-geolocation";
import { useAttendanceStatus } from "@/hooks/use-attendance-status";
import { useToast } from "@/components/ui/toast";
import { useState } from "react";

export default function StaffAttendancePage() {
  const { status, todayClocks, isLoading, reload } = useAttendanceStatus();
  const { toast } = useToast();
  const [isOffsiteModalOpen, setIsOffsiteModalOpen] = useState(false);
  const [offsiteDistance, setOffsiteDistance] = useState(0);
  const [offsiteWorkplace, setOffsiteWorkplace] = useState("最寄り拠点");
  const { position, isLoading: gpsLoading, getPosition } = useGeolocation();
  const processingRef = useRef(false);

  const handleClockAction = useCallback(async () => {
    if (processingRef.current) return;
    processingRef.current = true;
    try {
      let latitude: number | undefined;
      let longitude: number | undefined;

      try {
        const pos = await getPosition();
        latitude = pos.latitude;
        longitude = pos.longitude;
      } catch {
        // GPS取得失敗でも打刻は続行
      }

      const recordType =
        status === "off_duty"
          ? "clock_in"
          : status === "working"
          ? "clock_out"
          : "break_end";

      const res = await fetch("/api/attendance/punch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          record_type: recordType,
          latitude,
          longitude,
        }),
      });

      const data = await res.json();

      if (data.error === "offsite_reason_required") {
        setOffsiteDistance(data.distance ?? 0);
        setIsOffsiteModalOpen(true);
        return;
      }

      if (data.success) {
        await reload();
        const labels = { clock_in: "出勤", clock_out: "退勤", break_end: "休憩終了" };
        toast(`${labels[recordType]}を記録しました`, "success");
      } else {
        toast(data.error ?? "打刻に失敗しました", "error");
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "不明なエラー";
      toast(`打刻エラー: ${msg}`, "error");
    } finally {
      setTimeout(() => { processingRef.current = false; }, 2000);
    }
  }, [status, getPosition, reload, toast]);

  const handleOffsiteSubmit = async (reason: string) => {
    if (!position) return;

    const recordType = status === "off_duty" ? "clock_in" : "clock_out";

    const res = await fetch("/api/attendance/punch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        record_type: recordType,
        latitude: position.latitude,
        longitude: position.longitude,
        offsite_reason: reason,
      }),
    });

    const data = await res.json();
    if (data.success) {
      setIsOffsiteModalOpen(false);
      await reload();
    }
  };

  const handleBreakStart = async () => {
    try {
      const pos = await getPosition();
      const res = await fetch("/api/attendance/punch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          record_type: "break_start",
          latitude: pos.latitude,
          longitude: pos.longitude,
        }),
      });
      const data = await res.json();
      if (data.success) {
        await reload();
      }
    } catch (err) {
      console.error("Break start failed:", err);
    }
  };

  if (isLoading) {
    return <LoadingSpinner />;
  }

  const sliderLabel =
    status === "off_duty"
      ? "スライドして出勤"
      : status === "working"
      ? "スライドして退勤"
      : "スライドして休憩終了";

  // Show today's clock-in time if available
  const firstClockIn = todayClocks.find((c) => c.record_type === "clock_in");
  const clockInTime = firstClockIn
    ? new Date(firstClockIn.punched_at).toLocaleTimeString("ja-JP", {
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "Asia/Tokyo",
      })
    : null;

  return (
    <>
      <GpsStatus
        isLoading={gpsLoading}
        isWithin={null}
        workplaceName=""
      />

      <StatusCircle status={status} />

      {clockInTime && (
        <p className="text-center text-xs text-zinc-500 mt-2">
          出勤 {clockInTime}
        </p>
      )}

      <div className="mt-8">
        <ClockSlider onSlideComplete={handleClockAction} label={sliderLabel} />
      </div>

      {status === "working" && (
        <div className="mt-6">
          <GlassCard className="p-4">
            <button
              onClick={handleBreakStart}
              className="w-full text-center text-sm text-zinc-400 hover:text-white transition-colors"
            >
              休憩開始
            </button>
          </GlassCard>
        </div>
      )}

      {/* Today's records */}
      {todayClocks.length > 0 && (
        <div className="mt-8">
          <p className="text-[10px] text-zinc-500 tracking-widest mb-3">本日の記録</p>
          <GlassCard className="p-4">
            <div className="space-y-2">
              {todayClocks.map((c) => {
                const time = new Date(c.punched_at).toLocaleTimeString("ja-JP", {
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                  timeZone: "Asia/Tokyo",
                });
                const labels: Record<string, string> = {
                  clock_in: "出勤",
                  clock_out: "退勤",
                  break_start: "休憩開始",
                  break_end: "休憩終了",
                };
                return (
                  <div key={c.id} className="flex justify-between text-sm">
                    <span className="text-zinc-400">{labels[c.record_type]}</span>
                    <span>{time}</span>
                  </div>
                );
              })}
            </div>
          </GlassCard>
        </div>
      )}

      <OffsiteReasonModal
        isOpen={isOffsiteModalOpen}
        distance={offsiteDistance}
        workplaceName={offsiteWorkplace}
        onSubmit={handleOffsiteSubmit}
        onCancel={() => setIsOffsiteModalOpen(false)}
      />
    </>
  );
}
