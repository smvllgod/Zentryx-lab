"use client";

import * as React from "react";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export interface SelectOption {
  value: string;
  label: React.ReactNode;
  /** Optional hint rendered below the label, e.g. "H1 · 4h bars". */
  hint?: string;
  /** Greyed out; not clickable. */
  disabled?: boolean;
}

export interface SelectGroup {
  label: string;
  options: SelectOption[];
}

export interface CustomSelectProps {
  value: string;
  onChange: (value: string) => void;
  /** Either a flat list of options or an array of groups. */
  options?: SelectOption[];
  groups?: SelectGroup[];
  placeholder?: string;
  disabled?: boolean;
  id?: string;
  className?: string;
  /** ARIA label — use when the visible label isn't wrapping the select. */
  "aria-label"?: string;
}

/**
 * Custom dropdown — styled button + popover list.
 * API mirrors NativeSelect (value + onChange(value)), but renders a
 * fully controllable popover instead of the browser's native select.
 *
 * Accepts either `options` (flat) or `groups` (with labels). Keyboard
 * navigation: Enter/Space to open, arrow keys to move, Enter to commit,
 * Escape to dismiss.
 */
export function CustomSelect({
  value,
  onChange,
  options,
  groups,
  placeholder,
  disabled,
  id,
  className,
  ...aria
}: CustomSelectProps) {
  const [open, setOpen] = React.useState(false);
  const [highlight, setHighlight] = React.useState(0);
  const btnRef = React.useRef<HTMLButtonElement>(null);
  const menuRef = React.useRef<HTMLDivElement>(null);

  // Flat index map for keyboard nav.
  const flat: SelectOption[] = React.useMemo(() => {
    if (groups) return groups.flatMap((g) => g.options);
    return options ?? [];
  }, [options, groups]);

  const selected = flat.find((o) => o.value === value);

  // Sync highlight to the current value when opened.
  React.useEffect(() => {
    if (!open) return;
    const idx = flat.findIndex((o) => o.value === value);
    setHighlight(idx >= 0 ? idx : 0);
  }, [open, value, flat]);

  // Click-outside to close.
  React.useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (!menuRef.current || !btnRef.current) return;
      if (menuRef.current.contains(e.target as Node)) return;
      if (btnRef.current.contains(e.target as Node)) return;
      setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  function moveHighlight(delta: number) {
    if (flat.length === 0) return;
    const next = ((highlight + delta) % flat.length + flat.length) % flat.length;
    // Skip disabled.
    let step = next;
    for (let i = 0; i < flat.length; i++) {
      if (!flat[step].disabled) { setHighlight(step); return; }
      step = (step + Math.sign(delta) + flat.length) % flat.length;
    }
  }

  function onKey(e: React.KeyboardEvent) {
    if (!open) {
      if (e.key === "Enter" || e.key === " " || e.key === "ArrowDown") {
        e.preventDefault();
        setOpen(true);
      }
      return;
    }
    if (e.key === "ArrowDown") { e.preventDefault(); moveHighlight(1); }
    else if (e.key === "ArrowUp") { e.preventDefault(); moveHighlight(-1); }
    else if (e.key === "Home") { e.preventDefault(); setHighlight(0); }
    else if (e.key === "End") { e.preventDefault(); setHighlight(flat.length - 1); }
    else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      const opt = flat[highlight];
      if (opt && !opt.disabled) {
        onChange(opt.value);
        setOpen(false);
        btnRef.current?.focus();
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
      btnRef.current?.focus();
    }
  }

  function pick(opt: SelectOption) {
    if (opt.disabled) return;
    onChange(opt.value);
    setOpen(false);
    btnRef.current?.focus();
  }

  return (
    <div className={cn("relative", className)}>
      <button
        ref={btnRef}
        id={id}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={aria["aria-label"]}
        disabled={disabled}
        onClick={() => !disabled && setOpen((v) => !v)}
        onKeyDown={onKey}
        className={cn(
          "h-9 w-full rounded-lg border border-gray-200 bg-white pl-3 pr-8 text-sm text-left transition-colors",
          "hover:border-gray-300 focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/15",
          "disabled:opacity-50 disabled:cursor-not-allowed",
          !selected && "text-gray-400",
          selected && "text-gray-900",
        )}
      >
        <span className="block truncate">
          {selected ? selected.label : (placeholder ?? "Select…")}
        </span>
        <ChevronDown
          size={14}
          className={cn(
            "absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 transition-transform",
            open && "rotate-180",
          )}
        />
      </button>

      {open && (
        <div
          ref={menuRef}
          role="listbox"
          className={cn(
            "absolute z-50 mt-1 w-full max-h-[280px] overflow-y-auto",
            "rounded-xl border border-gray-200 bg-white shadow-[0_14px_36px_-12px_rgba(0,0,0,0.18)]",
            "py-1",
          )}
          onKeyDown={onKey}
        >
          {groups ? groups.map((g) => (
            <div key={g.label} className="py-1">
              <div className="px-3 py-1 text-[10px] font-700 uppercase tracking-widest text-gray-400">
                {g.label}
              </div>
              {g.options.map((o) => {
                const flatIdx = flat.indexOf(o);
                return (
                  <OptionRow
                    key={o.value}
                    option={o}
                    selected={o.value === value}
                    highlighted={flatIdx === highlight}
                    onClick={() => pick(o)}
                    onMouseEnter={() => setHighlight(flatIdx)}
                  />
                );
              })}
            </div>
          )) : (options ?? []).map((o, i) => (
            <OptionRow
              key={o.value}
              option={o}
              selected={o.value === value}
              highlighted={i === highlight}
              onClick={() => pick(o)}
              onMouseEnter={() => setHighlight(i)}
            />
          ))}
          {flat.length === 0 && (
            <div className="px-3 py-4 text-xs text-gray-400 text-center">No options</div>
          )}
        </div>
      )}
    </div>
  );
}

function OptionRow({
  option, selected, highlighted, onClick, onMouseEnter,
}: {
  option: SelectOption;
  selected: boolean;
  highlighted: boolean;
  onClick: () => void;
  onMouseEnter: () => void;
}) {
  return (
    <button
      type="button"
      role="option"
      aria-selected={selected}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      disabled={option.disabled}
      className={cn(
        "w-full text-left px-3 py-1.5 text-sm flex items-center justify-between gap-3",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        highlighted ? "bg-emerald-50 text-emerald-900" : "text-gray-900",
        selected && "font-600",
      )}
    >
      <span className="min-w-0 flex-1">
        <span className="block truncate">{option.label}</span>
        {option.hint && <span className="text-[10px] text-gray-500 mt-0.5 block truncate">{option.hint}</span>}
      </span>
      {selected && <Check size={14} className="text-emerald-600 shrink-0" />}
    </button>
  );
}
