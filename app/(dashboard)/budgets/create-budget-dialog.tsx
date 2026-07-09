"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogClose,
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

export type Budget = {
	id: string;
	name: string;
	amount: number;
	currency: string;
	period: string;
	tags: string[];
	createdAt: string;
};

type Mode = { kind: "create" } | { kind: "edit"; record: Budget };

export function CreateBudgetDialog({
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
				tags: r.tags,
			};
		}
		return {
			name: "",
			amount: "",
			currency: globalCurrency,
			tags: [] as string[],
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [mode]);

	const [name, setName] = useState(initial.name);
	const [amount, setAmount] = useState(initial.amount);
	const [currency, setCurrency] = useState(initial.currency);
	const [tags, setTags] = useState<string[]>(initial.tags);

	useEffect(() => {
		if (!open) return;
		setName(initial.name);
		setAmount(initial.amount);
		setCurrency(mode.kind === "edit" ? initial.currency : globalCurrency);
		setTags(initial.tags);
	}, [open, initial, mode.kind, globalCurrency]);

	async function submit(e: React.FormEvent) {
		e.preventDefault();
		const body = {
			name,
			amount: amount !== "" ? Number(amount) : 0,
			currency,
			period: "monthly",
			tags,
		};
		try {
			if (mode.kind === "edit") {
				await apiPatch(`/api/budgets/${mode.record.id}`, body);
			} else {
				await apiPost("/api/budgets", body);
			}
			toast.success(mode.kind === "edit" ? "Budget updated" : "Budget created");
			onSaved();
			onModeChange({ kind: "create" });
			onOpenChange(false);
		} catch (err) {
			toast.error(
				mode.kind === "edit"
					? "Failed to update budget"
					: "Failed to create budget",
				{ description: err instanceof Error ? err.message : undefined },
			);
		}
	}

	const title = mode.kind === "edit" ? "Edit Budget" : "Create Budget";
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
						A monthly spending cap. Leave tags empty to track every expense, or
						add tags to cap a category.
					</DialogDescription>
				</DialogHeader>
				<form onSubmit={submit} className="space-y-4">
					<div className="space-y-2">
						<Label htmlFor="bud-name">Name</Label>
						<Input
							id="bud-name"
							required
							value={name}
							onChange={(e) => setName(e.target.value)}
							placeholder="e.g. Dining out"
						/>
					</div>

					<div className="grid grid-cols-3 gap-4">
						<div className="col-span-2 space-y-2">
							<Label htmlFor="bud-amount">Monthly cap</Label>
							<Input
								id="bud-amount"
								type="number"
								step="0.01"
								min="0"
								required
								value={amount}
								onChange={(e) => setAmount(e.target.value)}
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="bud-currency">Currency</Label>
							<Select value={currency} onValueChange={setCurrency}>
								<SelectTrigger id="bud-currency">
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
						<Label htmlFor="bud-tags">Tags</Label>
						<TagInput
							id="bud-tags"
							value={tags}
							onChange={setTags}
							suggestions={tagSuggestions}
							placeholder="food, entertainment…  (empty = all expenses)"
						/>
					</div>

					<DialogFooter>
						<DialogClose asChild>
							<Button type="button" variant="outline">
								Cancel
							</Button>
						</DialogClose>
						<Button type="submit">{submitLabel}</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
