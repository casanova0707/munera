"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutGrid,
  Users,
  ClipboardCheck,
  MapPin,
  Clock,
  FileText,
  Settings,
  Shield,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/admin/dashboard", icon: LayoutGrid, label: "ダッシュボード" },
  { href: "/admin/attendance", icon: Clock, label: "勤怠管理" },
  { href: "/admin/users", icon: Users, label: "スタッフ管理" },
  { href: "/admin/expense", icon: ClipboardCheck, label: "経費承認", badge: 3 },
  { href: "/admin/locations", icon: MapPin, label: "拠点管理" },
  { href: "/admin/shifts", icon: Clock, label: "シフト管理" },
  { href: "/admin/reports", icon: FileText, label: "帳票" },
  { href: "/admin/settings", icon: Settings, label: "設定" },
  { href: "/admin/audit", icon: Shield, label: "監査ログ" },
];

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 border-r border-white/5 flex flex-col p-6">
      <div className="text-xl font-bold tracking-tighter mb-12 px-2">
        MUNERA{" "}
        <span className="font-light text-zinc-500">ADMIN</span>
      </div>
      <nav className="space-y-1">
        {navItems.map((item) => {
          const isActive = pathname?.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-xl text-sm transition-all",
                isActive
                  ? "bg-white/5 text-white"
                  : "text-zinc-500 hover:text-white"
              )}
            >
              <Icon className="w-4 h-4" />
              {item.label}
              {item.badge && (
                <span className="ml-auto bg-orange-500 text-[10px] text-white px-1.5 py-0.5 rounded-full">
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
