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
