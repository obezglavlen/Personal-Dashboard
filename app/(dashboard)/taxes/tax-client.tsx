"use client";

import { useMemo, useState } from "react";
import useSWR from "swr";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2, Pencil } from "lucide-react";
import {
  CreateTaxRecordDialog,
  type TaxRecord,
} from "./create-tax-record-dialog";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const TYPE_LABEL: Record<TaxRecord["type"], string> = {
  income: "Income",
  expense: "Expense",
  declaration_sent: "Declaration Sent",
  declaration_todo: "Declaration To Do",
};

type Mode =
  | { kind: "create" }
  | { kind: "edit"; record: TaxRecord };

export function TaxClient() {
  const { data: records, mutate } = useSWR<TaxRecord[]>("/api/tax-records", fetcher);
  const [typeFilter, setTypeFilter] = useState<"all" | TaxRecord["type"]>("all");
  const [configFilter, setConfigFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode>({ kind: "create" });

  const filtered = useMemo(() => {
    if (!records) return [];
    return records.filter((r) => {
      if (typeFilter !== "all" && r.type !== typeFilter) return false;
      if (configFilter !== "all" && r.taxConfigId !== configFilter) return false;
      if (
        search &&
        !(r.description ?? "").toLowerCase().includes(search.toLowerCase())
      ) {
        return false;
      }
      return true;
    });
  }, [records, typeFilter, configFilter, search]);

  async function remove(id: string) {
    await fetch(`/api/tax-records/${id}`, { method: "DELETE" });
    mutate();
  }

  function openCreate() {
    setMode({ kind: "create" });
    setOpen(true);
  }

  function openEdit(r: TaxRecord) {
    setMode({ kind: "edit", record: r });
    setOpen(true);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold tracking-tight">Taxes</h1>
        <p className="text-muted-foreground">
          Track income, expenses, and declaration status per tax type.
        </p>
      </div>
      <div className="flex justify-end">
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" /> Create
        </Button>
      </div>

      <Card>
        <CardContent className="flex flex-wrap items-end gap-4 pt-6">
          <div className="space-y-2">
            <Label>Type</Label>
            <Select
              value={typeFilter}
              onValueChange={(v) => setTypeFilter(v as typeof typeFilter)}
            >
              <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="income">Income</SelectItem>
                <SelectItem value="expense">Expense</SelectItem>
                <SelectItem value="declaration_sent">Declaration Sent</SelectItem>
                <SelectItem value="declaration_todo">Declaration To Do</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="tax-config-filter">Tax Type</Label>
            <TaxConfigFilterSelect value={configFilter} onChange={setConfigFilter} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="tax-search">Search</Label>
            <Input
              id="tax-search"
              placeholder="Description…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-48"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-muted-foreground">
              <tr>
                <th className="pb-2">Date</th>
                <th className="pb-2">Type</th>
                <th className="pb-2">Tax</th>
                <th className="pb-2 text-right">Amount</th>
                <th className="pb-2">Description</th>
                <th className="pb-2"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-muted-foreground">
                    No records. Use the Create button above.
                  </td>
                </tr>
              )}
              {filtered.map((r) => (
                <tr key={r.id} className="border-t">
                  <td className="py-2">{r.date.slice(0, 7)}</td>
                  <td className="py-2">{TYPE_LABEL[r.type]}</td>
                  <td className="py-2">{r.taxConfigName ?? "—"}</td>
                  <td className="py-2 text-right tabular-nums">
                    {r.amount != null ? r.amount.toFixed(2) : "—"}
                  </td>
                  <td className="py-2 text-muted-foreground">{r.description ?? ""}</td>
                  <td className="py-2 text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEdit(r)}
                        aria-label="Edit"
                      >
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => remove(r.id)}
                        aria-label="Delete"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <CreateTaxRecordDialog
        open={open}
        onOpenChange={setOpen}
        onSaved={mutate}
        mode={mode}
        onModeChange={setMode}
      />
    </div>
  );
}

function TaxConfigFilterSelect({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const { data } = useSWR<{ id: string; name: string }[]>(
    "/api/tax-configs",
    fetcher
  );
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger id="tax-config-filter" className="w-48">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All</SelectItem>
        {data?.map((c) => (
          <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}