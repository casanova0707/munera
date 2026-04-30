"use client";

import { MapPin, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface GpsStatusProps {
  isLoading: boolean;
  isWithin: boolean | null;
  workplaceName?: string;
  distance?: number;
}

export function GpsStatus({
  isLoading,
  isWithin,
  workplaceName,
  distance,
}: GpsStatusProps) {
  return (
    <div className="flex items-center gap-2 text-xs">
      {isLoading ? (
        <>
          <Loader2 className="w-3 h-3 animate-spin text-zinc-500" />
          <span className="text-zinc-500">GPS取得中...</span>
        </>
      ) : isWithin === null ? (
        <>
          <MapPin className="w-3 h-3 text-zinc-500" />
          <span className="text-zinc-500">位置情報未取得</span>
        </>
      ) : (
        <>
          <MapPin
            className={cn(
              "w-3 h-3",
              isWithin ? "text-emerald-500" : "text-red-400"
            )}
          />
          <span className={isWithin ? "text-emerald-500" : "text-red-400"}>
            {workplaceName}
            {distance !== undefined && ` (${Math.round(distance)}m)`}
          </span>
        </>
      )}
    </div>
  );
}
