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
import { Textarea } from "@/components/ui/textarea";
import { apiPatch, apiPost } from "@/lib/api-client";
import { CURRENCIES, currencyLabel } from "@/lib/currencies";

export type Income = {
	id: string;
	currency: string | null;
	date: string;
	amount: number | null;
	description: string | null;
	createdAt: string;
};

type Mode = { kind: "create" } | { kind: "edit"; record: Income };

export function CreateIncomeDialog({
	open,
	onOpenChange,
	onSaved,
	mode,
	onModeChange,
}: {
	open: boolean;
	onOpenChange: (v: boolean) => void;
	onSaved: () => void;
	mode: Mode;
	onModeChange: (m: Mode) => void;
}) {
	const today = new Date();
	const initial = useMemo(() => {
		if (mode.kind === "edit") {
			const r = mode.record;
			return {
				date: r.date.slice(0, 10),
				amount: r.amount != null ? String(r.amount) : "",
				description: r.description ?? "",
			};
		}
		return {
			date: today.toISOString().slice(0, 10),
			amount: "",
			description: "",
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [mode]);

	const [date, setDate] = useState<string>(initial.date);
	const [amount, setAmount] = useState<string>(initial.amount);
	const [description, setDescription] = useState<string>(initial.description);
	const [currency, setCurrency] = useState("USD");

	// Re-sync local form state whenever the dialog opens in a new mode.
	useEffect(() => {
		if (!open) return;
		setDate(initial.date);
		setAmount(initial.amount);
		setDescription(initial.description);
		setCurrency(mode.kind === "edit" ? (mode.record.currency ?? "USD") : "USD");
	}, [open, initial, mode]);

	async function submit(e: React.FormEvent) {
		e.preventDefault();
		const body = {
			date,
			amount: amount !== "" ? Number(amount) : null,
			currency,
			description: description || null,
		};
		try {
			if (mode.kind === "edit") {
				await apiPatch(`/api/income/${mode.record.id}`, body);
			} else {
				await apiPost("/api/income", body);
			}
			toast.success(mode.kind === "edit" ? "Income updated" : "Income created");
			onSaved();
			onModeChange({ kind: "create" });
			onOpenChange(false);
		} catch (err) {
			toast.error(
				mode.kind === "edit"
					? "Failed to update income"
					: "Failed to create income",
				{ description: err instanceof Error ? err.message : undefined },
			);
		}
	}

	const title = mode.kind === "edit" ? "Edit Income" : "Create Income";
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
						{mode.kind === "edit"
							? "Update this income entry."
							: "Record income for a date."}
					</DialogDescription>
				</DialogHeader>
				<form onSubmit={submit} className="space-y-4">
					<div className="space-y-2">
						<Label htmlFor="inc-date">Date</Label>
						<Input
							id="inc-date"
							type="date"
							required
							value={date}
							onChange={(e) => setDate(e.target.value)}
						/>
					</div>

					<div className="grid grid-cols-3 gap-4">
						<div className="col-span-2 space-y-2">
							<Label htmlFor="inc-amount">Amount</Label>
							<Input
								id="inc-amount"
								type="number"
								step="0.01"
								min="0"
								value={amount}
								onChange={(e) => setAmount(e.target.value)}
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="inc-currency">Currency</Label>
							<Select value={currency} onValueChange={setCurrency}>
								<SelectTrigger id="inc-currency">
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
						<Label htmlFor="inc-desc">Description (optional)</Label>
						<Textarea
							id="inc-desc"
							rows={2}
							value={description}
							onChange={(e) => setDescription(e.target.value)}
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
