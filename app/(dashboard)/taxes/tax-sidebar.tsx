"use client";

import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { useResource } from "@/lib/hooks/use-resource";

export type TaxConfig = {
	id: string;
	name: string;
	rate: number;
	staticAmount: number | null;
	currency: string;
};

export function TaxSidebar() {
	const {
		items: configs,
		create,
		remove: removeConfig,
	} = useResource<TaxConfig>("/api/tax-configs");
	const [name, setName] = useState("");
	const [rate, setRate] = useState("");
	const [staticAmount, setStaticAmount] = useState("");
	const [currency, setCurrency] = useState("USD");

	async function add(e: React.FormEvent) {
		e.preventDefault();
		const body = {
			name,
			rate: rate === "" ? 0 : Number(rate),
			staticAmount: staticAmount === "" ? null : Number(staticAmount),
			currency: currency.toUpperCase(),
		};
		try {
			await create(body);
			setName("");
			setRate("");
			setStaticAmount("");
			setCurrency("USD");
			toast.success("Tax added");
		} catch (err) {
			toast.error("Failed to add tax", {
				description: err instanceof Error ? err.message : undefined,
			});
		}
	}

	async function remove(id: string) {
		try {
			await removeConfig(id);
		} catch (err) {
			toast.error(err instanceof Error ? err.message : "Failed to delete tax");
		}
	}

	return (
		<Card className="sticky top-6">
			<CardHeader>
				<CardTitle>Tax Types</CardTitle>
			</CardHeader>
			<CardContent className="space-y-4">
				<form onSubmit={add} className="space-y-2">
					<div className="space-y-1">
						<Label htmlFor="tax-name">Name</Label>
						<Input
							id="tax-name"
							required
							value={name}
							onChange={(e) => setName(e.target.value)}
							placeholder="e.g. VAT"
						/>
					</div>
					<div className="space-y-1">
						<Label htmlFor="tax-rate">Rate (%)</Label>
						<Input
							id="tax-rate"
							type="number"
							step="0.01"
							min="0"
							max="100"
							value={rate}
							onChange={(e) => setRate(e.target.value)}
						/>
					</div>
					<div className="space-y-1">
						<Label htmlFor="tax-amount">Static amount (optional)</Label>
						<Input
							id="tax-amount"
							type="number"
							step="0.01"
							min="0"
							value={staticAmount}
							onChange={(e) => setStaticAmount(e.target.value)}
							placeholder="pre-fills Create form"
						/>
					</div>
					<div className="space-y-1">
						<Label htmlFor="tax-currency">Currency</Label>
						<Select value={currency} onValueChange={setCurrency}>
							<SelectTrigger id="tax-currency">
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
					<Button type="submit" size="sm" className="w-full">
						<Plus className="mr-2 h-3 w-3" /> Add Tax
					</Button>
				</form>

				<div className="space-y-2">
					{configs?.length === 0 && (
						<p className="text-xs text-muted-foreground">No tax types yet.</p>
					)}
					{configs?.map((c) => (
						<div
							key={c.id}
							className="flex items-center justify-between rounded-md border px-3 py-2"
						>
							<div>
								<p className="text-sm font-medium">{c.name}</p>
								<p className="text-xs text-muted-foreground">
									{c.rate}% ·{" "}
									{c.staticAmount != null
										? `${c.staticAmount.toFixed(2)} ${c.currency}`
										: `no static amount`}
								</p>
							</div>
							<Button variant="ghost" size="icon" onClick={() => remove(c.id)}>
								<Trash2 className="h-3 w-3" />
							</Button>
						</div>
					))}
				</div>
			</CardContent>
		</Card>
	);
}
