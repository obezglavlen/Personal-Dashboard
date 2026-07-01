"use client";

import {
	ArrowDownCircle,
	ArrowUpCircle,
	Pencil,
	Plus,
	RefreshCw,
	Trash2,
	Zap,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { apiPatch, apiPost } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { TagInput } from "@/components/ui/tag-input";
import { CURRENCIES, currencyLabel } from "@/lib/currencies";
import { convertToBase, formatMoney } from "@/lib/format";
import { useCurrency } from "@/lib/hooks/use-currency";
import { useRates } from "@/lib/hooks/use-rates";
import { useResource } from "@/lib/hooks/use-resource";

type Recurring = {
	id: string;
	name: string;
	amount: number;
	type: "income" | "expense";
	period: "monthly" | "annual";
	startDate: string;
	endDate: string | null;
	currency: string;
	category: string | null;
	tags: string[];
	autoPost: boolean;
	lastPostedAt: string | null;
};

type Form = {
	name: string;
	type: "income" | "expense";
	amount: string;
	currency: string;
	period: "monthly" | "annual";
	startDate: string;
	endDate: string;
	category: string;
	tags: string[];
	autoPost: boolean;
};

const EMPTY: Form = {
	name: "",
	type: "expense",
	amount: "",
	currency: "USD",
	period: "monthly",
	startDate: new Date().toISOString().slice(0, 10),
	endDate: "",
	category: "",
	tags: [],
	autoPost: false,
};

/** Monthly-equivalent amount (annual amortized over 12). */
function perMonth(r: Recurring): number {
	return r.period === "annual" ? r.amount / 12 : r.amount;
}

export function RecurringClient() {
	const { items, isLoading, mutate, remove } =
		useResource<Recurring>("/api/recurring");
	const { currency } = useCurrency();
	const { rates } = useRates(currency);

	const [open, setOpen] = useState(false);
	const [edit, setEdit] = useState<Recurring | null>(null);
	const [posting, setPosting] = useState(false);

	const toBase = (amount: number, from: string) =>
		convertToBase(amount, from, currency, rates);

	const totals = useMemo(() => {
		let income = 0;
		let expense = 0;
		for (const r of items) {
			const m = toBase(perMonth(r), r.currency);
			if (r.type === "income") income += m;
			else expense += m;
		}
		return { income, expense, net: income - expense };
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [items, currency, rates]);

	async function postDue() {
		setPosting(true);
		try {
			const res = await apiPost<{ posted: number }>(
				"/api/recurring/post-due",
				{},
			);
			toast.success(
				res.posted > 0
					? `Posted ${res.posted} due ${res.posted === 1 ? "entry" : "entries"}`
					: "Nothing due right now",
			);
			mutate();
		} catch (e) {
			toast.error(e instanceof Error ? e.message : "Failed to post");
		} finally {
			setPosting(false);
		}
	}

	async function del(id: string) {
		try {
			await remove(id);
		} catch (e) {
			toast.error(e instanceof Error ? e.message : "Failed to delete");
		}
	}

	return (
		<div className="space-y-4 sm:space-y-6">
			<div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
				<div className="flex flex-col gap-1">
					<h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
						Recurring
					</h1>
					<p className="text-sm text-muted-foreground sm:text-base">
						Recurring income and expenses. Auto-post turns each due charge into
						an expense (or income) automatically. Amounts in {currency}.
					</p>
				</div>
				<div className="flex gap-2">
					<Button
						variant="outline"
						size="sm"
						onClick={postDue}
						disabled={posting}
					>
						<RefreshCw className="mr-2 h-4 w-4" /> Post due now
					</Button>
					<Button
						size="sm"
						onClick={() => {
							setEdit(null);
							setOpen(true);
						}}
					>
						<Plus className="mr-2 h-4 w-4" /> Add recurring
					</Button>
				</div>
			</div>

			{/* Monthly-equivalent summary */}
			<div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
				<SummaryCard label="Income / mo" value={totals.income} currency={currency} tone="positive" />
				<SummaryCard label="Expense / mo" value={totals.expense} currency={currency} tone="negative" />
				<SummaryCard
					label="Net / mo"
					value={totals.net}
					currency={currency}
					tone={totals.net >= 0 ? "positive" : "negative"}
				/>
			</div>

			{isLoading ? (
				<p className="text-sm text-muted-foreground">Loading…</p>
			) : items.length === 0 ? (
				<Card>
					<CardContent className="py-8 text-center text-sm text-muted-foreground">
						No recurring transactions yet.
					</CardContent>
				</Card>
			) : (
				<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
					{items.map((r) => (
						<Card key={r.id}>
							<CardContent className="flex items-start justify-between gap-2 pt-6">
								<div className="min-w-0">
									<div className="flex items-center gap-2">
										{r.type === "income" ? (
											<ArrowUpCircle className="h-4 w-4 shrink-0 text-green-600 dark:text-green-500" />
										) : (
											<ArrowDownCircle className="h-4 w-4 shrink-0 text-destructive" />
										)}
										<p className="truncate text-sm font-semibold">{r.name}</p>
										{r.autoPost && (
											<Zap
												className="h-3 w-3 shrink-0 text-amber-500"
												aria-label="Auto-post on"
											/>
										)}
									</div>
									<p className="mt-1 text-xs capitalize text-muted-foreground">
										{r.period}
										{r.category ? ` · ${r.category}` : ""}
									</p>
									<p className="mt-2 text-lg font-bold tabular-nums">
										{formatMoney(r.amount, r.currency)}
									</p>
									<p className="text-xs text-muted-foreground">
										{formatMoney(toBase(perMonth(r), r.currency), currency)} / mo
										{r.endDate ? ` · ends ${r.endDate.slice(0, 10)}` : ""}
									</p>
								</div>
								<div className="flex shrink-0 gap-1">
									<Button
										variant="ghost"
										size="icon"
										onClick={() => {
											setEdit(r);
											setOpen(true);
										}}
										aria-label="Edit"
									>
										<Pencil className="h-3 w-3" />
									</Button>
									<Button
										variant="ghost"
										size="icon"
										onClick={() => del(r.id)}
										aria-label="Delete"
									>
										<Trash2 className="h-3 w-3" />
									</Button>
								</div>
							</CardContent>
						</Card>
					))}
				</div>
			)}

			<RecurringDialog
				open={open}
				onOpenChange={setOpen}
				edit={edit}
				globalCurrency={currency}
				onSaved={mutate}
			/>
		</div>
	);
}

function SummaryCard({
	label,
	value,
	currency,
	tone,
}: {
	label: string;
	value: number;
	currency: string;
	tone?: "positive" | "negative";
}) {
	const color =
		tone === "positive"
			? "text-green-600 dark:text-green-500"
			: tone === "negative"
				? "text-destructive"
				: "";
	return (
		<Card>
			<CardContent className="pt-6">
				<p className="text-xs text-muted-foreground sm:text-sm">{label}</p>
				<p className={`text-2xl font-bold tabular-nums sm:text-3xl ${color}`}>
					{formatMoney(value, currency)}
				</p>
			</CardContent>
		</Card>
	);
}

function RecurringDialog({
	open,
	onOpenChange,
	edit,
	globalCurrency,
	onSaved,
}: {
	open: boolean;
	onOpenChange: (v: boolean) => void;
	edit: Recurring | null;
	globalCurrency: string;
	onSaved: () => void;
}) {
	const [form, setForm] = useState<Form>(EMPTY);

	useEffect(() => {
		if (!open) return;
		setForm(
			edit
				? {
						name: edit.name,
						type: edit.type,
						amount: String(edit.amount),
						currency: edit.currency,
						period: edit.period,
						startDate: edit.startDate.slice(0, 10),
						endDate: edit.endDate ? edit.endDate.slice(0, 10) : "",
						category: edit.category ?? "",
						tags: edit.tags,
						autoPost: edit.autoPost,
					}
				: { ...EMPTY, currency: globalCurrency },
		);
	}, [open, edit, globalCurrency]);

	function set<K extends keyof Form>(key: K, value: Form[K]) {
		setForm((f) => ({ ...f, [key]: value }));
	}

	async function submit(e: React.FormEvent) {
		e.preventDefault();
		const body = {
			name: form.name,
			type: form.type,
			amount: form.amount === "" ? 0 : Number(form.amount),
			currency: form.currency,
			period: form.period,
			startDate: form.startDate,
			endDate: form.endDate || null,
			category: form.category || null,
			tags: form.tags,
			autoPost: form.autoPost,
		};
		try {
			if (edit) await apiPatch(`/api/recurring/${edit.id}`, body);
			else await apiPost("/api/recurring", body);
			toast.success(edit ? "Recurring updated" : "Recurring added");
			onSaved();
			onOpenChange(false);
		} catch (err) {
			toast.error("Failed to save", {
				description: err instanceof Error ? err.message : undefined,
			});
		}
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>
						{edit ? "Edit recurring" : "Add recurring"}
					</DialogTitle>
				</DialogHeader>
				<form onSubmit={submit} className="space-y-4">
					<div className="space-y-2">
						<Label htmlFor="rec-name">Name</Label>
						<Input
							id="rec-name"
							required
							value={form.name}
							onChange={(e) => set("name", e.target.value)}
							placeholder="e.g. Rent, Salary"
						/>
					</div>
					<div className="grid grid-cols-2 gap-4">
						<div className="space-y-2">
							<Label htmlFor="rec-type">Type</Label>
							<Select
								value={form.type}
								onValueChange={(v) => set("type", v as Form["type"])}
							>
								<SelectTrigger id="rec-type">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="expense">Expense</SelectItem>
									<SelectItem value="income">Income</SelectItem>
								</SelectContent>
							</Select>
						</div>
						<div className="space-y-2">
							<Label htmlFor="rec-period">Period</Label>
							<Select
								value={form.period}
								onValueChange={(v) => set("period", v as Form["period"])}
							>
								<SelectTrigger id="rec-period">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="monthly">Monthly</SelectItem>
									<SelectItem value="annual">Annual</SelectItem>
								</SelectContent>
							</Select>
						</div>
					</div>
					<div className="grid grid-cols-2 gap-4">
						<div className="space-y-2">
							<Label htmlFor="rec-amount">Amount</Label>
							<Input
								id="rec-amount"
								type="number"
								step="0.01"
								min="0"
								required
								value={form.amount}
								onChange={(e) => set("amount", e.target.value)}
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="rec-currency">Currency</Label>
							<Select
								value={form.currency}
								onValueChange={(v) => set("currency", v)}
							>
								<SelectTrigger id="rec-currency">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{CURRENCIES.map((c) => (
										<SelectItem key={c} value={c}>
											{currencyLabel(c)}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
					</div>
					<div className="grid grid-cols-2 gap-4">
						<div className="space-y-2">
							<Label htmlFor="rec-start">Start date</Label>
							<Input
								id="rec-start"
								type="date"
								required
								value={form.startDate}
								onChange={(e) => set("startDate", e.target.value)}
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="rec-end">End date (optional)</Label>
							<Input
								id="rec-end"
								type="date"
								value={form.endDate}
								onChange={(e) => set("endDate", e.target.value)}
							/>
						</div>
					</div>
					<div className="space-y-2">
						<Label htmlFor="rec-category">Category (optional)</Label>
						<Input
							id="rec-category"
							value={form.category}
							onChange={(e) => set("category", e.target.value)}
							placeholder="e.g. housing"
						/>
					</div>
					<div className="space-y-2">
						<Label>Tags (expenses)</Label>
						<TagInput
							value={form.tags}
							onChange={(tags) => set("tags", tags)}
							placeholder="Add a tag…"
						/>
					</div>
					<label className="flex items-center gap-2 text-sm">
						<input
							type="checkbox"
							checked={form.autoPost}
							onChange={(e) => set("autoPost", e.target.checked)}
							className="h-4 w-4 rounded border-input"
						/>
						Auto-post each due charge
					</label>
					<DialogFooter>
						<Button type="submit">{edit ? "Save" : "Add"}</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
