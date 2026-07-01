import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
	return {
		name: "Home Dashboard",
		short_name: "Dashboard",
		description: "Personal home/admin dashboard",
		start_url: "/",
		display: "standalone",
		background_color: "#000000",
		theme_color: "#000000",
		icons: [
			{ src: "/icon", sizes: "512x512", type: "image/png", purpose: "any" },
			{
				src: "/maskable-icon",
				sizes: "512x512",
				type: "image/png",
				purpose: "maskable",
			},
			{ src: "/apple-icon", sizes: "180x180", type: "image/png" },
		],
		shortcuts: [
			{ name: "Expenses", url: "/expenses" },
			{ name: "Reports", url: "/reports" },
			{ name: "Assistant", url: "/assistant" },
		],
	};
}
