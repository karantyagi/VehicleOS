"use client";

import { CalendarIcon } from "lucide-react";
import { useEffect, useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  formatDateInputWhileTyping,
  isoDateToDisplay,
  isoDateToLocalDate,
  localDateToIsoDate,
  parseDateInput,
} from "@/lib/date-input";
import { cn } from "@/lib/utils";

export type DateFieldProps = {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  min?: string;
  max?: string;
  placeholder?: string;
  className?: string;
  fromYear?: number;
  toYear?: number;
};

export function DateField({
  id,
  value,
  onChange,
  disabled = false,
  min,
  max,
  placeholder = "MM/DD/YYYY",
  className,
  fromYear = 1980,
  toYear = new Date().getFullYear(),
}: DateFieldProps) {
  const fallbackId = useId();
  const inputId = id ?? fallbackId;
  const errorId = `${inputId}-error`;

  const [textValue, setTextValue] = useState(() => isoDateToDisplay(value));
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setTextValue(isoDateToDisplay(value));
    setError(null);
  }, [value]);

  const selectedDate = isoDateToLocalDate(value) ?? undefined;
  const minDate = min ? (isoDateToLocalDate(min) ?? undefined) : undefined;
  const maxDate = max ? (isoDateToLocalDate(max) ?? undefined) : undefined;

  const commitText = (raw: string) => {
    const parsed = parseDateInput(raw, { min, max });
    if (!parsed.ok) {
      setError(parsed.error);
      return;
    }
    setError(null);
    setTextValue(parsed.iso ? isoDateToDisplay(parsed.iso) : "");
    onChange(parsed.iso);
  };

  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex gap-2">
        <Input
          id={inputId}
          inputMode="numeric"
          autoComplete="off"
          placeholder={placeholder}
          value={textValue}
          disabled={disabled}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errorId : undefined}
          className={cn("tabular-nums", error && "border-destructive focus-visible:ring-destructive/30")}
          onChange={(event) => {
            const next = formatDateInputWhileTyping(event.target.value);
            setTextValue(next);
            if (error) setError(null);
          }}
          onBlur={() => commitText(textValue)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              commitText(textValue);
            }
          }}
        />
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="icon"
              disabled={disabled}
              aria-label="Open calendar"
              className="shrink-0"
            >
              <CalendarIcon className="h-4 w-4" aria-hidden />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="end">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(date) => {
                if (!date) return;
                const iso = localDateToIsoDate(date);
                setTextValue(isoDateToDisplay(iso));
                setError(null);
                onChange(iso);
                setOpen(false);
              }}
              defaultMonth={selectedDate}
              disabled={(date) => {
                if (minDate && date < minDate) return true;
                if (maxDate && date > maxDate) return true;
                return false;
              }}
              captionLayout="dropdown-buttons"
              fromYear={fromYear}
              toYear={toYear}
              initialFocus
            />
          </PopoverContent>
        </Popover>
      </div>
      {error ? (
        <p id={errorId} className="text-xs text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
