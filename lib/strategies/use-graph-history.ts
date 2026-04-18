"use client";

import { useCallback, useRef, useState } from "react";
import type { StrategyGraph } from "./types";

const MAX_HISTORY = 60;

// Tiny undo/redo store for the strategy graph. We snapshot the whole
// graph on each `set` call. That's fine — graphs are small (kilobytes)
// and this avoids any custom diff logic.
export function useGraphHistory(initial: StrategyGraph) {
  const [graph, setInternal] = useState<StrategyGraph>(initial);
  const past = useRef<StrategyGraph[]>([]);
  const future = useRef<StrategyGraph[]>([]);

  const set = useCallback((next: StrategyGraph | ((prev: StrategyGraph) => StrategyGraph)) => {
    setInternal((prev) => {
      const resolved = typeof next === "function" ? (next as (p: StrategyGraph) => StrategyGraph)(prev) : next;
      if (resolved === prev) return prev;
      past.current.push(prev);
      if (past.current.length > MAX_HISTORY) past.current.shift();
      future.current = [];
      return resolved;
    });
  }, []);

  const reset = useCallback((fresh: StrategyGraph) => {
    past.current = [];
    future.current = [];
    setInternal(fresh);
  }, []);

  const undo = useCallback(() => {
    setInternal((curr) => {
      const prev = past.current.pop();
      if (!prev) return curr;
      future.current.push(curr);
      return prev;
    });
  }, []);

  const redo = useCallback(() => {
    setInternal((curr) => {
      const next = future.current.pop();
      if (!next) return curr;
      past.current.push(curr);
      return next;
    });
  }, []);

  return { graph, set, reset, undo, redo };
}
