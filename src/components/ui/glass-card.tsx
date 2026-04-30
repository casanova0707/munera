"use client";

import { cn } from "@/lib/utils";

interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  gradient?: boolean;
}

export function GlassCard({
  className,
  gradient = false,
  children,
  ...props
}: GlassCardProps) {
  return (
    <div
      className={cn(
        "glass rounded-3xl",
        gradient && "apple-gradient",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
