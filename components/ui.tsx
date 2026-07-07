import type { ReactNode, ButtonHTMLAttributes, InputHTMLAttributes } from "react";

export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-xl border border-border bg-surface p-4 ${className}`}
    >
      {children}
    </div>
  );
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "ghost" | "ai" | "danger";
};

export function Button({ variant = "primary", className = "", ...props }: ButtonProps) {
  const styles = {
    primary:
      "bg-primary text-primary-ink hover:bg-primary/85 font-semibold",
    ghost:
      "border border-border bg-surface-2 text-text hover:border-border-strong",
    ai: "bg-ai-dim text-white hover:bg-ai-dim/85 font-semibold",
    danger: "border border-danger/40 text-danger hover:bg-danger/10",
  }[variant];
  return (
    <button
      className={`rounded-lg px-3.5 py-2 text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer ${styles} ${className}`}
      {...props}
    />
  );
}

export function Input({
  className = "",
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={`w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-text placeholder:text-text-faint outline-none focus:border-primary/60 ${className}`}
      {...props}
    />
  );
}

export function Badge({
  children,
  color = "default",
}: {
  children: ReactNode;
  color?: "default" | "primary" | "ai" | "load" | "info" | "danger" | "review";
}) {
  const styles = {
    default: "bg-surface-2 text-text-dim border-border",
    primary: "bg-primary/10 text-primary border-primary/25",
    ai: "bg-ai/10 text-ai border-ai/25",
    load: "bg-load/10 text-load border-load/25",
    info: "bg-info/10 text-info border-info/25",
    danger: "bg-danger/10 text-danger border-danger/25",
    review: "bg-review/10 text-review border-review/25",
  }[color];
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${styles}`}
    >
      {children}
    </span>
  );
}

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-text-dim">{subtitle}</p>}
      </div>
      {actions && <div className="flex gap-2">{actions}</div>}
    </div>
  );
}
