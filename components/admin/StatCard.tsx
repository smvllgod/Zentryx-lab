import type { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";

export function StatCard({
  label,
  value,
  hint,
  icon,
  tone = "default",
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  icon?: ReactNode;
  tone?: "default" | "emerald" | "amber" | "red" | "purple";
}) {
  const toneMap: Record<string, string> = {
    default: "bg-gray-50 text-gray-500",
    emerald: "bg-emerald-50 text-emerald-600",
    amber: "bg-amber-50 text-amber-600",
    red: "bg-red-50 text-red-600",
    purple: "bg-purple-50 text-purple-600",
  };
  return (
    <Card>
      <CardContent>
        <div className="flex items-start justify-between">
          <div>
            <div className="text-[11px] font-600 uppercase tracking-wider text-gray-400">{label}</div>
            <div className="mt-2 text-2xl font-700 text-gray-900">{value}</div>
            {hint && <div className="mt-1 text-xs text-gray-500">{hint}</div>}
          </div>
          {icon && (
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${toneMap[tone]}`}>
              {icon}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
