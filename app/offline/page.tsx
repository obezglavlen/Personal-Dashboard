import type { Metadata } from "next";

export const metadata: Metadata = { title: "Offline — Home Dashboard" };

/**
 * Static fallback served by the service worker when a navigation fails offline.
 * Must not depend on network/session data, so it stays a plain static page.
 */
export default function OfflinePage() {
	return (
		<div className="flex min-h-[100dvh] flex-col items-center justify-center gap-3 p-8 text-center">
			<h1 className="text-2xl font-bold tracking-tight">You're offline</h1>
			<p className="max-w-sm text-sm text-muted-foreground">
				This page isn't available without a connection. Reconnect and try again —
				your data is safe on the server.
			</p>
		</div>
	);
}
