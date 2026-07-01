"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

/**
 * Root error boundary. Turns an unhandled server/client error into a friendly
 * retry screen instead of Next's raw "server error" page — notably what an iOS
 * standalone PWA showed when a page threw during render.
 */
export default function Error({
	error,
	reset,
}: {
	error: Error & { digest?: string };
	reset: () => void;
}) {
	useEffect(() => {
		console.error(error);
	}, [error]);

	return (
		<div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
			<h1 className="text-xl font-semibold">Something went wrong</h1>
			<p className="max-w-md text-sm text-muted-foreground">
				An unexpected error occurred. Try again, or reload the app.
			</p>
			<Button onClick={reset}>Try again</Button>
		</div>
	);
}
