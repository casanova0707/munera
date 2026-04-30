"use client";

import { cn } from "@/lib/utils";
import { forwardRef } from "react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "ghost" | "outline";
  size?: "sm" | "md" | "lg";
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center font-medium transition-all",
          variant === "primary" &&
            "bg-white text-black hover:bg-white/90 active:scale-[0.98]",
          variant === "ghost" &&
            "text-zinc-400 hover:text-white hover:bg-white/5",
          variant === "outline" &&
            "border border-white/20 text-white hover:bg-white/5",
          size === "sm" && "rounded-full px-3 py-1 text-xs",
          size === "md" && "rounded-full px-4 py-2 text-sm",
          size === "lg" && "rounded-full px-6 py-4 text-base w-full",
          className
        )}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";
