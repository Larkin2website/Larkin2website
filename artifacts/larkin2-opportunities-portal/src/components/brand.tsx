import { ReactNode } from "react";

export function Larkin2Wordmark({ className = "", dotClassName = "" }: { className?: string, dotClassName?: string }) {
  return (
    <span className={`inline-flex items-baseline font-mono text-[21px] font-medium tracking-[-0.09em] ${className}`}>
      Larkin2
      <span className={`inline-block w-1.5 h-1.5 ml-0.5 rounded-full bg-primary animate-[pulse_2s_steps(2,start)_infinite] shrink-0 ${dotClassName}`} />
    </span>
  );
}

export function PageHeader({ title, subtitle, action, className = "" }: { title: ReactNode, subtitle?: ReactNode, action?: ReactNode, className?: string }) {
  return (
    <div className={`flex flex-col lg:flex-row lg:items-end justify-between gap-4 border-b border-border pb-5 sm:pb-6 mb-6 sm:mb-8 min-w-0 ${className}`}>
      <div className="min-w-0 flex-1">
        <h1 className="font-mono text-2xl sm:text-3xl md:text-4xl tracking-tight font-medium text-foreground break-words">{title}</h1>
        {subtitle && <p className="text-muted-foreground mt-2 text-sm max-w-xl leading-relaxed break-words">{subtitle}</p>}
      </div>
      {action && <div className="flex-shrink-0 w-full lg:w-auto mt-2 lg:mt-0">{action}</div>}
    </div>
  );
}
