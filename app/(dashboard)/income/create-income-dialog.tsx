"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import useSWR from "swr";
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
import { apiPatch, apiPost, fetcher } from "@/lib/api-client";
import { CURRENCIES, currencyLabel } from "@/lib/currencies";

export type Income = {
	id: string;
	taxConfigId: string | null;
	taxConfigName: string | null;
	currency: string | null;
	date: string;
	amount: number | null;
	description: string | null;
	createdAt: string;
};

type Config = {
	id: string;
	name: string;
	currency: string;
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
	const { data: configs } = useSWR<Config[]>("/api/tax-configs", fetcher);

	const today = new Date();
	const initial = useMemo(() => {
		if (mode.kind === "edit") {
			const r = mode.record;
			const d = new Date(r.date);
			return {
				taxConfigId: r.taxConfigId ?? "",
				month: String(d.getUTCMonth() + 1),
				year: String(d.getUTCFullYear()),
				amount: r.amount != null ? String(r.amount) : "",
				description: r.description ?? "",
			};
		}
		return {
			taxConfigId: "",
			month: String(today.getMonth() + 1),
			year: String(today.getFullYear()),
			amount: "",
			description: "",
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [mode]);

	const [taxConfigId, setTaxConfigId] = useState<string>(initial.taxConfigId);
	const [month, setMonth] = useState<string>(initial.month);
	const [year, setYear] = useState<string>(initial.year);
	const [amount, setAmount] = useState<string>(initial.amount);
	const [description, setDescription] = useState<string>(initial.description);
	const [currency, setCurrency] = useState("USD");

	// Re-sync local form state whenever the dialog opens in a new mode.
	useEffect(() => {
		if (!open) return;
		setTaxConfigId(initial.taxConfigId);
		setMonth(initial.month);
		setYear(initial.year);
		setAmount(initial.amount);
		setDescription(initial.description);
		if (mode.kind === "edit") {
			setCurrency(mode.record.currency ?? "USD");
		} else {
			const cfg = configs?.find((c) => c.id === initial.taxConfigId);
			setCurrency(cfg?.currency ?? "USD");
		}
	}, [open, initial, configs, mode]);

	function onConfigChange(v: string) {
		setTaxConfigId(v);
		const cfg = configs?.find((c) => c.id === v);
		if (cfg?.currency) setCurrency(cfg.currency);
	}

	async function submit(e: React.FormEvent) {
		e.preventDefault();
		const body = {
			taxConfigId: taxConfigId || null,
			month: Number(month),
			year: Number(year),
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
							: "Record income for a month, optionally scoped to a tax type."}
					</DialogDescription>
				</DialogHeader>
				<form onSubmit={submit} className="space-y-4">
					<div className="space-y-2">
						<Label>Tax Type</Label>
						<Select value={taxConfigId} onValueChange={onConfigChange}>
							<SelectTrigger>
								<SelectValue placeholder="(none)" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="">(none)</SelectItem>
								{configs?.map((c) => (
									<SelectItem key={c.id} value={c.id}>
										{c.name}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>

					<div className="grid grid-cols-2 gap-4">
						<div className="space-y-2">
							<Label htmlFor="inc-month">Month</Label>
							<Input
								id="inc-month"
								type="number"
								min={1}
								max={12}
								required
								value={month}
								onChange={(e) => setMonth(e.target.value)}
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="inc-year">Year</Label>
							<Input
								id="inc-year"
								type="number"
								min={1900}
								max={3000}
								required
								value={year}
								onChange={(e) => setYear(e.target.value)}
							/>
						</div>
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
