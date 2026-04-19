"use client";

import * as React from "react";
import * as Dm from "@radix-ui/react-dropdown-menu";
import { cn } from "@/lib/utils/cn";

export const DropdownMenu = Dm.Root;
export const DropdownMenuTrigger = Dm.Trigger;
export const DropdownMenuPortal = Dm.Portal;
export const DropdownMenuGroup = Dm.Group;
export const DropdownMenuSub = Dm.Sub;
export const DropdownMenuRadioGroup = Dm.RadioGroup;

export const DropdownMenuContent = React.forwardRef<
  React.ElementRef<typeof Dm.Content>,
  React.ComponentPropsWithoutRef<typeof Dm.Content>
>(({ className, sideOffset = 6, ...props }, ref) => (
  <Dm.Portal>
    <Dm.Content
      ref={ref}
      sideOffset={sideOffset}
      className={cn(
        "z-50 min-w-[180px] overflow-hidden rounded-xl border border-gray-200 bg-white p-1 shadow-[0_8px_24px_rgba(15,23,42,0.08)]",
        "data-[state=open]:animate-in data-[state=closed]:animate-out",
        className,
      )}
      {...props}
    />
  </Dm.Portal>
));
DropdownMenuContent.displayName = "DropdownMenuContent";

export const DropdownMenuItem = React.forwardRef<
  React.ElementRef<typeof Dm.Item>,
  React.ComponentPropsWithoutRef<typeof Dm.Item>
>(({ className, ...props }, ref) => (
  <Dm.Item
    ref={ref}
    className={cn(
      "relative flex cursor-pointer select-none items-center rounded-lg px-2 py-1.5 text-xs text-gray-700 outline-none transition-colors",
      "hover:bg-gray-100 focus:bg-gray-100",
      "data-[disabled]:pointer-events-none data-[disabled]:opacity-40",
      className,
    )}
    {...props}
  />
));
DropdownMenuItem.displayName = "DropdownMenuItem";

export const DropdownMenuLabel = React.forwardRef<
  React.ElementRef<typeof Dm.Label>,
  React.ComponentPropsWithoutRef<typeof Dm.Label>
>(({ className, ...props }, ref) => (
  <Dm.Label
    ref={ref}
    className={cn("px-2 pt-2 pb-1 text-[9px] font-700 uppercase tracking-widest text-gray-400", className)}
    {...props}
  />
));
DropdownMenuLabel.displayName = "DropdownMenuLabel";

export const DropdownMenuSeparator = React.forwardRef<
  React.ElementRef<typeof Dm.Separator>,
  React.ComponentPropsWithoutRef<typeof Dm.Separator>
>(({ className, ...props }, ref) => (
  <Dm.Separator ref={ref} className={cn("my-1 h-px bg-gray-100", className)} {...props} />
));
DropdownMenuSeparator.displayName = "DropdownMenuSeparator";
