/**
 * Pure color-space conversions for the Tools page color converter.
 *
 * `parseColor` normalizes HEX / rgb() / hsl() input into linear-free sRGB in
 * the 0..1 range; the `to*` helpers format that back out. OKLCH uses Björn
 * Ottosson's standard sRGB → linear → LMS → OKLab → LCh pipeline.
 */

export interface Rgb {
	/** Red 0..1 */
	r: number;
	/** Green 0..1 */
	g: number;
	/** Blue 0..1 */
	b: number;
	/** Alpha 0..1 */
	a: number;
}

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));
const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

/** Round to `p` decimal places, dropping negative zero. */
function round(n: number, p: number): number {
	const f = 10 ** p;
	const r = Math.round(n * f) / f;
	return r === 0 ? 0 : r;
}

function parseHex(input: string): Rgb | null {
	if (!/^#([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/.test(input)) return null;
	let hex = input.slice(1);
	if (hex.length === 3 || hex.length === 4) {
		hex = hex
			.split("")
			.map((c) => c + c)
			.join("");
	}
	const r = Number.parseInt(hex.slice(0, 2), 16) / 255;
	const g = Number.parseInt(hex.slice(2, 4), 16) / 255;
	const b = Number.parseInt(hex.slice(4, 6), 16) / 255;
	const a = hex.length === 8 ? Number.parseInt(hex.slice(6, 8), 16) / 255 : 1;
	return { r, g, b, a };
}

/** HSL (h in degrees, s/l in 0..1) → sRGB 0..1. */
function hslToRgb(h: number, s: number, l: number): { r: number; g: number; b: number } {
	const hue = ((h % 360) + 360) % 360;
	const c = (1 - Math.abs(2 * l - 1)) * s;
	const x = c * (1 - Math.abs(((hue / 60) % 2) - 1));
	const m = l - c / 2;
	let r = 0;
	let g = 0;
	let b = 0;
	if (hue < 60) [r, g, b] = [c, x, 0];
	else if (hue < 120) [r, g, b] = [x, c, 0];
	else if (hue < 180) [r, g, b] = [0, c, x];
	else if (hue < 240) [r, g, b] = [0, x, c];
	else if (hue < 300) [r, g, b] = [x, 0, c];
	else [r, g, b] = [c, 0, x];
	return { r: r + m, g: g + m, b: b + m };
}

/** Parse a CSS color string. Returns null when the input is unrecognized. */
export function parseColor(input: string): Rgb | null {
	const s = input.trim().toLowerCase();
	if (!s) return null;
	if (s.startsWith("#")) return parseHex(s);

	const nums = s.match(/-?\d*\.?\d+/g)?.map(Number) ?? [];

	if (s.startsWith("rgb")) {
		if (nums.length < 3) return null;
		return {
			r: clamp01(nums[0] / 255),
			g: clamp01(nums[1] / 255),
			b: clamp01(nums[2] / 255),
			a: nums.length > 3 ? clamp01(nums[3]) : 1,
		};
	}

	if (s.startsWith("hsl")) {
		if (nums.length < 3) return null;
		const { r, g, b } = hslToRgb(nums[0], clamp01(nums[1] / 100), clamp01(nums[2] / 100));
		return { r, g, b, a: nums.length > 3 ? clamp01(nums[3]) : 1 };
	}

	return null;
}

/** sRGB 0..1 → HSL (h in degrees 0..360, s/l in 0..1). */
export function rgbToHsl({ r, g, b }: Rgb): { h: number; s: number; l: number } {
	const max = Math.max(r, g, b);
	const min = Math.min(r, g, b);
	const d = max - min;
	const l = (max + min) / 2;
	let h = 0;
	let s = 0;
	if (d !== 0) {
		s = d / (1 - Math.abs(2 * l - 1));
		if (max === r) h = ((g - b) / d) % 6;
		else if (max === g) h = (b - r) / d + 2;
		else h = (r - g) / d + 4;
		h *= 60;
		if (h < 0) h += 360;
	}
	return { h, s, l };
}

const srgbToLinear = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);

/** sRGB 0..1 → OKLCH (l 0..1, c chroma, h in degrees 0..360). */
export function rgbToOklch({ r, g, b }: Rgb): { l: number; c: number; h: number } {
	const lr = srgbToLinear(r);
	const lg = srgbToLinear(g);
	const lb = srgbToLinear(b);

	const l = 0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb;
	const m = 0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb;
	const s = 0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb;

	const l_ = Math.cbrt(l);
	const m_ = Math.cbrt(m);
	const s_ = Math.cbrt(s);

	const L = 0.2104542553 * l_ + 0.793617785 * m_ - 0.0040720468 * s_;
	const a = 1.9779984951 * l_ - 2.428592205 * m_ + 0.4505937099 * s_;
	const bb = 0.0259040371 * l_ + 0.7827717662 * m_ - 0.808675766 * s_;

	const chroma = Math.sqrt(a * a + bb * bb);
	let hue = (Math.atan2(bb, a) * 180) / Math.PI;
	if (hue < 0) hue += 360;
	return { l: L, c: chroma, h: hue };
}

const alphaSuffix = (a: number) => (a < 1 ? `${round(a, 3)}` : null);

export function toHex({ r, g, b, a }: Rgb): string {
	const h = (n: number) =>
		clamp(Math.round(n * 255), 0, 255)
			.toString(16)
			.padStart(2, "0");
	const base = `#${h(r)}${h(g)}${h(b)}`;
	return a < 1 ? `${base}${h(a)}` : base;
}

export function toRgb(c: Rgb): string {
	const v = (n: number) => clamp(Math.round(n * 255), 0, 255);
	const a = alphaSuffix(c.a);
	return a === null
		? `rgb(${v(c.r)}, ${v(c.g)}, ${v(c.b)})`
		: `rgba(${v(c.r)}, ${v(c.g)}, ${v(c.b)}, ${a})`;
}

export function toHsl(c: Rgb): string {
	const { h, s, l } = rgbToHsl(c);
	const hh = round(h, 0);
	const ss = round(s * 100, 0);
	const ll = round(l * 100, 0);
	const a = alphaSuffix(c.a);
	return a === null
		? `hsl(${hh}, ${ss}%, ${ll}%)`
		: `hsla(${hh}, ${ss}%, ${ll}%, ${a})`;
}

export function toOklch(c: Rgb): string {
	const { l, c: chroma, h } = rgbToOklch(c);
	const body = `${round(l, 3)} ${round(chroma, 3)} ${round(h, 2)}`;
	const a = alphaSuffix(c.a);
	return a === null ? `oklch(${body})` : `oklch(${body} / ${a})`;
}
