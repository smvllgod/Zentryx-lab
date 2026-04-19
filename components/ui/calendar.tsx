"use client";

// ──────────────────────────────────────────────────────────────────
// DateTimePicker — Zentryx-themed date/time picker
// ──────────────────────────────────────────────────────────────────
// Drop-in replacement for <input type="datetime-local">:
//   <DateTimePicker value={iso} onChange={(iso) => ...} />
//
// Features:
//   • Month navigation + day grid
//   • Time row (hour + minute steppers) when `showTime` is true
//   • "Today" and "Clear" quick actions
//   • `minDate` / `maxDate` to restrict range
//   • Fully keyboard-friendly; closes on outside click / Escape
//   • No external date library — pure Date + Tailwind
// ──────────────────────────────────────────────────────────────────

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as Popover from "@radix-ui/react-popover";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, X } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export interface DateTimePickerProps {
  /** ISO datetime string (UTC). Empty string = no value. */
  value?: string;
  onChange: (isoValue: string) => void;
  /** Show the hour/minute row. Defaults to true. */
  showTime?: boolean;
  /** Minute step (5, 10, 15, 30, 60). Defaults to 5. */
  minuteStep?: number;
  /** Earliest allowed date (inclusive). */
  minDate?: Date;
  /** Latest allowed date (inclusive). */
  maxDate?: Date;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  /** Trigger button size. */
  size?: "sm" | "md";
}

export function DateTimePicker({
  value,
  onChange,
  showTime = true,
  minuteStep = 5,
  minDate,
  maxDate,
  placeholder = "Pick a date…",
  disabled = false,
  className,
  size = "md",
}: DateTimePickerProps) {
  const [open, setOpen] = useState(false);
  const parsed = useMemo(() => (value ? safeDate(value) : null), [value]);
  const [cursor, setCursor] = useState<Date>(() => firstOfMonth(parsed ?? new Date()));

  useEffect(() => {
    if (parsed) setCursor(firstOfMonth(parsed));
  }, [parsed]);

  const display = parsed ? formatDisplay(parsed, showTime) : "";

  function emit(next: Date | null) {
    if (!next) {
      onChange("");
      return;
    }
    onChange(next.toISOString());
  }

  function setDay(d: Date) {
    const base = parsed ?? new Date();
    const next = new Date(Date.UTC(
      d.getUTCFullYear(),
      d.getUTCMonth(),
      d.getUTCDate(),
      showTime ? base.getUTCHours() : 0,
      showTime ? base.getUTCMinutes() : 0,
      0, 0,
    ));
    if (minDate && next.getTime() < minDate.getTime()) return;
    if (maxDate && next.getTime() > maxDate.getTime()) return;
    emit(next);
  }

  function setTime(hour: number, minute: number) {
    const base = parsed ?? new Date();
    const next = new Date(Date.UTC(
      base.getUTCFullYear(),
      base.getUTCMonth(),
      base.getUTCDate(),
      clamp(hour, 0, 23),
      clamp(minute, 0, 59),
      0, 0,
    ));
    if (minDate && next.getTime() < minDate.getTime()) return;
    if (maxDate && next.getTime() > maxDate.getTime()) return;
    emit(next);
  }

  function clear() { emit(null); }
  function today() {
    const now = new Date();
    // Keep the current time-of-day if we already have one; otherwise 09:00.
    const h = parsed?.getUTCHours() ?? 9;
    const m = parsed?.getUTCMinutes() ?? 0;
    emit(new Date(Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate(),
      h, m, 0, 0,
    )));
    setCursor(firstOfMonth(now));
  }

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button
          type="button"
          disabled={disabled}
          className={cn(
            "group inline-flex items-center justify-between w-full rounded-lg border border-gray-200 bg-white px-3 text-left text-sm text-gray-900 transition-colors",
            "hover:border-gray-300 focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/15",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            size === "sm" ? "h-8 text-xs" : "h-9",
            className,
          )}
        >
          <span className={cn("inline-flex items-center gap-2 min-w-0", !display && "text-gray-400")}>
            <CalendarIcon size={size === "sm" ? 13 : 14} className="text-gray-400 shrink-0" />
            <span className="truncate">{display || placeholder}</span>
          </span>
          {display && (
            <span
              role="button"
              tabIndex={-1}
              onClick={(e) => { e.stopPropagation(); clear(); }}
              className="shrink-0 text-gray-300 hover:text-gray-600 p-0.5 -mr-1"
              aria-label="Clear"
            >
              <X size={12} />
            </span>
          )}
        </button>
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Content
          align="start"
          sideOffset={6}
          className="z-50 rounded-xl border border-gray-200 bg-white shadow-[0_8px_28px_rgba(15,23,42,0.12)] p-3 w-[300px] focus:outline-none data-[state=open]:animate-in data-[state=closed]:animate-out"
          onCloseAutoFocus={(e) => e.preventDefault()}
        >
          <CalendarBody
            cursor={cursor}
            setCursor={setCursor}
            selected={parsed}
            onSelectDay={setDay}
            minDate={minDate}
            maxDate={maxDate}
          />

          {showTime && (
            <TimeRow
              value={parsed}
              onChange={setTime}
              minuteStep={minuteStep}
            />
          )}

          <div className="mt-3 flex items-center justify-between text-[11px]">
            <button type="button" onClick={clear} className="text-gray-500 hover:text-red-600 font-600">Clear</button>
            <button type="button" onClick={today} className="text-emerald-600 hover:text-emerald-700 font-600">Today</button>
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

