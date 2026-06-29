"use client";

import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useResource } from "@/lib/hooks/use-resource";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type TaxRecord = {
  id: string;
  type: "income" | "expense" | "declaration_sent" | "declaration_todo";
  date: string;
  amount: number | null;
};

const PERIODS: { label: string; months: number }[] = [
  { label: "3M", months: 3 },
  { label: "6M", months: 6 },
  { label: "1Y", months: 12 },
  { label: "2Y", months: 24 },
  { label: "6Y", months: 72 },
];

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

export function IncomeExpenseChart() {
  const { items: records } = useResource<TaxRecord>("/api/tax-records");
  const [months, setMonths] = useState(12);

  const data = useMemo(() => {
    // Build contiguous month buckets ending in the current month so months
    // with no records still render as gaps rather than collapsing.
    const now = new Date();
    const multiYear = months > 12;
    const buckets: {
      key: string;
      label: string;
      income: number;
      expense: number;
    }[] = [];
    const index = new Map<string, number>();

    for (let i = months - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      const label = multiYear
        ? `${MONTHS[d.getMonth()]} ${String(d.getFullYear()).slice(2)}`
        : MONTHS[d.getMonth()];
      index.set(key, buckets.length);
      buckets.push({ key, label, income: 0, expense: 0 });
    }

    for (const r of records ?? []) {
      if (r.amount == null) continue;
      if (r.type !== "income" && r.type !== "expense") continue;
      const d = new Date(r.date);
      const slot = index.get(`${d.getFullYear()}-${d.getMonth()}`);
      if (slot == null) continue;
      buckets[slot][r.type] += r.amount;
    }

    return buckets;
  }, [records, months]);

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 space-y-0 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle>Income vs Expense</CardTitle>
          <CardDescription>Monthly totals over the selected period</CardDescription>
        </div>
        <div className="flex flex-wrap gap-1">
          {PERIODS.map((p) => (
            <Button
              key={p.months}
              variant={months === p.months ? "default" : "outline"}
              size="sm"
              onClick={() => setMonths(p.months)}
            >
              {p.label}
            </Button>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 12 }}
                interval="preserveStartEnd"
                minTickGap={16}
              />
              <YAxis tick={{ fontSize: 12 }} width={56} />
              <Tooltip
                formatter={(v) => Number(v).toFixed(2)}
                cursor={{ fill: "var(--foreground)", fillOpacity: 0.06 }}
                contentStyle={{
                  background: "var(--popover)",
                  color: "var(--popover-foreground)",
                  border: "1px solid var(--border)",
                  borderRadius: 8,
                  fontSize: 12,
                  padding: "8px 12px",
                  boxShadow:
                    "0 4px 12px rgba(0,0,0,0.15), 0 2px 4px rgba(0,0,0,0.1)",
                }}
                labelStyle={{
                  color: "var(--popover-foreground)",
                  fontWeight: 600,
                  marginBottom: 4,
                }}
                itemStyle={{ color: "var(--popover-foreground)", padding: 0 }}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="income" name="Income" fill="#22c55e" radius={[2, 2, 0, 0]} />
              <Bar dataKey="expense" name="Expense" fill="#ef4444" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
