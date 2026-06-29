"use client";

import { AlertTriangle, Pencil, Plus, Trash2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { spentForBudget } from "@/lib/budget";
import { convertToBase, formatMoney } from "@/lib/format";
import { useCurrency } from "@/lib/hooks/use-currency";
import { useRates } from "@/lib/hooks/use-rates";
import { useResource } from "@/lib/hooks/use-resource";
import type { Expense } from "../expenses/create-expense-dialog";
import { type Budget, CreateBudgetDialog } from "./create-budget-dialog";

type Mode = { kind: "create" } | { kind: "edit"; record: Budget };

export function BudgetClient() {
	const {
		items: budgets,
		mutate,
		remove: removeBudget,
	} = useResource<Budget>("/api/budgets");
	const { items: expenses } = useResource<Expense>("/api/expenses");
	const { currency } = useCurrency();
	const { rates } = useRates(currency);

	const [open, setOpen] = useState(false);
	const [mode, setMode] = useState<Mode>({ kind: "create" });

	// Tag suggestions drawn from existing expenses so a budget targets tags that
	// actually appear in spending.
	const allTags = useMemo(() => {
		const set = new Map<string, string>();
		for (const e of expenses) {
			for (const t of e.tags) {
				const k = t.toLowerCase();
				if (!set.has(k)) set.set(k, t);
			}
		}
		return [...set.values()].sort((a, b) => a.localeCompare(b));
	}, [expenses]);

	const rows = useMemo(
		() =>
			budgets.map((b) => {
				const cap = convertToBase(b.amount, b.currency, currency, rates);
				const spent = spentForBudget(b, expenses, currency, rates);
				const pct = cap > 0 ? (spent / cap) * 100 : 0;
				return { budget: b, cap, spent, pct, over: spent > cap };
			}),
		[budgets, expenses, currency, rates],
	);

	// One-time warning toast when any budget is already over its cap this month.
	const warned = useRef(false);
	useEffect(() => {
		if (warned.current || rows.length === 0) return;
		const over = rows.filter((r) => r.over);
		if (over.length > 0) {
			warned.current = true;
			toast.warning(
				over.length === 1
					? `"${over[0].budget.name}" is over budget this month`
					: `${over.length} budgets are over this month`,
			);
		}
	}, [rows]);

	async function remove(id: string) {
		try {
			await removeBudget(id);
		} catch (err) {
			toast.error(
				err instanceof Error ? err.message : "Failed to delete budget",
			);
		}
	}

	function openCreate() {
		setMode({ kind: "create" });
		setOpen(true);
	}

	function openEdit(b: Budget) {
		setMode({ kind: "edit", record: b });
		setOpen(true);
	}

	return (
		<div className="space-y-4 sm:space-y-6">
			<div className="flex flex-col gap-1">
				<h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
					Budgets
				</h1>
				<p className="text-sm text-muted-foreground sm:text-base">
					Set a monthly cap and track this month&apos;s spending against it.
					Amounts shown in {currency}.
				</p>
			</div>
			<div className="flex justify-end">
				<Button onClick={openCreate} className="w-full sm:w-auto">
					<Plus className="mr-2 h-4 w-4" /> Create
				</Button>
			</div>

			{rows.length === 0 ? (
				<Card>
					<CardContent className="py-10 text-center text-sm text-muted-foreground">
						No budgets yet. Use the Create button above to add one.
					</CardContent>
				</Card>
			) : (
				<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
					{rows.map(({ budget: b, cap, spent, pct, over }) => (
						<Card key={b.id}>
							<CardContent className="space-y-3 pt-6">
								<div className="flex items-start justify-between gap-2">
									<div className="min-w-0">
										<p className="truncate text-sm font-semibold">{b.name}</p>
										<p className="text-xs text-muted-foreground">
											{b.tags.length === 0
												? "All expenses"
												: b.tags.join(", ")}
										</p>
									</div>
									<div className="flex shrink-0 gap-1">
										<Button
											variant="ghost"
											size="icon"
											onClick={() => openEdit(b)}
											aria-label="Edit"
										>
											<Pencil className="h-3 w-3" />
										</Button>
										<Button
											variant="ghost"
											size="icon"
											onClick={() => remove(b.id)}
											aria-label="Delete"
										>
											<Trash2 className="h-3 w-3" />
										</Button>
									</div>
								</div>

								<ProgressBar pct={pct} over={over} />

								<div className="flex items-center justify-between text-sm tabular-nums">
									<span className={over ? "font-semibold text-destructive" : ""}>
										{formatMoney(spent, currency)}
									</span>
									<span className="text-muted-foreground">
										/ {formatMoney(cap, currency)}
									</span>
								</div>
								{over && (
									<p className="flex items-center gap-1 text-xs font-medium text-destructive">
										<AlertTriangle className="h-3 w-3" />
										Over by {formatMoney(spent - cap, currency)}
									</p>
								)}
							</CardContent>
						</Card>
					))}
				</div>
			)}

			<CreateBudgetDialog
				open={open}
				onOpenChange={setOpen}
				onSaved={mutate}
				mode={mode}
				onModeChange={setMode}
				tagSuggestions={allTags}
			/>
		</div>
	);
}

function ProgressBar({ pct, over }: { pct: number; over: boolean }) {
	const width = Math.min(100, Math.max(0, pct));
	return (
		<div
			className="h-2 w-full overflow-hidden rounded-full bg-muted"
			role="progressbar"
			aria-valuenow={Math.round(pct)}
			aria-valuemin={0}
			aria-valuemax={100}
		>
			<div
				className={`h-full rounded-full transition-all ${over ? "bg-destructive" : "bg-primary"}`}
				style={{ width: `${width}%` }}
			/>
		</div>
	);
}
