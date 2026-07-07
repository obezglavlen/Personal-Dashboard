import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === "production";

/**
 * Content-Security-Policy. `'unsafe-inline'` is required for Next's inline
 * bootstrap script and inline styles — a nonce-based policy is a follow-up. In
 * dev we additionally allow `'unsafe-eval'` and ws/http connections so Turbopack
 * HMR keeps working. Frankfurter and OpenRouter are called server-side, so they
 * need not appear in connect-src.
 */
const csp = [
	"default-src 'self'",
	"base-uri 'self'",
	"object-src 'none'",
	"frame-ancestors 'none'",
	"form-action 'self'",
	"img-src 'self' data: https:",
	"font-src 'self' data:",
	// Allow the same-origin service worker (public/sw.js) to register.
	"worker-src 'self'",
	"style-src 'self' 'unsafe-inline'",
	isProd
		? "script-src 'self' 'unsafe-inline'"
		: "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
	isProd
		? "connect-src 'self' https://vitals.vercel-insights.com"
		: "connect-src 'self' https://vitals.vercel-insights.com ws: http:",
].join("; ");

const securityHeaders = [
	{ key: "Content-Security-Policy", value: csp },
	{ key: "X-Content-Type-Options", value: "nosniff" },
	{ key: "X-Frame-Options", value: "DENY" },
	{ key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
	{
		key: "Permissions-Policy",
		value: "camera=(), microphone=(), geolocation=()",
	},
	...(isProd
		? [
				{
					key: "Strict-Transport-Security",
					value: "max-age=63072000; includeSubDomains; preload",
				},
			]
		: []),
];

const nextConfig: NextConfig = {
	output: "standalone",
	async headers() {
		return [{ source: "/:path*", headers: securityHeaders }];
	},
	// The standalone /hasher page was superseded by the Hash tab on /tools.
	async redirects() {
		return [{ source: "/hasher", destination: "/tools", permanent: true }];
	},
};

export default nextConfig;
