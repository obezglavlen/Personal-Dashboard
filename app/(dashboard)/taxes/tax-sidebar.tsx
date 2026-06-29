"use client";

import { useState } from "react";
import useSWR from "swr";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Trash2 } from "lucide-react";

export type TaxConfig = {
  id: string;
  name: string;
  rate: number;
  staticAmount: number | null;
  currency: string;
};

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function TaxSidebar() {
  const { data: configs, mutate } = useSWR<TaxConfig[]>("/api/tax-configs", fetcher);
  const [name, setName] = useState("");
  const [rate, setRate] = useState("");
  const [staticAmount, setStaticAmount] = useState("");
  const [currency, setCurrency] = useState("USD");

  async function add(e: React.FormEvent) {
    e.preventDefault();
    const body = {
      name,
      rate: rate === "" ? 0 : Number(rate),
      staticAmount: staticAmount === "" ? null : Number(staticAmount),
      currency: currency.toUpperCase(),
    };
    const res = await fetch("/api/tax-configs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      toast.error("Failed to add tax", { description: err.error ?? JSON.stringify(err) });
      return;
    }
    setName("");
    setRate("");
    setStaticAmount("");
    setCurrency("USD");
    toast.success("Tax added");
    mutate();
  }

  async function remove(id: string) {
    await fetch(`/api/tax-configs/${id}`, { method: "DELETE" });
    mutate();
  }

  return (
    <Card className="sticky top-6">
      <CardHeader>
        <CardTitle>Tax Types</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={add} className="space-y-2">
          <div className="space-y-1">
            <Label htmlFor="tax-name">Name</Label>
            <Input
              id="tax-name"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. VAT"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="tax-rate">Rate (%)</Label>
            <Input
              id="tax-rate"
              type="number"
              step="0.01"
              min="0"
              max="100"
              value={rate}
              onChange={(e) => setRate(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="tax-amount">Static amount (optional)</Label>
            <Input
              id="tax-amount"
              type="number"
              step="0.01"
              min="0"
              value={staticAmount}
              onChange={(e) => setStaticAmount(e.target.value)}
              placeholder="pre-fills Create form"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="tax-currency">Currency</Label>
            <Input
              id="tax-currency"
              maxLength={3}
              value={currency}
              onChange={(e) => setCurrency(e.target.value.toUpperCase())}
              placeholder="USD"
            />
          </div>
          <Button type="submit" size="sm" className="w-full">
            <Plus className="mr-2 h-3 w-3" /> Add Tax
          </Button>
        </form>

        <div className="space-y-2">
          {configs?.length === 0 && (
            <p className="text-xs text-muted-foreground">No tax types yet.</p>
          )}
          {configs?.map((c) => (
            <div
              key={c.id}
              className="flex items-center justify-between rounded-md border px-3 py-2"
            >
              <div>
                <p className="text-sm font-medium">{c.name}</p>
                <p className="text-xs text-muted-foreground">
                  {c.rate}% ·{" "}
                  {c.staticAmount != null
                    ? `${c.staticAmount.toFixed(2)} ${c.currency}`
                    : `no static amount`}
                </p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => remove(c.id)}>
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}