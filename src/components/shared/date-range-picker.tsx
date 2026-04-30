"use client";

import { useState } from "react";

interface DateRangePickerProps {
  from: string;
  to: string;
  onChange: (from: string, to: string) => void;
}

export function DateRangePicker({ from, to, onChange }: DateRangePickerProps) {
  const [startDate, setStartDate] = useState(from);
  const [endDate, setEndDate] = useState(to);

  const handleChange = (type: "from" | "to", value: string) => {
    if (type === "from") {
      setStartDate(value);
      onChange(value, endDate);
    } else {
      setEndDate(value);
      onChange(startDate, value);
    }
  };

  return (
    <div className="flex flex-col items-center gap-1 text-sm">
      <input
        type="date"
        value={startDate}
        onChange={(e) => handleChange("from", e.target.value)}
        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white outline-none"
      />
      <span className="text-xs text-zinc-500">〜</span>
      <input
        type="date"
        value={endDate}
        onChange={(e) => handleChange("to", e.target.value)}
        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white outline-none"
      />
    </div>
  );
}
