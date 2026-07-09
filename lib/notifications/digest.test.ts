import { describe, expect, it } from "vitest";
import { buildDigest, DEFAULT_BUDGET_THRESHOLD, type DigestData } from "./digest";

const now = new Date("2026-06-15T00:00:00Z");

function base(overrides: Partial<DigestData> = {}): DigestData {
	return {
		subscriptions: [],
		budgets: [],
		expenses: [],
		tasks: [],
		events: [],
		income: [],
		netExpenses: [],
		displayCurrency: "USD",
		rates: {},
		prefs: {
			renewals: true,
			budgets: true,
			tasks: true,
			events: true,
			totalNet: true,
			budgetThreshold: DEFAULT_BUDGET_THRESHOLD,
		},
		...overrides,
	};
}

describe("buildDigest", () => {
	it("returns null when there is nothing to report", () => {
		expect(buildDigest(base(), now)).toBeNull();
	});

	it("includes a subscription renewing within the window", () => {
		const msg = buildDigest(
			base({
				subscriptions: [
					{
						name: "Netflix",
						price: 15.99,
						period: "monthly",
						startDate: "2026-05-17",
						currency: "USD",
					},
				],
			}),
			now,
		);
		expect(msg).toContain("Renewals");
		expect(msg).toContain("Netflix");
	});

	it("flags a budget over cap and honors the budgets pref", () => {
		const data = base({
			budgets: [{ name: "Food", amount: 100, currency: "USD", tags: ["food"] }],
			expenses: [
				{ amount: 120, currency: "USD", date: "2026-06-10", tags: ["food"] },
			],
		});
		expect(buildDigest(data, now)).toContain("Food");
		// With budgets off and nothing else to report, the whole digest is empty.
		const off = buildDigest(
			{
				...data,
				prefs: {
					renewals: true,
					budgets: false,
					tasks: true,
					events: true,
					totalNet: true,
					budgetThreshold: DEFAULT_BUDGET_THRESHOLD,
				},
			},
			now,
		);
		expect(off).toBeNull();
	});

	it("ignores a budget below the configured threshold (default 80%)", () => {
		const msg = buildDigest(
			base({
				budgets: [
					{ name: "Food", amount: 100, currency: "USD", tags: ["food"] },
				],
				expenses: [
					{ amount: 50, currency: "USD", date: "2026-06-10", tags: ["food"] },
				],
			}),
			now,
		);
		expect(msg).toBeNull();
	});

	it("surfaces a budget once it crosses a lower custom threshold", () => {
		const data = base({
			budgets: [{ name: "Food", amount: 100, currency: "USD", tags: ["food"] }],
			expenses: [
				{ amount: 60, currency: "USD", date: "2026-06-10", tags: ["food"] },
			],
		});
		// 60% spent: below the default 0.8, but surfaced at a 0.5 threshold.
		expect(buildDigest(data, now)).toBeNull();
		const lowered = buildDigest(
			{ ...data, prefs: { ...data.prefs, budgetThreshold: 0.5 } },
			now,
		);
		expect(lowered).toContain("Food");
		expect(lowered).toContain("60%");
	});

	it("lists overdue and due-today tasks only, skipping done/future", () => {
		const msg = buildDigest(
			base({
				tasks: [
					{ title: "Pay rent", dueDate: "2026-06-10", status: "todo" }, // overdue
					{ title: "Call bank", dueDate: "2026-06-15", status: "todo" }, // due today
					{ title: "Future thing", dueDate: "2026-06-20", status: "todo" }, // later
					{ title: "Old done", dueDate: "2026-06-01", status: "done" }, // done
				],
			}),
			now,
		);
		expect(msg).toContain("Tasks");
		expect(msg).toContain("Pay rent");
		expect(msg).toContain("Call bank");
		expect(msg).not.toContain("Future thing");
		expect(msg).not.toContain("Old done");
	});

	it("lists calendar event reminders and honors the events pref", () => {
		const data = base({
			events: [
				{ title: "Dentist", start: "2026-06-16T09:00:00Z", allDay: false },
			],
		});
		const msg = buildDigest(data, now);
		expect(msg).toContain("Events");
		expect(msg).toContain("Dentist");
		expect(msg).toContain("tomorrow");
		// With events off and nothing else to report, the digest is empty.
		const off = buildDigest(
			{ ...data, prefs: { ...data.prefs, events: false } },
			now,
		);
		expect(off).toBeNull();
	});

	it("reports total-net change vs yesterday and last month", () => {
		const data = base({
			income: [
				{ date: "2026-06-15", amount: 100, currency: "USD" }, // today
				{ date: "2026-05-01", amount: 200, currency: "USD" }, // prior
			],
			netExpenses: [
				{ date: "2026-06-15", amount: 30, currency: "USD" }, // today
				{ date: "2026-05-10", amount: 50, currency: "USD" }, // prior
			],
		});
		const msg = buildDigest(data, now);
		expect(msg).toContain("Total net");
		// Current net = (100+200) − (30+50) = 220.
		expect(msg).toContain("Now: $220.00");
		// Prior (through 06-14 / 05-15) = 200 − 50 = 150; change = +70 → +46.7%.
		expect(msg).toContain("vs yesterday: +$70.00 (+46.7%)");
		expect(msg).toContain("vs last month: +$70.00 (+46.7%)");
	});

	it("omits the total-net section when the pref is off", () => {
		const data = base({
			income: [{ date: "2026-06-15", amount: 100, currency: "USD" }],
			prefs: {
				renewals: true,
				budgets: true,
				tasks: true,
				events: true,
				totalNet: false,
				budgetThreshold: DEFAULT_BUDGET_THRESHOLD,
			},
		});
		expect(buildDigest(data, now)).toBeNull();
	});

	it("shows an em dash for percent when the prior net is zero", () => {
		const msg = buildDigest(
			base({ income: [{ date: "2026-06-15", amount: 100, currency: "USD" }] }),
			now,
		);
		// No activity before today → prior 0 → percent undefined.
		expect(msg).toContain("vs yesterday: +$100.00 (—)");
	});

	it("escapes HTML in user-provided names", () => {
		const msg = buildDigest(
			base({
				tasks: [{ title: "A < B & C", dueDate: "2026-06-10", status: "todo" }],
			}),
			now,
		);
		expect(msg).toContain("A &lt; B &amp; C");
	});
});
