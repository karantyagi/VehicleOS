import type { ReactNode } from "react";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type FormFieldProps = {
  label: string;
  htmlFor?: string;
  hint?: string;
  optional?: boolean;
  children: ReactNode;
  className?: string;
};

export function FormField({ label, htmlFor, hint, optional, children, className }: FormFieldProps) {
  return (
    <div className={cn("space-y-2", className)}>
      <Label htmlFor={htmlFor} className="flex items-center gap-2">
        {label}
        {optional ? <span className="text-xs font-normal text-muted-foreground">optional</span> : null}
      </Label>
      {children}
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

export function FormActions({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("flex flex-wrap gap-2 pt-2", className)}>{children}</div>;
}
