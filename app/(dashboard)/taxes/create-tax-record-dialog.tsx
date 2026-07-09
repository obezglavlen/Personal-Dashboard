"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import useSWR from "swr";
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
import { Textarea } from "@/components/ui/textarea";
import { apiPatch, apiPost, fetcher } from "@/lib/api-client";
import { CURRENCIES, currencyLabel } from "@/lib/currencies";

export type TaxRecord = {
	id: string;
	taxConfigId: string | null;
	taxConfigName: string | null;
	currency: string | null;
	date: string;
	amount: number | null;
	description: string | null;
	createdAt: string;
};

// Income rows live in their own resource now; the tax form only reads them to
// pre-fill a rate-based expense amount off a chosen base income record.
type Income = {
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
	rate: number;
	staticAmount: number | null;
	currency: string;
};

type Mode = { kind: "create" } | { kind: "edit"; record: TaxRecord };

export function CreateTaxRecordDialog({
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
	const { data: allIncome } = useSWR<Income[]>(
		open ? "/api/income" : null,
		fetcher,
	);

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
				baseRecordId: "",
			};
		}
		return {
			taxConfigId: "",
			month: String(today.getMonth() + 1),
			year: String(today.getFullYear()),
			amount: "",
			description: "",
			baseRecordId: "",
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [mode]);

	const [taxConfigId, setTaxConfigId] = useState<string>(initial.taxConfigId);
	const [month, setMonth] = useState<string>(initial.month);
	const [year, setYear] = useState<string>(initial.year);
	const [amount, setAmount] = useState<string>(initial.amount);
	const [description, setDescription] = useState<string>(initial.description);
	const [baseRecordId, setBaseRecordId] = useState<string>(
		initial.baseRecordId,
	);
	const [userTouchedAmount, setUserTouchedAmount] = useState(false);
	const [currency, setCurrency] = useState("USD");

	// Re-sync local form state whenever the dialog opens in a new mode (create vs edit)
	useEffect(() => {
		if (!open) return;
		setTaxConfigId(initial.taxConfigId);
		setMonth(initial.month);
		setYear(initial.year);
		setAmount(initial.amount);
		setDescription(initial.description);
		setBaseRecordId("");
		setUserTouchedAmount(false);
		if (mode.kind === "edit") {
			setCurrency(mode.record.currency ?? "USD");
		} else {
			const cfg = configs?.find((c) => c.id === initial.taxConfigId);
			setCurrency(cfg?.currency ?? "USD");
		}
	}, [open, initial, configs, mode]);

	const selectedConfig = configs?.find((c) => c.id === taxConfigId);
	const configHasRate = (selectedConfig?.rate ?? 0) > 0;

	// All income records (used to populate the base-record picker)
	const incomeRecords = useMemo(() => allIncome ?? [], [allIncome]);

	// Income records scoped to the selected tax config (preferred pre-fill source)
	const scopedIncome = useMemo(
		() => incomeRecords.filter((r) => r.taxConfigId === taxConfigId),
		[incomeRecords, taxConfigId],
	);

	// Candidate "base" income record: prefer explicit pick, else scoped+latest, else any+latest
	const defaultBaseRecord = useMemo(() => {
		if (!allIncome) return null;
		const sorted = (xs: Income[]) =>
			[...xs].sort(
				(a, b) =>
					(b.date > a.date ? 1 : b.date < a.date ? -1 : 0) ||
					b.createdAt.localeCompare(a.createdAt),
			);
		if (scopedIncome.length > 0) return sorted(scopedIncome)[0];
		if (incomeRecords.length > 0) return sorted(incomeRecords)[0];
		return null;
	}, [allIncome, scopedIncome, incomeRecords]);

	const effectiveBaseRecordId = baseRecordId || defaultBaseRecord?.id || "";
	const baseRecord = useMemo(
		() => incomeRecords.find((r) => r.id === effectiveBaseRecordId) ?? null,
		[incomeRecords, effectiveBaseRecordId],
	);

	// Pre-fill amount in create mode. Priority:
	//   1. config has rate > 0  -> baseRecord.amount × rate / 100
	//      (fallback 0 if no income records)
	//   2. config has staticAmount -> use staticAmount directly
	//      (fallback 0)
	//   3. nothing to fill from -> leave the field alone
	// Don't overwrite if the user already typed something for the current selection.
	useEffect(() => {
		if (mode.kind !== "create") return;
		if (userTouchedAmount) return;
		if (!selectedConfig) return;

		if (configHasRate) {
			if (baseRecord && baseRecord.amount != null) {
				// rate is stored as a percentage (5 means 5%), so divide by 100
				const computed =
					Math.round(((baseRecord.amount * selectedConfig.rate) / 100) * 100) /
					100;
				setAmount(String(computed));
			} else {
				setAmount("0");
			}
		} else if (selectedConfig.staticAmount != null) {
			setAmount(String(selectedConfig.staticAmount));
		}

		setCurrency(selectedConfig.currency || "USD");
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [taxConfigId, effectiveBaseRecordId, mode.kind]);

	function onConfigChange(v: string) {
		setTaxConfigId(v);
		setBaseRecordId("");
		setUserTouchedAmount(false);
		// Prefill the currency selector from the chosen tax config.
		const cfg = configs?.find((c) => c.id === v);
		if (cfg?.currency) setCurrency(cfg.currency);
	}

	function onBaseRecordChange(v: string) {
		setBaseRecordId(v);
		setUserTouchedAmount(false);
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
				await apiPatch(`/api/tax-records/${mode.record.id}`, body);
			} else {
				await apiPost("/api/tax-records", body);
			}
			toast.success(mode.kind === "edit" ? "Record updated" : "Record created");
			onSaved();
			onModeChange({ kind: "create" });
			onOpenChange(false);
		} catch (err) {
			toast.error(
				mode.kind === "edit"
					? "Failed to update record"
					: "Failed to create record",
				{ description: err instanceof Error ? err.message : undefined },
			);
		}
	}

	const title = mode.kind === "edit" ? "Edit Record" : "Create Record";
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
							? "Update this tax record."
							: "Tax expense entry."}
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
								{configs?.map((c) => {
									const parts: string[] = [];
									if (c.rate > 0) parts.push(`${c.rate}%`);
									if (c.staticAmount != null) {
										parts.push(`${c.staticAmount.toFixed(2)} ${c.currency}`);
									}
									const suffix =
										parts.length > 0 ? ` (${parts.join(" · ")})` : "";
									return (
										<SelectItem key={c.id} value={c.id}>
											{c.name}
											{suffix}
										</SelectItem>
									);
								})}
							</SelectContent>
						</Select>
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

					<>
						{mode.kind === "create" && configHasRate && (
								<div className="space-y-2">
									<Label>Base income record</Label>
									<Select
										value={effectiveBaseRecordId}
										onValueChange={onBaseRecordChange}
									>
										<SelectTrigger>
											<SelectValue placeholder="(auto: latest income)" />
										</SelectTrigger>
										<SelectContent>
											{scopedIncome.length > 0 && (
												<>
													<SelectItem value="_section_scoped" disabled>
														— Same tax type —
													</SelectItem>
													{scopedIncome.map((r) => (
														<SelectItem key={r.id} value={r.id}>
															{r.date.slice(0, 7)} ·{" "}
															{r.amount?.toFixed(2) ?? "—"}{" "}
															{r.description ? `· ${r.description}` : ""}
														</SelectItem>
													))}
												</>
											)}
											{incomeRecords.length > scopedIncome.length && (
												<>
													<SelectItem value="_section_all" disabled>
														— Any tax type —
													</SelectItem>
													{incomeRecords.map((r) => (
														<SelectItem key={r.id} value={r.id}>
															{r.date.slice(0, 7)} ·{" "}
															{r.amount?.toFixed(2) ?? "—"} ·{" "}
															{r.taxConfigName ?? "—"}
														</SelectItem>
													))}
												</>
											)}
											{incomeRecords.length === 0 && (
												<SelectItem value="_none" disabled>
													(no income records — amount will be 0)
												</SelectItem>
											)}
										</SelectContent>
									</Select>
									{baseRecord && selectedConfig && (
										<p className="text-xs text-muted-foreground">
											{baseRecord.amount?.toFixed(2) ?? "0"} ×{" "}
											{selectedConfig.rate}% ={" "}
											<span className="font-medium">
												{baseRecord.amount != null
													? (
															Math.round(
																((baseRecord.amount * selectedConfig.rate) /
																	100) *
																	100,
															) / 100
														).toFixed(2)
													: "0"}{" "}
												{currency}
											</span>
										</p>
									)}
								</div>
							)}

							<div className="grid grid-cols-3 gap-4">
								<div className="col-span-2 space-y-2">
									<Label htmlFor="rec-amount">Amount</Label>
									<Input
										id="rec-amount"
										type="number"
										step="0.01"
										min="0"
										value={amount}
										onChange={(e) => {
											setAmount(e.target.value);
											setUserTouchedAmount(true);
										}}
									/>
								</div>
								<div className="space-y-2">
									<Label htmlFor="rec-currency">Currency</Label>
									<Select value={currency} onValueChange={setCurrency}>
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
					</>

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
