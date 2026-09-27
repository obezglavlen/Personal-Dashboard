import { isIP } from "node:net";
import { type NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

/**
 * Next.js 16 Node proxy (formerly middleware). Two jobs, split by path:
 *
 * - `/api/*` — rate limiting by trusted IP, or one shared bucket per tier
 *   if no trustworthy IP exists. `/api/chat` and credentials have tighter caps.
 *   API routes do
 *   their own auth via `requireUserId`, so we never redirect them to /login.
 *   Cron routes are skipped (server-to-server, CRON_SECRET-guarded).
 * - everything else — require a session, redirecting to /login otherwise.
 *
 * Counters are in-memory per instance and reset on cold start: best effort,
 * NOT a distributed or strong abuse-prevention mechanism.
 */

interface Rule {
	tier: string;
	limit: number;
	windowMs: number;
}

function ruleFor(pathname: string, method: string): Rule | null {
	if (pathname.startsWith("/api/cron")) return null;
	if (pathname.startsWith("/api/chat")) {
		return { tier: "chat", limit: 20, windowMs: 60_000 };
	}
	if (
		method === "POST" &&
		pathname.startsWith("/api/auth/callback/credentials")
	) {
		return { tier: "auth", limit: 10, windowMs: 300_000 };
	}
	return { tier: "api", limit: 100, windowMs: 60_000 };
}

interface Bucket {
	count: number;
	resetAt: number;
}

const buckets = new Map<string, Bucket>();

function clientIp(req: NextRequest): string {
	// NextRequest doesn't attest a peer IP. Only these deployment-controlled
	// paths may supply one; never use caller-controlled XFF / X-Real-IP directly.
	// Self-host opt-in: RATE_LIMIT_TRUSTED_PROXY=1 requires a reverse proxy that
	// overwrites X-Dashboard-Client-IP with its verified client IP and prevents
	// direct access to the app port. Docker Compose publishes :3000 by default;
	// do not enable this option there without first restricting that port.
	const ip = (process.env.VERCEL === "1"
		? req.headers.get("x-vercel-forwarded-for")
		: process.env.RATE_LIMIT_TRUSTED_PROXY === "1"
			? req.headers.get("x-dashboard-client-ip")
			: null
	)?.trim();
	if (!ip || !isIP(ip)) return "shared";
	return isIP(ip) === 6 ? new URL(`http://[${ip}]/`).hostname : ip;
}

function rateLimit(req: NextRequest): NextResponse {
	const rule = ruleFor(req.nextUrl.pathname, req.method);
	if (!rule) return NextResponse.next();

	const now = Date.now();

	// Opportunistic prune so distinct-IP churn can't grow the map unbounded.
	if (buckets.size > 10_000) {
		for (const [k, b] of buckets) if (now >= b.resetAt) buckets.delete(k);
	}

	const key = `${rule.tier}:${clientIp(req)}`;
	const bucket = buckets.get(key);

	if (!bucket || now >= bucket.resetAt) {
		buckets.set(key, { count: 1, resetAt: now + rule.windowMs });
		return NextResponse.next();
	}

	if (bucket.count >= rule.limit) {
		const retryAfter = Math.ceil((bucket.resetAt - now) / 1000);
		return NextResponse.json(
			{ error: "Too many requests" },
			{ status: 429, headers: { "Retry-After": String(retryAfter) } },
		);
	}

	bucket.count++;
	return NextResponse.next();
}

export async function proxy(request: NextRequest) {
	if (request.nextUrl.pathname.startsWith("/api/")) {
		return rateLimit(request);
	}

	const token = await getToken({ req: request });
	if (!token) {
		const loginUrl = new URL("/login", request.url);
		loginUrl.searchParams.set("callbackUrl", request.url);
		return NextResponse.redirect(loginUrl);
	}
	return NextResponse.next();
}

export const config = {
	// Page auth runs on everything except login/static; rate limiting needs the
	// API surface too, so `api` is no longer excluded from the matcher. The PWA
	// metadata routes (manifest + generated icons) must stay public so the
	// browser can fetch them from the unauthenticated login screen to offer
	// install — otherwise auth would redirect them to /login.
	matcher: [
		"/((?!login|manifest.webmanifest|icon|apple-icon|_next/static|_next/image|favicon.ico).*)",
	],
};