// ── Calendar grid ────────────────────────────────────────────────

function CalendarBody({
  cursor,
  setCursor,
  selected,
  onSelectDay,
  minDate,
  maxDate,
}: {
  cursor: Date;
  setCursor: (d: Date) => void;
  selected: Date | null;
  onSelectDay: (d: Date) => void;
  minDate?: Date;
  maxDate?: Date;
}) {
  const year = cursor.getUTCFullYear();
  const month = cursor.getUTCMonth();

  const weeks = useMemo(() => buildMonthMatrix(year, month), [year, month]);

  function step(delta: number) {
    setCursor(new Date(Date.UTC(year, month + delta, 1, 0, 0, 0, 0)));
  }

  const today = new Date();
  const isToday = (d: Date) =>
    d.getUTCFullYear() === today.getUTCFullYear() &&
    d.getUTCMonth() === today.getUTCMonth() &&
    d.getUTCDate() === today.getUTCDate();

  const isSelected = (d: Date) =>
    selected != null &&
    d.getUTCFullYear() === selected.getUTCFullYear() &&
    d.getUTCMonth() === selected.getUTCMonth() &&
    d.getUTCDate() === selected.getUTCDate();

  const isOutOfRange = useCallback((d: Date) => {
    if (minDate && d.getTime() < firstOfDay(minDate).getTime()) return true;
    if (maxDate && d.getTime() > lastOfDay(maxDate).getTime()) return true;
    return false;
  }, [minDate, maxDate]);

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <button type="button" onClick={() => step(-1)} className="p-1 rounded-md text-gray-500 hover:bg-gray-100">
          <ChevronLeft size={14} />
        </button>
        <div className="text-[13px] font-700 text-gray-900">
          {MONTHS[month]} {year}
        </div>
        <button type="button" onClick={() => step(1)} className="p-1 rounded-md text-gray-500 hover:bg-gray-100">
          <ChevronRight size={14} />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 mb-1">
        {WEEKDAYS.map((w) => (
          <div key={w} className="text-[9px] font-700 uppercase tracking-wider text-gray-400 text-center">{w}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {weeks.flat().map((d) => {
          const inMonth = d.getUTCMonth() === month;
          const outOfRange = isOutOfRange(d);
          const sel = isSelected(d);
          const today = isToday(d);
          return (
            <button
              key={d.toISOString()}
              type="button"
              disabled={outOfRange}
              onClick={() => onSelectDay(d)}
              className={cn(
                "h-8 rounded-md text-[12px] font-600 transition-colors",
                outOfRange ? "text-gray-300 cursor-not-allowed" :
                  sel ? "bg-emerald-500 text-white shadow-sm" :
                  today ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200" :
                  inMonth ? "text-gray-700 hover:bg-gray-100" :
                  "text-gray-300 hover:bg-gray-50",
              )}
            >
              {d.getUTCDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Time row ────────────────────────────────────────────────────

function TimeRow({
  value,
  onChange,
  minuteStep,
}: {
  value: Date | null;
  onChange: (hour: number, minute: number) => void;
  minuteStep: number;
}) {
  const [hourStr, setHourStr] = useState(String(value?.getUTCHours() ?? 9).padStart(2, "0"));
  const [minStr, setMinStr] = useState(String(value?.getUTCMinutes() ?? 0).padStart(2, "0"));

  useEffect(() => {
    setHourStr(String(value?.getUTCHours() ?? 9).padStart(2, "0"));
    setMinStr(String(value?.getUTCMinutes() ?? 0).padStart(2, "0"));
  }, [value]);

  function commit(nextHour: string, nextMin: string) {
    const h = Number.parseInt(nextHour, 10);
    const m = Number.parseInt(nextMin, 10);
    if (Number.isFinite(h) && Number.isFinite(m)) {
      onChange(h, m);
    }
  }

  return (
    <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between gap-2">
      <div className="text-[10px] font-700 uppercase tracking-wider text-gray-400">Time (UTC)</div>
      <div className="flex items-center gap-1">
        <Stepper value={hourStr} onChange={setHourStr} onCommit={(v) => commit(v, minStr)} min={0} max={23} width="w-10" />
        <span className="text-gray-400 font-700">:</span>
        <Stepper value={minStr} onChange={setMinStr} onCommit={(v) => commit(hourStr, v)} min={0} max={59} step={minuteStep} width="w-10" />
      </div>
    </div>
  );
}

function Stepper({
  value,
  onChange,
  onCommit,
  min,
  max,
  step = 1,
  width,
}: {
  value: string;
  onChange: (next: string) => void;
  onCommit: (next: string) => void;
  min: number;
  max: number;
  step?: number;
  width?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  function bump(delta: number) {
    const n = Number.parseInt(value, 10) || 0;
    const next = clamp(n + delta * step, min, max);
    const s = String(next).padStart(2, "0");
    onChange(s);
    onCommit(s);
  }
  return (
    <div className="inline-flex items-center h-8 rounded-md border border-gray-200 bg-white">
      <button type="button" onClick={() => bump(-1)} className="px-1.5 text-gray-400 hover:text-emerald-600">−</button>
      <input
        ref={inputRef}
        value={value}
        onChange={(e) => {
          const digits = e.target.value.replace(/[^\d]/g, "").slice(0, 2);
          onChange(digits);
        }}
        onBlur={(e) => {
          const n = clamp(Number.parseInt(e.target.value, 10) || 0, min, max);
          const s = String(n).padStart(2, "0");
          onChange(s);
          onCommit(s);
        }}
        inputMode="numeric"
        className={cn(
          "h-full bg-transparent text-center text-[13px] font-600 text-gray-900 focus:outline-none tabular-nums",
          width ?? "w-10",
        )}
      />
      <button type="button" onClick={() => bump(1)} className="px-1.5 text-gray-400 hover:text-emerald-600">+</button>
    </div>
  );
}

// ── Utilities ────────────────────────────────────────────────────

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const WEEKDAYS = ["M", "T", "W", "T", "F", "S", "S"];

function safeDate(iso: string): Date | null {
  const d = new Date(iso);
  return Number.isFinite(d.getTime()) ? d : null;
}

function firstOfMonth(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1, 0, 0, 0, 0));
}

function firstOfDay(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0, 0));
}

function lastOfDay(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 23, 59, 59, 999));
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function formatDisplay(d: Date, withTime: boolean): string {
  const y = d.getUTCFullYear();
  const mo = String(d.getUTCMonth() + 1).padStart(2, "0");
  const da = String(d.getUTCDate()).padStart(2, "0");
  if (!withTime) return `${da} ${MONTHS[d.getUTCMonth()].slice(0, 3)} ${y}`;
  const hh = String(d.getUTCHours()).padStart(2, "0");
  const mi = String(d.getUTCMinutes()).padStart(2, "0");
  return `${da} ${MONTHS[d.getUTCMonth()].slice(0, 3)} ${y} · ${hh}:${mi} UTC`;
}

/**
 * Build a 6×7 day matrix for the given UTC month. First column is Monday.
 */
function buildMonthMatrix(year: number, month: number): Date[][] {
  const first = new Date(Date.UTC(year, month, 1, 0, 0, 0, 0));
  // getUTCDay: 0 = Sunday … 6 = Saturday. Convert so Monday = 0.
  const offset = (first.getUTCDay() + 6) % 7;
  const start = new Date(Date.UTC(year, month, 1 - offset, 0, 0, 0, 0));
  const rows: Date[][] = [];
  for (let r = 0; r < 6; r++) {
    const row: Date[] = [];
    for (let c = 0; c < 7; c++) {
      row.push(new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate() + r * 7 + c, 0, 0, 0, 0)));
    }
    rows.push(row);
  }
  return rows;
}
