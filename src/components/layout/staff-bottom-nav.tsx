"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Clock, Calendar, FileText, BarChart2 } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/staff/dashboard", icon: Clock, label: "打刻" },
  { href: "/staff/attendance/history", icon: Calendar, label: "履歴" },
  { href: "/staff/expense", icon: FileText, label: "経費" },
  { href: "/staff/profile", icon: BarChart2, label: "統計" },
];

export function StaffBottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] glass border-t border-white/10 px-10 py-6 flex justify-between items-center z-50">
      {navItems.map((item) => {
        const isActive = pathname === item.href;
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex flex-col items-center gap-1 transition-colors",
              isActive ? "text-white" : "text-zinc-500"
            )}
          >
            <Icon className="w-6 h-6" />
          </Link>
        );
      })}
    </nav>
  );
}
