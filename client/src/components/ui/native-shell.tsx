import type { ReactNode } from "react";
import { Link } from "wouter";
import { motion, useReducedMotion } from "framer-motion";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface NativeScreenProps {
  children: ReactNode;
  className?: string;
  contentClassName?: string;
}

export function NativeScreen({ children, className, contentClassName }: NativeScreenProps) {
  return (
    <div className={cn("relative isolate min-h-screen overflow-hidden", className)}>
      <div className="pointer-events-none absolute -top-24 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-violet-500/15 blur-[96px]" />
      <div className="pointer-events-none absolute bottom-6 right-[-5rem] h-56 w-56 rounded-full bg-cyan-500/10 blur-[88px]" />
      <main className={cn("relative z-[1] mx-auto w-full max-w-7xl", contentClassName)}>{children}</main>
    </div>
  );
}

interface NativeGlassCardProps {
  children: ReactNode;
  className?: string;
  animate?: boolean;
}

export function NativeGlassCard({ children, className, animate = false }: NativeGlassCardProps) {
  const reduceMotion = useReducedMotion();
  if (!animate || reduceMotion) {
    return (
      <section
        className={cn(
          "rounded-3xl border border-white/10 bg-[linear-gradient(170deg,rgba(255,255,255,0.08),rgba(255,255,255,0.03))] p-4 backdrop-blur-xl md:p-5",
          className,
        )}
      >
        {children}
      </section>
    );
  }

  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: "easeOut" }}
      className={cn(
        "rounded-3xl border border-white/10 bg-[linear-gradient(170deg,rgba(255,255,255,0.08),rgba(255,255,255,0.03))] p-4 backdrop-blur-xl md:p-5",
        className,
      )}
    >
      {children}
    </motion.section>
  );
}

interface NativeSectionHeaderProps {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  className?: string;
}

export function NativeSectionHeader({ title, subtitle, action, className }: NativeSectionHeaderProps) {
  return (
    <div className={cn("mb-3 flex items-start justify-between gap-3", className)}>
      <div>
        <h2 className="text-lg font-semibold tracking-tight text-foreground md:text-xl">{title}</h2>
        {subtitle && <p className="mt-0.5 text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

interface NativeSegmentedOption<T extends string> {
  value: T;
  label: string;
}

interface NativeSegmentedControlProps<T extends string> {
  value: T;
  onChange: (value: T) => void;
  options: Array<NativeSegmentedOption<T>>;
  className?: string;
}

export function NativeSegmentedControl<T extends string>({
  value,
  onChange,
  options,
  className,
}: NativeSegmentedControlProps<T>) {
  return (
    <div
      className={cn(
        "inline-flex w-full items-center gap-1 rounded-2xl border border-white/10 bg-black/15 p-1 md:w-auto",
        className,
      )}
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={cn(
              "relative flex-1 rounded-xl px-3 py-2 text-sm font-medium transition-colors md:flex-none",
              active ? "text-white" : "text-muted-foreground hover:text-foreground",
            )}
            data-testid={`segmented-${option.value}`}
          >
            {active && (
              <motion.span
                layoutId="native-segment-indicator"
                className="absolute inset-0 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-500 shadow-[0_0_16px_rgba(139,92,246,0.35)]"
                transition={{ type: "spring", stiffness: 380, damping: 30 }}
              />
            )}
            <span className="relative z-[1]">{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}

interface NativeFabProps {
  href?: string;
  onClick?: () => void;
  label?: string;
  className?: string;
  icon?: ReactNode;
  testId?: string;
}

export function NativeFab({
  href,
  onClick,
  label = "Create",
  className,
  icon,
  testId,
}: NativeFabProps) {
  const content = (
    <Button
      type="button"
      onClick={onClick}
      className={cn(
        "h-12 rounded-2xl border border-violet-300/35 bg-gradient-to-r from-violet-600 via-violet-500 to-indigo-500 px-4 text-white shadow-[0_14px_28px_rgba(76,29,149,0.45)] hover:from-violet-500 hover:to-indigo-400",
        className,
      )}
      data-testid={testId}
    >
      {icon || <Plus className="mr-1.5 h-4 w-4" />}
      <span className="font-medium">{label}</span>
    </Button>
  );

  if (href) {
    return <Link href={href}>{content}</Link>;
  }

  return content;
}
