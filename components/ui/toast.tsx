"use client";

// Thin re-export so callers don't import from `sonner` directly. Lets us
// swap implementations later without touching every page.
export { Toaster, toast } from "sonner";
