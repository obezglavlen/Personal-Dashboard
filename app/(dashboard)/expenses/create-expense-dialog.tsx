"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
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
import { apiPatch, apiPost } from "@/lib/api-client";
import { CURRENCIES, currencyLabel } from "@/lib/currencies";
import { useCurrency } from "@/lib/hooks/use-currency";

export type Expense = {
	id: string;
	name: string;
	amount: number;
	currency: string;
	date: string;
	tags: string[];
	createdAt: string;
};

type Mode = { kind: "create" } | { kind: "edit"; record: Expense };

/** YYYY-MM-DD for a native date input, in local time. */
function toDateInput(d: Date): string {
	const off = d.getTimezoneOffset();
	return new Date(d.getTime() - off * 60_000).toISOString().slice(0, 10);
}

export function CreateExpenseDialog({
	open,
	onOpenChange,
	onSaved,
	mode,
	onModeChange,
	tagSuggestions,
}: {
	open: boolean;
	onOpenChange: (v: boolean) => void;
	onSaved: () => void;
	mode: Mode;
	onModeChange: (m: Mode) => void;
	tagSuggestions: string[];
}) {
	const { currency: globalCurrency } = useCurrency();

	const initial = useMemo(() => {
		if (mode.kind === "edit") {
			const r = mode.record;
			return {
				name: r.name,
				amount: String(r.amount),
				currency: r.currency,
				date: toDateInput(new Date(r.date)),
				tags: r.tags,
			};
		}
		return {
			name: "",
			amount: "",
			currency: globalCurrency,
			date: toDateInput(new Date()),
			tags: [] as string[],
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [mode]);

	const [name, setName] = useState(initial.name);
	const [amount, setAmount] = useState(initial.amount);
	const [currency, setCurrency] = useState(initial.currency);
	const [date, setDate] = useState(initial.date);
	const [tags, setTags] = useState<string[]>(initial.tags);

	useEffect(() => {
		if (!open) return;
		setName(initial.name);
		setAmount(initial.amount);
		setCurrency(mode.kind === "edit" ? initial.currency : globalCurrency);
		setDate(initial.date);
		setTags(initial.tags);
	}, [open, initial, mode.kind, globalCurrency]);

	async function submit(e: React.FormEvent) {
		e.preventDefault();
		const body = {
			name,
			amount: amount !== "" ? Number(amount) : 0,
			currency,
			date: new Date(`${date}T00:00:00`).toISOString(),
			tags,
		};
		try {
			if (mode.kind === "edit") {
				await apiPatch(`/api/expenses/${mode.record.id}`, body);
			} else {
				await apiPost("/api/expenses", body);
			}
			toast.success(
				mode.kind === "edit" ? "Expense updated" : "Expense created",
			);
			onSaved();
			onModeChange({ kind: "create" });
			onOpenChange(false);
		} catch (err) {
			toast.error(
				mode.kind === "edit"
					? "Failed to update expense"
					: "Failed to create expense",
				{ description: err instanceof Error ? err.message : undefined },
			);
		}
	}

	const title = mode.kind === "edit" ? "Edit Expense" : "Create Expense";
	const submitLabel = mode.kind === "edit" ? "Save" : "Create";

	return (
		<Dialog
			open={open}
			onOpenChange={(v) => {
				onOpenChange(v);
				if (!v) onModeChange({ kind: "create" });
			}}
		>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>{title}</DialogTitle>
					<DialogDescription>
						Record an expense with amount, date, and category tags.
					</DialogDescription>
				</DialogHeader>
				<form onSubmit={submit} className="space-y-4">
					<div className="space-y-2">
						<Label htmlFor="exp-name">Name</Label>
						<Input
							id="exp-name"
							required
							value={name}
							onChange={(e) => setName(e.target.value)}
							placeholder="e.g. Groceries"
						/>
					</div>

					<div className="grid grid-cols-3 gap-4">
						<div className="col-span-2 space-y-2">
							<Label htmlFor="exp-amount">Amount</Label>
							<Input
								id="exp-amount"
								type="number"
								step="0.01"
								min="0"
								required
								value={amount}
								onChange={(e) => setAmount(e.target.value)}
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="exp-currency">Currency</Label>
							<Select value={currency} onValueChange={setCurrency}>
								<SelectTrigger id="exp-currency">
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

					<div className="space-y-2">
						<Label htmlFor="exp-date">Date</Label>
						<Input
							id="exp-date"
							type="date"
							required
							value={date}
							onChange={(e) => setDate(e.target.value)}
						/>
					</div>

					<div className="space-y-2">
						<Label htmlFor="exp-tags">Tags</Label>
						<TagInput
							id="exp-tags"
							value={tags}
							onChange={setTags}
							suggestions={tagSuggestions}
							placeholder="food, entertainment, health…"
						/>
					</div>

					<DialogFooter>
						<Button type="submit">{submitLabel}</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
