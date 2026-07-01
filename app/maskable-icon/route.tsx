import { ImageResponse } from "next/og";

export const contentType = "image/png";

/**
 * Maskable app icon (512×512). Android may crop icons to a circle/squircle, so
 * the "HD" mark is kept well inside the inner ~80% safe zone (smaller font than
 * the plain `/icon`) on a full-bleed background.
 */
export function GET() {
	return new ImageResponse(
		<div
			style={{
				width: "100%",
				height: "100%",
				display: "flex",
				alignItems: "center",
				justifyContent: "center",
				background: "#000000",
				color: "#ffffff",
				fontSize: 190,
				fontWeight: 600,
				fontFamily: "monospace",
			}}
		>
			HD
		</div>,
		{ width: 512, height: 512 },
	);
}
