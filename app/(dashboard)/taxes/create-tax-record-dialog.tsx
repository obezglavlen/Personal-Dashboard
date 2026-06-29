"use client";

import { useEffect, useState } from "react";
import useSWR from "swr";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

type Type = "income" | "expense" | "declaration_sent" | "declaration_todo";

type Config = {
  id: string;
  name: string;
  staticAmount: number | null;
  currency: string;
};

export function CreateTaxRecordDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreated: () => void;
}) {
  const { data: configs } = useSWR<Config[]>("/api/tax-configs", fetcher);
  const today = new Date();
  const [type, setType] = useState<Type>("income");
  const [taxConfigId, setTaxConfigId] = useState<string>("");
  const [month, setMonth] = useState<string>(String(today.getMonth() + 1));
  const [year, setYear] = useState<string>(String(today.getFullYear()));
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [description, setDescription] = useState("");
  const [prefilled, setPrefilled] = useState(false);

  const showAmount = type === "income" || type === "expense";
  const selectedConfig = configs?.find((c) => c.id === taxConfigId);

  // Pre-fill amount + currency from the chosen tax config's static defaults.
  // Only fires once per selection so user edits aren't overwritten.
  useEffect(() => {
    if (!selectedConfig) {
      setPrefilled(false);
      return;
    }
    if (!prefilled) {
      if (selectedConfig.staticAmount != null) {
        setAmount(String(selectedConfig.staticAmount));
      }
      setCurrency(selectedConfig.currency || "USD");
      setPrefilled(true);
    }
  }, [selectedConfig, prefilled]);

  // When user switches tax config, allow re-prefilling on the next selection
  function onConfigChange(v: string) {
    setTaxConfigId(v);
    setPrefilled(false);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const body = {
      type,
      taxConfigId: taxConfigId || null,
      month: Number(month),
      year: Number(year),
      amount: showAmount && amount !== "" ? Number(amount) : null,
      description: description || null,
    };
    const res = await fetch("/api/tax-records", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      toast.error("Failed to create record", {
        description: JSON.stringify(err),
      });
      return;
    }
    toast.success("Record created");
    setAmount("");
    setDescription("");
    setTaxConfigId("");
    setCurrency("USD");
    setPrefilled(false);
    onOpenChange(false);
    onCreated();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Record</DialogTitle>
          <DialogDescription>Income, expense, or declaration entry.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label>Type</Label>
            <Select value={type} onValueChange={(v) => setType(v as Type)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="income">Income</SelectItem>
                <SelectItem value="expense">Expense</SelectItem>
                <SelectItem value="declaration_sent">Declaration Sent</SelectItem>
                <SelectItem value="declaration_todo">Declaration To Do</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Tax Type</Label>
            <Select value={taxConfigId} onValueChange={onConfigChange}>
              <SelectTrigger><SelectValue placeholder="(none)" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="">(none)</SelectItem>
                {configs?.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                    {c.staticAmount != null
                      ? ` — ${c.staticAmount.toFixed(2)} ${c.currency}`
                      : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedConfig?.staticAmount != null && (
              <p className="text-xs text-muted-foreground">
                Pre-filled from {selectedConfig.name}: {selectedConfig.staticAmount.toFixed(2)} {selectedConfig.currency}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="rec-month">Month</Label>
              <Input
                id="rec-month"
                type="number"
                min={1}
                max={12}
                required
                value={month}
                onChange={(e) => setMonth(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="rec-year">Year</Label>
              <Input
                id="rec-year"
                type="number"
                min={1900}
                max={3000}
                required
                value={year}
                onChange={(e) => setYear(e.target.value)}
              />
            </div>
          </div>

          {showAmount && (
            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-2 space-y-2">
                <Label htmlFor="rec-amount">Amount</Label>
                <Input
                  id="rec-amount"
                  type="number"
                  step="0.01"
                  min="0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="rec-currency">Currency</Label>
                <Input
                  id="rec-currency"
                  maxLength={3}
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value.toUpperCase())}
                />
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="rec-desc">Description (optional)</Label>
            <Textarea
              id="rec-desc"
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <DialogFooter>
            <Button type="submit">Create</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}