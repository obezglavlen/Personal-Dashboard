"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { useResource } from "@/lib/hooks/use-resource";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2 } from "lucide-react";

export type Subscription = {
  id: string;
  name: string;
  price: number;
  period: "monthly" | "annual";
  startDate: string;
  category: string | null;
  currency: string;
  createdAt: string;
};

type Form = {
  name: string;
  price: string;
  period: "monthly" | "annual";
  startDate: string;
  category: string;
  currency: string;
};

const EMPTY: Form = {
  name: "",
  price: "",
  period: "monthly",
  startDate: new Date().toISOString().slice(0, 10),
  category: "",
  currency: "USD",
};

type SortKey = "cost-desc" | "cost-asc" | "name-asc" | "date-desc";
type ViewMode = "daily" | "monthly" | "quarterly" | "annual";

function perMonth(s: Subscription): number {
  return s.period === "annual" ? s.price / 12 : s.price;
}

function convert(perMonthPrice: number, mode: ViewMode): number {
  switch (mode) {
    case "daily": return perMonthPrice / 30;
    case "monthly": return perMonthPrice;
    case "quarterly": return perMonthPrice * 3;
    case "annual": return perMonthPrice * 12;
  }
}

function cumulativeSpend(s: Subscription, asOf: Date): number {
  const start = new Date(s.startDate);
  if (asOf < start) return 0;
  const ms = asOf.getTime() - start.getTime();
  const monthsElapsed = ms / (1000 * 60 * 60 * 24 * 30.4375);
  const pm = perMonth(s);
  return Math.max(0, pm * monthsElapsed);
}

function viewLabel(mode: ViewMode): string {
  switch (mode) {
    case "daily": return "day";
    case "monthly": return "month";
    case "quarterly": return "quarter";
    case "annual": return "year";
  }
}

