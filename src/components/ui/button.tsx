"use client";

import Link from "next/link";
import { cn } from "@/lib/utils/cn";

type ButtonVariant = "primary" | "secondary" | "outline" | "ghost" | "destructive";
type ButtonSize = "sm" | "md" | "lg";

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "bg-[var(--accent)] text-white shadow-sm hover:opacity-95 focus:ring-2 focus:ring-[var(--accent)]/30",
  secondary:
    "bg-[var(--accent-soft)] text-[var(--accent-foreground)] hover:bg-[var(--accent)]/15",
  outline:
    "border-2 border-[var(--accent)]/40 bg-white text-[var(--accent-foreground)] hover:bg-[var(--accent-soft)]",
  ghost: "bg-transparent text-slate-700 hover:bg-slate-100",
  destructive:
    "bg-[var(--destructive)] text-white hover:opacity-95 focus:ring-2 focus:ring-red-300",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "px-3 py-1.5 text-xs font-semibold rounded-md",
  md: "px-4 py-2.5 text-sm font-semibold rounded-[var(--radius-button)]",
  lg: "px-5 py-3 text-sm font-bold rounded-[var(--radius-button)]",
};

const baseClasses =
  "inline-flex items-center justify-center gap-2 transition outline-none disabled:opacity-50 disabled:pointer-events-none";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  children: React.ReactNode;
  className?: string;
  asChild?: boolean;
  href?: string;
}

export function Button({
  variant = "primary",
  size = "md",
  className,
  children,
  asChild,
  href,
  ...props
}: ButtonProps) {
  const classes = cn(baseClasses, variantClasses[variant], sizeClasses[size], className);

  if (asChild && typeof children === "object" && children !== null && "type" in children && (children as React.ReactElement).type === Link) {
    const child = children as React.ReactElement<React.ComponentProps<typeof Link>>;
    return <Link {...child.props} className={cn(classes, child.props.className)} />;
  }

  if (href) {
    return (
      <Link href={href} className={classes}>
        {children}
      </Link>
    );
  }

  return (
    <button className={classes} {...props}>
      {children}
    </button>
  );
}
