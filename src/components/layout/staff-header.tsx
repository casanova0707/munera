"use client";

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "おはようございます";
  if (hour < 18) return "お疲れさまです";
  return "お疲れさまでした";
}

export function StaffHeader() {
  const now = new Date();
  const dateStr = now.toLocaleDateString("ja-JP", {
    month: "long",
    day: "numeric",
    weekday: "short",
  });

  return (
    <header className="p-8 flex justify-between items-center">
      <div>
        <p className="text-xs text-zinc-500 tracking-widest">
          {dateStr}
        </p>
        <h1 className="text-2xl font-semibold mt-1">{getGreeting()}</h1>
      </div>
      <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-zinc-700 to-zinc-400" />
    </header>
  );
}