export function SubscriptionClient() {
  const { items: subs, isLoading, create, remove } = useResource<Subscription>(
    "/api/subscriptions"
  );
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Form>(EMPTY);
  const [sort, setSort] = useState<SortKey>("cost-desc");
  const [view, setView] = useState<ViewMode>("monthly");
  const [asOf, setAsOf] = useState<string>(new Date().toISOString().slice(0, 10));

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      await create({ ...form, price: Number(form.price) });
      toast.success("Subscription added");
      setForm(EMPTY);
      setOpen(false);
    } catch (err) {
      toast.error("Failed to add subscription", {
        description: err instanceof Error ? err.message : undefined,
      });
    }
  }

  async function deleteSub(id: string) {
    try {
      await remove(id);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete subscription");
    }
  }

  const sorted = useMemo(() => {
    if (!subs) return [];
    return [...subs].sort((a, b) => {
      switch (sort) {
        case "name-asc": return a.name.localeCompare(b.name);
        case "cost-asc": return a.price - b.price;
        case "date-desc": return b.createdAt.localeCompare(a.createdAt);
        case "cost-desc":
        default: return b.price - a.price;
      }
    });
  }, [subs, sort]);

  const monthly = sorted.filter((s) => s.period === "monthly");
  const annual = sorted.filter((s) => s.period === "annual");

  const totalMonthly = sorted.reduce((sum, s) => sum + perMonth(s), 0);
  const totalAtView = convert(totalMonthly, view);
  const asOfDate = new Date(asOf);
  const cumulative = sorted.reduce((sum, s) => sum + cumulativeSpend(s, asOfDate), 0);
  const isFuture = asOfDate.getTime() > Date.now();
  const currency = sorted[0]?.currency ?? "USD";

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading…</p>;
  if (!subs) return null;

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Subscriptions</h1>
        <p className="text-sm text-muted-foreground sm:text-base">
          Track recurring expenses and see past or projected spend.
        </p>
      </div>
      <div className="flex justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="w-full sm:w-auto">
              <Plus className="mr-2 h-4 w-4" /> Add Subscription
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>New Subscription</DialogTitle>
              <DialogDescription>Track a recurring expense.</DialogDescription>
            </DialogHeader>
            <form onSubmit={onSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="sub-name">Name</Label>
                <Input id="sub-name" required value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="sub-price">Price</Label>
                  <Input id="sub-price" type="number" step="0.01" min="0" required
                    value={form.price}
                    onChange={(e) => setForm({ ...form, price: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Period</Label>
                  <Select
                    value={form.period}
                    onValueChange={(v) => setForm({ ...form, period: v as Form["period"] })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="annual">Annual</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="sub-currency">Currency</Label>
                  <Input id="sub-currency" maxLength={3} value={form.currency}
                    onChange={(e) => setForm({ ...form, currency: e.target.value.toUpperCase() })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sub-start">Start Date</Label>
                  <Input id="sub-start" type="date" value={form.startDate}
                    onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="sub-cat">Category (optional)</Label>
                <Input id="sub-cat" value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })} />
              </div>
              <DialogFooter>
                <Button type="submit">Save</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Totals */}
      <Card>
        <CardContent className="flex flex-col gap-3 pt-6 sm:flex-row sm:flex-wrap sm:items-baseline sm:justify-between sm:gap-4">
          <div>
            <p className="text-xs text-muted-foreground sm:text-sm">Total per {viewLabel(view)}</p>
            <p className="text-2xl font-bold tabular-nums sm:text-3xl">{currency} {totalAtView.toFixed(2)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground sm:text-sm">
              {isFuture ? "Projected spend by" : "Spent as of"} {asOf}
            </p>
            <p className="text-2xl font-bold tabular-nums sm:text-3xl">{currency} {cumulative.toFixed(2)}</p>
          </div>
          <p className="text-xs text-muted-foreground sm:text-sm">
            Monthly equivalent: {currency} {totalMonthly.toFixed(2)}
          </p>
        </CardContent>
      </Card>

      {/* Filter line */}
      <Card>
        <CardContent className="flex flex-col gap-3 pt-6 sm:flex-row sm:flex-wrap sm:items-end sm:gap-4">
          <div className="space-y-2">
            <Label htmlFor="sub-sort">Sort by</Label>
            <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
              <SelectTrigger id="sub-sort" className="w-full sm:w-48"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="cost-desc">Cost (high → low)</SelectItem>
                <SelectItem value="cost-asc">Cost (low → high)</SelectItem>
                <SelectItem value="name-asc">Name (A → Z)</SelectItem>
                <SelectItem value="date-desc">Newest first</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="sub-view">View as</Label>
            <Select value={view} onValueChange={(v) => setView(v as ViewMode)}>
              <SelectTrigger id="sub-view" className="w-full sm:w-48"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Per day</SelectItem>
                <SelectItem value="monthly">Per month</SelectItem>
                <SelectItem value="quarterly">Per quarter</SelectItem>
                <SelectItem value="annual">Per year</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="sub-asof">As of date</Label>
            <Input id="sub-asof" type="date" value={asOf}
              onChange={(e) => setAsOf(e.target.value)} className="w-full sm:w-48" />
          </div>
        </CardContent>
      </Card>

      {/* Grouped lists */}
      <div className="grid gap-4 sm:gap-6 md:grid-cols-2">
        <Group title={`Monthly (${monthly.length})`} items={monthly} view={view} onDelete={deleteSub} />
        <Group title={`Annual (${annual.length})`} items={annual} view={view} onDelete={deleteSub} />
      </div>
    </div>
  );
}

function Group({
  title, items, view, onDelete,
}: {
  title: string;
  items: Subscription[];
  view: ViewMode;
  onDelete: (id: string) => void;
}) {
  if (items.length === 0) {
    return (
      <div>
        <h2 className="mb-3 font-semibold">{title}</h2>
        <p className="text-sm text-muted-foreground">None.</p>
      </div>
    );
  }
  return (
    <div>
      <h2 className="mb-3 font-semibold">{title}</h2>
      <div className="space-y-2">
        {items.map((s) => (
          <Card key={s.id}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm">{s.name}</CardTitle>
              <Button variant="ghost" size="icon" onClick={() => onDelete(s.id)}>
                <Trash2 className="h-3 w-3" />
              </Button>
            </CardHeader>
            <CardContent className="pt-0">
              <p className="text-xs text-muted-foreground">
                {s.currency} {s.price.toFixed(2)} / {s.period}
                {" · "}
                <span className="font-medium">
                  {s.currency} {convert(perMonth(s), view).toFixed(2)} / {viewLabel(view)}
                </span>
                {s.category ? ` · ${s.category}` : ""}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}