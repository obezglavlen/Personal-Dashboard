"use client";

import { useEffect } from "react";

/**
 * Registers the service worker (`/sw.js`) in production only — in dev it would
 * interfere with Turbopack HMR and cache dev chunks. Renders nothing.
 */
export function ServiceWorkerRegister() {
	useEffect(() => {
		if (process.env.NODE_ENV !== "production") return;
		if (!("serviceWorker" in navigator)) return;
		const register = () => {
			navigator.serviceWorker.register("/sw.js").catch(() => {
				// Registration failures are non-fatal — the app works without offline.
			});
		};
		window.addEventListener("load", register);
		return () => window.removeEventListener("load", register);
	}, []);
	return null;
}
