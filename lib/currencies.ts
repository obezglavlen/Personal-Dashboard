/** Shared currency option list used by the profile selector and expense forms. */
export const CURRENCIES = [
	"USD",
	"EUR",
	"GBP",
	"PLN",
	"UAH",
	"BYN",
	"JPY",
	"CHF",
	"CAD",
	"AUD",
] as const;

export type CurrencyCode = (typeof CURRENCIES)[number];

// Explicit symbols for the supported set — Intl returns the bare code for some
// (PLN, BYN, CHF) in common locales, which wouldn't show a symbol at all.
const SYMBOLS: Record<string, string> = {
	USD: "$",
	EUR: "€",
	GBP: "£",
	PLN: "zł",
	UAH: "₴",
	BYN: "Br",
	JPY: "¥",
	CHF: "Fr",
	CAD: "$",
	AUD: "$",
};

/** Symbol for a currency code (e.g. "USD" -> "$"), with Intl as fallback. */
export function currencySymbol(code: string): string {
	if (SYMBOLS[code]) return SYMBOLS[code];
	try {
		const part = new Intl.NumberFormat(undefined, {
			style: "currency",
			currency: code,
		})
			.formatToParts(0)
			.find((p) => p.type === "currency");
		return part?.value ?? code;
	} catch {
		return code;
	}
}

/** Display label pairing code with symbol, e.g. "USD $". */
export function currencyLabel(code: string): string {
	const sym = currencySymbol(code);
	return sym === code ? code : `${code} ${sym}`;
}
