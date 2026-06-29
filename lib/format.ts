/**
 * Format a numeric amount as currency. Falls back to a plain fixed-2 string
 * with the raw code if the runtime rejects the currency code.
 */
/**
 * Convert `amount` from currency `from` into the rates' base currency.
 * `rates[X]` = units of X per 1 base (frankfurter shape), so the inverse
 * converts back to base. Returns the amount unchanged when already in base or
 * when no rate is available (rates not yet loaded, or currency not quoted).
 */
export function convertToBase(
	amount: number,
	from: string,
	base: string,
	rates: Record<string, number>,
): number {
	if (from === base) return amount;
	const r = rates[from];
	return r ? amount / r : amount;
}

export function formatMoney(amount: number, currency = "USD"): string {
	try {
		return new Intl.NumberFormat(undefined, {
			style: "currency",
			currency,
			minimumFractionDigits: 2,
			maximumFractionDigits: 2,
		}).format(amount);
	} catch {
		return `${amount.toFixed(2)} ${currency}`;
	}
}
