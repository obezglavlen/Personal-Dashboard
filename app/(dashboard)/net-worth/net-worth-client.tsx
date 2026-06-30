"use client";

import { Pencil, Plus, Trash2, Wallet } from "lucide-react";
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
import { CURRENCIES, currencyLabel } from "@/lib/currencies";
import { convertToBase, formatMoney } from "@/lib/format";
import { useCurrency } from "@/lib/hooks/use-currency";
import { useRates } from "@/lib/hooks/use-rates";
import { useResource } from "@/lib/hooks/use-resource";
import { ACCOUNT_TYPES } from "@/lib/validations/account";

type Account = {
	id: string;
	name: string;
	type: string;
	balance: number;
	currency: string;
};
type Goal = {
	id: string;
	name: string;
	target: number;
	current: number;
	currency: string;
};

export function NetWorthClient() {
	const accounts = useResource<Account>("/api/accounts");
	const goals = useResource<Goal>("/api/goals");
	const { currency } = useCurrency();
	const { rates } = useRates(currency);

	const [acctOpen, setAcctOpen] = useState(false);
	const [acctEdit, setAcctEdit] = useState<Account | null>(null);
	const [goalOpen, setGoalOpen] = useState(false);
	const [goalEdit, setGoalEdit] = useState<Goal | null>(null);

	const toBase = (amount: number, from: string) =>
		convertToBase(amount, from, currency, rates);

	const netWorth = useMemo(
		() => accounts.items.reduce((s, a) => s + toBase(a.balance, a.currency), 0),
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[accounts.items, currency, rates],
	);

	const { assets, liabilities } = useMemo(() => {
		let assets = 0;
		let liabilities = 0;
		for (const a of accounts.items) {
			const v = toBase(a.balance, a.currency);
			if (v >= 0) assets += v;
			else liabilities += v;
		}
		return { assets, liabilities };
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [accounts.items, currency, rates]);

	async function removeAccount(id: string) {
		try {
			await accounts.remove(id);
		} catch (e) {
			toast.error(e instanceof Error ? e.message : "Failed to delete");
		}
	}
	async function removeGoal(id: string) {
		try {
			await goals.remove(id);
		} catch (e) {
			toast.error(e instanceof Error ? e.message : "Failed to delete");
		}
	}

	return (
		<div className="space-y-4 sm:space-y-6">
			<div className="flex flex-col gap-1">
				<h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
					Net Worth
				</h1>
				<p className="text-sm text-muted-foreground sm:text-base">
					Track account balances and savings goals. Amounts in {currency}.
				</p>
			</div>

			{/* Summary */}
			<div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
				<Card>
					<CardContent className="pt-6">
						<p className="text-xs text-muted-foreground sm:text-sm">Net worth</p>
						<p
							className={`text-2xl font-bold tabular-nums sm:text-3xl ${netWorth < 0 ? "text-destructive" : ""}`}
						>
							{formatMoney(netWorth, currency)}
						</p>
					</CardContent>
				</Card>
				<Card>
					<CardContent className="pt-6">
						<p className="text-xs text-muted-foreground sm:text-sm">Assets</p>
						<p className="text-2xl font-bold tabular-nums text-green-600 dark:text-green-500 sm:text-3xl">
							{formatMoney(assets, currency)}
						</p>
					</CardContent>
				</Card>
				<Card>
					<CardContent className="pt-6">
						<p className="text-xs text-muted-foreground sm:text-sm">
							Liabilities
						</p>
						<p className="text-2xl font-bold tabular-nums text-destructive sm:text-3xl">
							{formatMoney(liabilities, currency)}
						</p>
					</CardContent>
				</Card>
			</div>

			{/* Accounts */}
			<section className="space-y-3">
				<div className="flex items-center justify-between">
					<h2 className="text-lg font-semibold">Accounts</h2>
					<Button
						size="sm"
						onClick={() => {
							setAcctEdit(null);
							setAcctOpen(true);
						}}
					>
						<Plus className="mr-2 h-4 w-4" /> Add account
					</Button>
				</div>
				{accounts.items.length === 0 ? (
					<Card>
						<CardContent className="py-8 text-center text-sm text-muted-foreground">
							No accounts yet.
						</CardContent>
					</Card>
				) : (
					<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
						{accounts.items.map((a) => (
							<Card key={a.id}>
								<CardContent className="flex items-start justify-between gap-2 pt-6">
									<div className="min-w-0">
										<div className="flex items-center gap-2">
											<Wallet className="h-4 w-4 shrink-0 text-muted-foreground" />
											<p className="truncate text-sm font-semibold">{a.name}</p>
										</div>
										<p className="mt-1 text-xs capitalize text-muted-foreground">
											{a.type}
										</p>
										<p
											className={`mt-2 text-lg font-bold tabular-nums ${a.balance < 0 ? "text-destructive" : ""}`}
										>
											{formatMoney(a.balance, a.currency)}
										</p>
									</div>
									<div className="flex shrink-0 gap-1">
										<Button
											variant="ghost"
											size="icon"
											onClick={() => {
												setAcctEdit(a);
												setAcctOpen(true);
											}}
											aria-label="Edit"
										>
											<Pencil className="h-3 w-3" />
										</Button>
										<Button
											variant="ghost"
											size="icon"
											onClick={() => removeAccount(a.id)}
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
			</section>

			{/* Goals */}
			<section className="space-y-3">
				<div className="flex items-center justify-between">
					<h2 className="text-lg font-semibold">Savings goals</h2>
					<Button
						size="sm"
						onClick={() => {
							setGoalEdit(null);
							setGoalOpen(true);
						}}
					>
						<Plus className="mr-2 h-4 w-4" /> Add goal
					</Button>
				</div>
				{goals.items.length === 0 ? (
					<Card>
						<CardContent className="py-8 text-center text-sm text-muted-foreground">
							No goals yet.
						</CardContent>
					</Card>
				) : (
					<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
						{goals.items.map((g) => {
							const pct = g.target > 0 ? (g.current / g.target) * 100 : 0;
							const done = g.current >= g.target;
							return (
								<Card key={g.id}>
									<CardContent className="space-y-2 pt-6">
										<div className="flex items-start justify-between gap-2">
											<p className="truncate text-sm font-semibold">{g.name}</p>
											<div className="flex shrink-0 gap-1">
												<Button
													variant="ghost"
													size="icon"
													onClick={() => {
														setGoalEdit(g);
														setGoalOpen(true);
													}}
													aria-label="Edit"
												>
													<Pencil className="h-3 w-3" />
												</Button>
												<Button
													variant="ghost"
													size="icon"
													onClick={() => removeGoal(g.id)}
													aria-label="Delete"
												>
													<Trash2 className="h-3 w-3" />
												</Button>
											</div>
										</div>
										<div className="h-2 w-full overflow-hidden rounded-full bg-muted">
											<div
												className={`h-full rounded-full transition-all ${done ? "bg-green-600 dark:bg-green-500" : "bg-primary"}`}
												style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
											/>
										</div>
										<div className="flex items-center justify-between text-sm tabular-nums">
											<span>{formatMoney(g.current, g.currency)}</span>
											<span className="text-muted-foreground">
												/ {formatMoney(g.target, g.currency)}
											</span>
										</div>
										<p className="text-xs text-muted-foreground">
											{Math.round(pct)}%{done ? " · reached 🎉" : ""}
										</p>
									</CardContent>
								</Card>
							);
						})}
					</div>
				)}
			</section>

			<AccountDialog
				open={acctOpen}
				onOpenChange={setAcctOpen}
				edit={acctEdit}
				globalCurrency={currency}
				onSaved={accounts.mutate}
			/>
			<GoalDialog
				open={goalOpen}
				onOpenChange={setGoalOpen}
				edit={goalEdit}
				globalCurrency={currency}
				onSaved={goals.mutate}
			/>
		</div>
	);
}

function AccountDialog({
	open,
	onOpenChange,
	edit,
	globalCurrency,
	onSaved,
}: {
	open: boolean;
	onOpenChange: (v: boolean) => void;
	edit: Account | null;
	globalCurrency: string;
	onSaved: () => void;
}) {
	const [name, setName] = useState("");
	const [type, setType] = useState("cash");
	const [balance, setBalance] = useState("");
	const [currency, setCurrency] = useState(globalCurrency);

	useEffect(() => {
		if (!open) return;
		setName(edit?.name ?? "");
		setType(edit?.type ?? "cash");
		setBalance(edit ? String(edit.balance) : "");
		setCurrency(edit?.currency ?? globalCurrency);
	}, [open, edit, globalCurrency]);

	async function submit(e: React.FormEvent) {
		e.preventDefault();
		const body = { name, type, balance: balance === "" ? 0 : Number(balance), currency };
		try {
			if (edit) await apiPatch(`/api/accounts/${edit.id}`, body);
			else await apiPost("/api/accounts", body);
			toast.success(edit ? "Account updated" : "Account added");
			onSaved();
			onOpenChange(false);
		} catch (err) {
			toast.error("Failed to save account", {
				description: err instanceof Error ? err.message : undefined,
			});
		}
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>{edit ? "Edit account" : "Add account"}</DialogTitle>
				</DialogHeader>
				<form onSubmit={submit} className="space-y-4">
					<div className="space-y-2">
						<Label htmlFor="acct-name">Name</Label>
						<Input
							id="acct-name"
							required
							value={name}
							onChange={(e) => setName(e.target.value)}
							placeholder="e.g. Main checking"
						/>
					</div>
					<div className="grid grid-cols-2 gap-4">
						<div className="space-y-2">
							<Label htmlFor="acct-type">Type</Label>
							<Select value={type} onValueChange={setType}>
								<SelectTrigger id="acct-type">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{ACCOUNT_TYPES.map((t) => (
										<SelectItem key={t} value={t} className="capitalize">
											{t}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
						<div className="space-y-2">
							<Label htmlFor="acct-currency">Currency</Label>
							<Select value={currency} onValueChange={setCurrency}>
								<SelectTrigger id="acct-currency">
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
						<Label htmlFor="acct-balance">Balance</Label>
						<Input
							id="acct-balance"
							type="number"
							step="0.01"
							required
							value={balance}
							onChange={(e) => setBalance(e.target.value)}
							placeholder="Negative for loans / credit"
						/>
					</div>
					<DialogFooter>
						<Button type="submit">{edit ? "Save" : "Add"}</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}

function GoalDialog({
	open,
	onOpenChange,
	edit,
	globalCurrency,
	onSaved,
}: {
	open: boolean;
	onOpenChange: (v: boolean) => void;
	edit: Goal | null;
	globalCurrency: string;
	onSaved: () => void;
}) {
	const [name, setName] = useState("");
	const [target, setTarget] = useState("");
	const [current, setCurrent] = useState("");
	const [currency, setCurrency] = useState(globalCurrency);

	useEffect(() => {
		if (!open) return;
		setName(edit?.name ?? "");
		setTarget(edit ? String(edit.target) : "");
		setCurrent(edit ? String(edit.current) : "");
		setCurrency(edit?.currency ?? globalCurrency);
	}, [open, edit, globalCurrency]);

	async function submit(e: React.FormEvent) {
		e.preventDefault();
		const body = {
			name,
			target: target === "" ? 0 : Number(target),
			current: current === "" ? 0 : Number(current),
			currency,
		};
		try {
			if (edit) await apiPatch(`/api/goals/${edit.id}`, body);
			else await apiPost("/api/goals", body);
			toast.success(edit ? "Goal updated" : "Goal added");
			onSaved();
			onOpenChange(false);
		} catch (err) {
			toast.error("Failed to save goal", {
				description: err instanceof Error ? err.message : undefined,
			});
		}
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>{edit ? "Edit goal" : "Add goal"}</DialogTitle>
				</DialogHeader>
				<form onSubmit={submit} className="space-y-4">
					<div className="space-y-2">
						<Label htmlFor="goal-name">Name</Label>
						<Input
							id="goal-name"
							required
							value={name}
							onChange={(e) => setName(e.target.value)}
							placeholder="e.g. Emergency fund"
						/>
					</div>
					<div className="grid grid-cols-2 gap-4">
						<div className="space-y-2">
							<Label htmlFor="goal-target">Target</Label>
							<Input
								id="goal-target"
								type="number"
								step="0.01"
								min="0"
								required
								value={target}
								onChange={(e) => setTarget(e.target.value)}
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="goal-current">Saved so far</Label>
							<Input
								id="goal-current"
								type="number"
								step="0.01"
								min="0"
								value={current}
								onChange={(e) => setCurrent(e.target.value)}
							/>
						</div>
					</div>
					<div className="space-y-2">
						<Label htmlFor="goal-currency">Currency</Label>
						<Select value={currency} onValueChange={setCurrency}>
							<SelectTrigger id="goal-currency">
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
					<DialogFooter>
						<Button type="submit">{edit ? "Save" : "Add"}</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
