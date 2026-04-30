import { cn } from "@/lib/utils";

type BadgeVariant = "alert" | "pending" | "success" | "default";

interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
  className?: string;
}

const variantStyles: Record<BadgeVariant, string> = {
  alert: "bg-red-500/10 text-red-500",
  pending: "bg-yellow-500/10 text-yellow-500",
  success: "bg-emerald-500/10 text-emerald-500",
  default: "bg-white/10 text-zinc-400",
};

export function Badge({ variant = "default", children, className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium uppercase",
        variantStyles[variant],
        className
      )}
    >
      {children}
    </span>
  );
}
