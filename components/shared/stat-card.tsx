import { Card, CardContent } from "@/components/ui/card";
import type { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: number | string;
  icon: LucideIcon;
  description?: string;
  trend?: { value: string; positive?: boolean };
}

export function StatCard({ title, value, icon: Icon, description, trend }: StatCardProps) {
  return (
    <Card className="transition-colors hover:bg-accent/40">
      <CardContent className="flex flex-col gap-3 p-6">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Icon className="h-4 w-4" />
          </div>
        </div>
        <div>
          <p className="text-3xl font-bold tracking-tight tabular-nums">{value}</p>
          {(trend || description) && (
            <p className="mt-1 text-xs text-muted-foreground">
              {trend && (
                <span
                  className={
                    trend.positive
                      ? "font-medium text-emerald-600 dark:text-emerald-400"
                      : "font-medium text-muted-foreground"
                  }
                >
                  {trend.value}
                </span>
              )}
              {trend && description && " · "}
              {description}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}