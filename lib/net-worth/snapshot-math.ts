import { convertToBase } from "@/lib/format";
import type { RatesMap } from "@/lib/rates-history";

/**
 * Pure net-worth aggregation shared by the capture job (server) and the trend
 * chart (client). No Prisma/network so it is unit-testable in the node env.
 */

export interface BalanceLike {
	balance: number;
	currency: string;
}

/** Sum account balances grouped by currency: `{ USD: 1200.5, EUR: -300 }`. */
export function sumBalancesByCurrency(
	accounts: BalanceLike[],
): Record<string, number> {
	const out: Record<string, number> = {};
	for (const a of accounts) {
		out[a.currency] = (out[a.currency] ?? 0) + a.balance;
	}
	return out;
}

/**
 * Total of a by-currency map converted into `base` at the given rates. Missing
 * rates leave that currency's amount unconverted (see `convertToBase`).
 */
export function netWorthInBase(
	byCurrency: Record<string, number>,
	base: string,
	rates: RatesMap,
): number {
	let total = 0;
	for (const [cur, amt] of Object.entries(byCurrency)) {
		total += convertToBase(amt, cur, base, rates);
	}
	return total;
}
