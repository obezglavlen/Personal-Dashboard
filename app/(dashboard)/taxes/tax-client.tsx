"use client";

import { Pencil, Plus, Trash2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { formatMoney } from "@/lib/format";
import { useResource } from "@/lib/hooks/use-resource";
import {
	CreateTaxRecordDialog,
	type TaxRecord,
} from "./create-tax-record-dialog";

type Mode = { kind: "create" } | { kind: "edit"; record: TaxRecord };

export function TaxClient() {
	const {
		items: records,
		mutate,
		remove: removeRecord,
	} = useResource<TaxRecord>("/api/tax-records");
	const [configFilter, setConfigFilter] = useState<string>("all");
	const [search, setSearch] = useState("");
	const [open, setOpen] = useState(false);
	const [mode, setMode] = useState<Mode>({ kind: "create" });
	const [selected, setSelected] = useState<Set<string>>(new Set());
	const [pageSize, setPageSize] = useState(10);
	const [page, setPage] = useState(0);

	const filtered = useMemo(() => {
		if (!records) return [];
		return records.filter((r) => {
			if (configFilter !== "all" && r.taxConfigId !== configFilter)
				return false;
			if (
				search &&
				!(r.description ?? "").toLowerCase().includes(search.toLowerCase())
			) {
				return false;
			}
			return true;
		});
	}, [records, configFilter, search]);

	// Reset to first page when filters or page size change.
	useEffect(() => {
		setPage(0);
	}, [configFilter, search, pageSize]);

	const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
	const clampedPage = Math.min(page, totalPages - 1);
	const paged = filtered.slice(
		clampedPage * pageSize,
		clampedPage * pageSize + pageSize,
	);

	const pageIds = paged.map((r) => r.id);
	const allPageSelected =
		pageIds.length > 0 && pageIds.every((id) => selected.has(id));
	const somePageSelected = pageIds.some((id) => selected.has(id));

	// Total + count are computed over filtered rows only, so records hidden
	// by a filter never sneak into the sum even if still selected.
	const selectedCount = useMemo(
		() => filtered.filter((r) => selected.has(r.id)).length,
		[filtered, selected],
	);
	const selectedTotal = useMemo(
		() =>
			filtered.reduce(
				(sum, r) =>
					selected.has(r.id) && r.amount != null ? sum + r.amount : sum,
				0,
			),
		[filtered, selected],
	);

	function toggle(id: string) {
		setSelected((prev) => {
			const next = new Set(prev);
			if (next.has(id)) next.delete(id);
			else next.add(id);
			return next;
		});
	}

	function togglePage() {
		setSelected((prev) => {
			const next = new Set(prev);
			if (allPageSelected) pageIds.forEach((id) => next.delete(id));
			else pageIds.forEach((id) => next.add(id));
			return next;
		});
	}

	function clearSelection() {
		setSelected(new Set());
	}

	async function remove(id: string) {
		try {
			await removeRecord(id);
		} catch (err) {
			toast.error(
				err instanceof Error ? err.message : "Failed to delete record",
			);
		}
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
		<div className="space-y-4 sm:space-y-6">
			<div className="flex flex-col gap-1">
				<h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Taxes</h1>
				<p className="text-sm text-muted-foreground sm:text-base">
					Track tax expenses per tax type.
				</p>
			</div>
			<div className="flex justify-end">
				<Button onClick={openCreate} className="w-full sm:w-auto">
					<Plus className="mr-2 h-4 w-4" /> Create
				</Button>
			</div>

			<Card>
				<CardContent className="flex flex-col gap-3 pt-6 sm:flex-row sm:flex-wrap sm:items-end sm:gap-4">
					<div className="space-y-2">
						<Label htmlFor="tax-config-filter">Tax Type</Label>
						<TaxConfigFilterSelect
							value={configFilter}
							onChange={setConfigFilter}
						/>
					</div>
					<div className="space-y-2 sm:flex-1 sm:min-w-48">
						<Label htmlFor="tax-search">Search</Label>
						<Input
							id="tax-search"
							placeholder="Description…"
							value={search}
							onChange={(e) => setSearch(e.target.value)}
							className="w-full sm:w-48"
						/>
					</div>
				</CardContent>
			</Card>

			{/* Selection total — appears only when ≥1 record selected */}
			{selectedCount > 0 && (
				<Card className="border-primary/50 bg-primary/5">
					<CardContent className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
						<span className="text-sm font-medium">
							{selectedCount} selected
						</span>
						<div className="flex items-center gap-4">
							<span className="text-base font-bold tabular-nums">
								Total: {selectedTotal.toFixed(2)}
							</span>
							<Button variant="ghost" size="sm" onClick={clearSelection}>
								Clear
							</Button>
						</div>
					</CardContent>
				</Card>
			)}

			{/* Desktop table */}
			<Card className="hidden md:block">
				<CardContent className="overflow-x-auto pt-6">
					<table className="w-full text-sm">
						<thead className="text-left text-xs text-muted-foreground">
							<tr>
								<th className="w-8 pb-2">
									<Checkbox
										checked={allPageSelected}
										indeterminate={somePageSelected && !allPageSelected}
										onChange={togglePage}
										ariaLabel="Select all on page"
									/>
								</th>
								<th className="pb-2">Date</th>
								<th className="pb-2">Tax</th>
								<th className="pb-2 text-right">Amount</th>
								<th className="pb-2 pl-6">Description</th>
								<th className="pb-2"></th>
							</tr>
						</thead>
						<tbody>
							{filtered.length === 0 && (
								<tr>
									<td
										colSpan={6}
										className="py-6 text-center text-muted-foreground"
									>
										No records. Use the Create button above.
									</td>
								</tr>
							)}
							{paged.map((r) => (
								<tr key={r.id} className="border-t">
									<td className="py-2">
										<Checkbox
											checked={selected.has(r.id)}
											onChange={() => toggle(r.id)}
											ariaLabel="Select record"
										/>
									</td>
									<td className="py-2">{r.date.slice(0, 7)}</td>
									<td className="py-2">{r.taxConfigName ?? "—"}</td>
									<td className="py-2 text-right tabular-nums">
										{r.amount != null
											? formatMoney(r.amount, r.currency ?? "USD")
											: "—"}
									</td>
									<td className="py-2 pl-6 text-muted-foreground">
										{r.description ?? ""}
									</td>
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
					{filtered.length > 0 && (
						<Pagination
							page={clampedPage}
							totalPages={totalPages}
							total={filtered.length}
							pageSize={pageSize}
							onPageChange={setPage}
							onPageSizeChange={setPageSize}
						/>
					)}
				</CardContent>
			</Card>

			{/* Mobile card list — same data, stacked layout */}
			<div className="space-y-3 md:hidden">
				{filtered.length === 0 && (
					<Card>
						<CardContent className="py-8 text-center text-sm text-muted-foreground">
							No records. Use the Create button above.
						</CardContent>
					</Card>
				)}
				{paged.map((r) => (
					<Card key={r.id}>
						<CardContent className="space-y-2 pt-4">
							<div className="flex items-start justify-between gap-2">
								<div className="min-w-0 flex-1">
									<div className="flex flex-wrap items-center gap-2">
										<Checkbox
											checked={selected.has(r.id)}
											onChange={() => toggle(r.id)}
											ariaLabel="Select record"
										/>
										<span className="text-sm font-semibold">
											{r.date.slice(0, 7)}
										</span>
									</div>
									<p className="mt-1 text-sm text-muted-foreground">
										{r.taxConfigName ?? "—"}
									</p>
									{r.description && (
										<p className="mt-1 text-sm">{r.description}</p>
									)}
								</div>
								<div className="flex shrink-0 gap-1">
									<Button
										variant="ghost"
										size="icon"
										onClick={() => openEdit(r)}
										aria-label="Edit"
									>
										<Pencil className="h-4 w-4" />
									</Button>
									<Button
										variant="ghost"
										size="icon"
										onClick={() => remove(r.id)}
										aria-label="Delete"
									>
										<Trash2 className="h-4 w-4" />
									</Button>
								</div>
							</div>
							{r.amount != null && (
								<p className="text-right text-base font-bold tabular-nums">
									{formatMoney(r.amount, r.currency ?? "USD")}
								</p>
							)}
						</CardContent>
					</Card>
				))}
				{filtered.length > 0 && (
					<Card>
						<CardContent className="py-3">
							<Pagination
								page={clampedPage}
								totalPages={totalPages}
								total={filtered.length}
								pageSize={pageSize}
								onPageChange={setPage}
								onPageSizeChange={setPageSize}
							/>
						</CardContent>
					</Card>
				)}
			</div>

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
	const { items: data } = useResource<{ id: string; name: string }>(
		"/api/tax-configs",
	);
	return (
		<Select value={value} onValueChange={onChange}>
			<SelectTrigger id="tax-config-filter" className="w-full sm:w-48">
				<SelectValue />
			</SelectTrigger>
			<SelectContent>
				<SelectItem value="all">All</SelectItem>
				{data?.map((c) => (
					<SelectItem key={c.id} value={c.id}>
						{c.name}
					</SelectItem>
				))}
			</SelectContent>
		</Select>
	);
}

function Checkbox({
	checked,
	indeterminate,
	onChange,
	ariaLabel,
}: {
	checked: boolean;
	indeterminate?: boolean;
	onChange: () => void;
	ariaLabel: string;
}) {
	const ref = useRef<HTMLInputElement>(null);
	useEffect(() => {
		if (ref.current) ref.current.indeterminate = !!indeterminate && !checked;
	}, [indeterminate, checked]);
	return (
		<input
			ref={ref}
			type="checkbox"
			checked={checked}
			onChange={onChange}
			aria-label={ariaLabel}
			className="h-4 w-4 cursor-pointer rounded border-input accent-primary"
		/>
	);
}

const PAGE_SIZES = [10, 25, 50, 100];

function Pagination({
	page,
	totalPages,
	total,
	pageSize,
	onPageChange,
	onPageSizeChange,
}: {
	page: number;
	totalPages: number;
	total: number;
	pageSize: number;
	onPageChange: (p: number) => void;
	onPageSizeChange: (s: number) => void;
}) {
	const from = total === 0 ? 0 : page * pageSize + 1;
	const to = Math.min(total, page * pageSize + pageSize);
	return (
		<div className="mt-4 flex flex-col gap-3 border-t pt-4 text-sm sm:flex-row sm:items-center sm:justify-between">
			<div className="flex items-center gap-2">
				<span className="text-muted-foreground">Per page</span>
				<Select
					value={String(pageSize)}
					onValueChange={(v) => onPageSizeChange(Number(v))}
				>
					<SelectTrigger className="w-20">
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						{PAGE_SIZES.map((s) => (
							<SelectItem key={s} value={String(s)}>
								{s}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</div>
			<div className="flex items-center gap-3">
				<span className="text-muted-foreground tabular-nums">
					{from}–{to} of {total}
				</span>
				<div className="flex gap-1">
					<Button
						variant="outline"
						size="sm"
						onClick={() => onPageChange(page - 1)}
						disabled={page <= 0}
					>
						Prev
					</Button>
					<Button
						variant="outline"
						size="sm"
						onClick={() => onPageChange(page + 1)}
						disabled={page >= totalPages - 1}
					>
						Next
					</Button>
				</div>
			</div>
		</div>
	);
}
