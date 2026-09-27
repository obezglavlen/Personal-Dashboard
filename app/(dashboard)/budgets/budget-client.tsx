"use client";

import { AlertTriangle, Pencil, Plus, Trash2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { budgetProgress } from "@/lib/budget";
import { formatMoney } from "@/lib/format";
import { useCurrency } from "@/lib/hooks/use-currency";
import { useRates } from "@/lib/hooks/use-rates";
import { useResource } from "@/lib/hooks/use-resource";
import type { Expense } from "../expenses/create-expense-dialog";
import { useAllTags } from "@/lib/hooks/use-all-tags";
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

	// Shared tag catalog (universal across all money modals).
	const allTags = useAllTags();

	const rows = useMemo(
		() =>
			budgets.map((b) => ({
				budget: b,
				progress: budgetProgress(b, expenses, currency, rates),
			})),
		[budgets, expenses, currency, rates],
	);

	// One-time warning toast when any budget is already over its cap this month.
	const warned = useRef(false);
	useEffect(() => {
		if (warned.current || rows.length === 0) return;
		const over = rows.filter(
			(r) => r.progress.status === "available" && r.progress.over,
		);
		if (over.length > 0) {
			warned.current = true;
			toast.warning(
				over.length === 1
					? `"${over[0].budget.name}" exceeded its limit this month`
					: `${over.length} limits have been exceeded this month`,
			);
		}
	}, [rows]);

	async function remove(id: string) {
		try {
			await removeBudget(id);
		} catch (err) {
			toast.error(
				err instanceof Error ? err.message : "Failed to delete limit",
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
					Limits
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
						No limits yet. Use the Create button above to add one.
					</CardContent>
				</Card>
			) : (
				<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
					{rows.map(({ budget: b, progress }) => (
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

								{progress.status === "unavailable" ? (
									<p className="text-xs text-muted-foreground" role="status">
										Conversion unavailable: missing {progress.missingCurrencies.join(", ")} rate.
									</p>
								) : (
									<>
										<ProgressBar pct={progress.pct} over={progress.over} />
										<div className="flex items-center justify-between text-sm tabular-nums">
											<span className={progress.over ? "font-semibold text-destructive" : ""}>
												{formatMoney(progress.spent, currency)}
											</span>
											<span className="text-muted-foreground">
												/ {formatMoney(progress.cap, currency)}
											</span>
										</div>
										{progress.over && (
											<p className="flex items-center gap-1 text-xs font-medium text-destructive">
												<AlertTriangle className="h-3 w-3" />
												Over by {formatMoney(progress.spent - progress.cap, currency)}
											</p>
										)}
									</>
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
