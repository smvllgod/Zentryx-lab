"use client";

import * as React from "react";
import { cn } from "@/lib/utils/cn";

// Native <select> styled to match the rest of the UI. Keeps things light —
// Radix's Select is overkill for the inspector's small enums.
export const NativeSelect = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement>
>(({ className, children, ...props }, ref) => (
  <select
    ref={ref}
    className={cn(
      "h-9 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-900 transition-colors focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/15 disabled:opacity-50",
      className,
    )}
    {...props}
  >
    {children}
  </select>
));
NativeSelect.displayName = "NativeSelect";
