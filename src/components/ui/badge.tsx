import * as React from "react";
import { cn } from "@/lib/utils";

type Variant = "default" | "secondary" | "outline" | "success" | "destructive";

const variantClasses: Record<Variant, string> = {
  default: "bg-primary text-primary-foreground",
  secondary: "bg-muted text-foreground",
  outline: "border border-border text-foreground",
  success: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  destructive: "bg-destructive/15 text-destructive",
};

export function Badge({
  className,
  variant = "default",
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { variant?: Variant }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        variantClasses[variant],
        className
      )}
      {...props}
    />
  );
}
