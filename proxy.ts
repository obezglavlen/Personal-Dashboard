import { type NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

/**
 * Edge proxy (Next's renamed middleware). Two jobs, split by path:
 *
 * - `/api/*` — lightweight per-IP rate limiting, with tighter caps on the
 *   cost/abuse-sensitive `/api/chat` (LLM) and credentials login. API routes do
 *   their own auth via `requireUserId`, so we never redirect them to /login.
 *   Cron routes are skipped (server-to-server, CRON_SECRET-guarded).
 * - everything else — require a session, redirecting to /login otherwise.
 *
 * The rate-limit counter is an in-memory fixed window: per-instance on
 * serverless/Edge and reset on cold start, so it's a best-effort guard suited to
 * this single-user/self-host app rather than a distributed limiter (Upstash is
 * the scale-up path).
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
	const xff = req.headers.get("x-forwarded-for");
	if (xff) return xff.split(",")[0].trim();
	return req.headers.get("x-real-ip") ?? "unknown";
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
	// API surface too, so `api` is no longer excluded from the matcher.
	matcher: ["/((?!login|_next/static|_next/image|favicon.ico).*)"],
};
