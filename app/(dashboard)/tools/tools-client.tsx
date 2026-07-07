"use client";

import { shake_256 } from "js-sha3";
import { Check, Copy } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { parseColor, toHex, toHsl, toOklch, toRgb } from "@/lib/tools/color";
import { diffLines } from "@/lib/tools/diff";
import { runRegex } from "@/lib/tools/regex";
import { decodeComponent, encodeComponent, parseQuery } from "@/lib/tools/url";

/** Small copy-to-clipboard button shared by every tool. */
function CopyButton({ value }: { value: string }) {
	const [copied, setCopied] = useState(false);
	async function copy() {
		if (!value) return;
		try {
			await navigator.clipboard.writeText(value);
			setCopied(true);
			toast.success("Copied");
			setTimeout(() => setCopied(false), 1500);
		} catch {
			toast.error("Failed to copy");
		}
	}
	return (
		<Button onClick={copy} variant="secondary" size="sm" disabled={!value}>
			{copied ? (
				<>
					<Check className="mr-2 h-4 w-4" /> Copied
				</>
			) : (
				<>
					<Copy className="mr-2 h-4 w-4" /> Copy
				</>
			)}
		</Button>
	);
}

function ToolCard({
	title,
	description,
	children,
}: {
	title: string;
	description: string;
	children: React.ReactNode;
}) {
	return (
		<Card>
			<CardHeader>
				<CardTitle>{title}</CardTitle>
				<CardDescription>{description}</CardDescription>
			</CardHeader>
			<CardContent className="space-y-4">{children}</CardContent>
		</Card>
	);
}

export function ToolsClient() {
	return (
		<div className="space-y-4 sm:space-y-6">
			<div className="flex flex-col gap-1">
				<h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Tools</h1>
				<p className="text-sm text-muted-foreground sm:text-base">
					Quick developer utilities. Everything runs locally in your browser.
				</p>
			</div>

			<Tabs defaultValue="hash">
				<TabsList className="flex h-auto flex-wrap justify-start">
					<TabsTrigger value="hash">Hash</TabsTrigger>
					<TabsTrigger value="json">JSON</TabsTrigger>
					<TabsTrigger value="base64">Base64</TabsTrigger>
					<TabsTrigger value="jwt">JWT</TabsTrigger>
					<TabsTrigger value="uuid">UUID</TabsTrigger>
					<TabsTrigger value="timestamp">Timestamp</TabsTrigger>
					<TabsTrigger value="color">Color</TabsTrigger>
					<TabsTrigger value="regex">Regex</TabsTrigger>
					<TabsTrigger value="url">URL</TabsTrigger>
					<TabsTrigger value="diff">Diff</TabsTrigger>
				</TabsList>

				<TabsContent value="hash">
					<HashTool />
				</TabsContent>
				<TabsContent value="json">
					<JsonTool />
				</TabsContent>
				<TabsContent value="base64">
					<Base64Tool />
				</TabsContent>
				<TabsContent value="jwt">
					<JwtTool />
				</TabsContent>
				<TabsContent value="uuid">
					<UuidTool />
				</TabsContent>
				<TabsContent value="timestamp">
					<TimestampTool />
				</TabsContent>
				<TabsContent value="color">
					<ColorTool />
				</TabsContent>
				<TabsContent value="regex">
					<RegexTool />
				</TabsContent>
				<TabsContent value="url">
					<UrlTool />
				</TabsContent>
				<TabsContent value="diff">
					<DiffTool />
				</TabsContent>
			</Tabs>
		</div>
	);
}

function HashTool() {
	const [input, setInput] = useState("");
	const output = input ? shake_256(input, 256) : "";
	const chunks = output.match(/.{1,4}/g) ?? [];
	return (
		<ToolCard
			title="SHAKE-256 hash"
			description="SHA-3 extendable-output (64 hex chars)."
		>
			<div className="space-y-2">
				<Label htmlFor="hash-in">Text</Label>
				<Textarea
					id="hash-in"
					rows={3}
					value={input}
					onChange={(e) => setInput(e.target.value)}
					placeholder="Enter text to hash…"
					className="resize-none"
				/>
			</div>
			{output && (
				<div className="space-y-2">
					<Label htmlFor="hash-out">Hash</Label>
					<div
						id="hash-out"
						className="flex flex-wrap gap-x-2 gap-y-1 rounded-md border border-input bg-background px-3 py-2 font-mono text-sm"
					>
						{chunks.map((c, i) => (
							<span key={i}>{c}</span>
						))}
					</div>
					<CopyButton value={output} />
				</div>
			)}
		</ToolCard>
	);
}

function JsonTool() {
	const [input, setInput] = useState("");
	const [output, setOutput] = useState("");
	const [error, setError] = useState<string | null>(null);

	function run(pretty: boolean) {
		try {
			const parsed = JSON.parse(input);
			setOutput(JSON.stringify(parsed, null, pretty ? 2 : 0));
			setError(null);
		} catch (e) {
			setError(e instanceof Error ? e.message : "Invalid JSON");
			setOutput("");
		}
	}

	return (
		<ToolCard
			title="JSON formatter"
			description="Validate and pretty-print or minify JSON."
		>
			<Textarea
				rows={6}
				value={input}
				onChange={(e) => setInput(e.target.value)}
				placeholder='{"hello":"world"}'
				className="resize-none font-mono text-sm"
			/>
			<div className="flex gap-2">
				<Button size="sm" onClick={() => run(true)} disabled={!input}>
					Format
				</Button>
				<Button
					size="sm"
					variant="outline"
					onClick={() => run(false)}
					disabled={!input}
				>
					Minify
				</Button>
			</div>
			{error && <p className="text-sm text-destructive">{error}</p>}
			{output && (
				<div className="space-y-2">
					<Textarea
						readOnly
						rows={6}
						value={output}
						className="resize-none font-mono text-sm"
					/>
					<CopyButton value={output} />
				</div>
			)}
		</ToolCard>
	);
}

function Base64Tool() {
	const [text, setText] = useState("");
	const [encoded, setEncoded] = useState("");
	const [error, setError] = useState<string | null>(null);

	function encode() {
		try {
			setEncoded(btoa(unescape(encodeURIComponent(text))));
			setError(null);
		} catch {
			setError("Failed to encode");
		}
	}
	function decode() {
		try {
			setText(decodeURIComponent(escape(atob(encoded))));
			setError(null);
		} catch {
			setError("Invalid base64");
		}
	}

	return (
		<ToolCard
			title="Base64"
			description="Encode plain text to base64 or decode back. UTF-8 safe."
		>
			<div className="space-y-2">
				<Label htmlFor="b64-text">Plain text</Label>
				<Textarea
					id="b64-text"
					rows={3}
					value={text}
					onChange={(e) => setText(e.target.value)}
					className="resize-none font-mono text-sm"
				/>
			</div>
			<div className="flex gap-2">
				<Button size="sm" onClick={encode} disabled={!text}>
					Encode ↓
				</Button>
				<Button size="sm" variant="outline" onClick={decode} disabled={!encoded}>
					↑ Decode
				</Button>
			</div>
			<div className="space-y-2">
				<Label htmlFor="b64-enc">Base64</Label>
				<Textarea
					id="b64-enc"
					rows={3}
					value={encoded}
					onChange={(e) => setEncoded(e.target.value)}
					className="resize-none font-mono text-sm"
				/>
				<CopyButton value={encoded} />
			</div>
			{error && <p className="text-sm text-destructive">{error}</p>}
		</ToolCard>
	);
}

/** Base64url → JSON string, or throw. */
function decodeJwtPart(part: string): string {
	const b64 = part.replace(/-/g, "+").replace(/_/g, "/");
	const pad = b64.length % 4 ? "=".repeat(4 - (b64.length % 4)) : "";
	const json = decodeURIComponent(escape(atob(b64 + pad)));
	return JSON.stringify(JSON.parse(json), null, 2);
}

function JwtTool() {
	const [token, setToken] = useState("");
	const [header, setHeader] = useState("");
	const [payload, setPayload] = useState("");
	const [error, setError] = useState<string | null>(null);

	function decode() {
		const parts = token.trim().split(".");
		if (parts.length < 2) {
			setError("Not a JWT (expected header.payload.signature)");
			setHeader("");
			setPayload("");
			return;
		}
		try {
			setHeader(decodeJwtPart(parts[0]));
			setPayload(decodeJwtPart(parts[1]));
			setError(null);
		} catch {
			setError("Failed to decode token");
			setHeader("");
			setPayload("");
		}
	}

	return (
		<ToolCard
			title="JWT decoder"
			description="Decode a JWT's header and payload. Signature is not verified."
		>
			<Textarea
				rows={3}
				value={token}
				onChange={(e) => setToken(e.target.value)}
				placeholder="eyJhbGciOi…"
				className="resize-none font-mono text-sm"
			/>
			<Button size="sm" onClick={decode} disabled={!token}>
				Decode
			</Button>
			{error && <p className="text-sm text-destructive">{error}</p>}
			{header && (
				<div className="space-y-2">
					<Label>Header</Label>
					<Textarea
						readOnly
						rows={4}
						value={header}
						className="resize-none font-mono text-sm"
					/>
				</div>
			)}
			{payload && (
				<div className="space-y-2">
					<Label>Payload</Label>
					<Textarea
						readOnly
						rows={6}
						value={payload}
						className="resize-none font-mono text-sm"
					/>
					<CopyButton value={payload} />
				</div>
			)}
		</ToolCard>
	);
}

function UuidTool() {
	const [uuids, setUuids] = useState<string[]>([]);
	function generate() {
		setUuids(Array.from({ length: 5 }, () => crypto.randomUUID()));
	}
	return (
		<ToolCard title="UUID v4" description="Generate random UUIDs (crypto-strong).">
			<Button size="sm" onClick={generate}>
				Generate
			</Button>
			{uuids.length > 0 && (
				<ul className="space-y-2">
					{uuids.map((u) => (
						<li
							key={u}
							className="flex items-center justify-between gap-2 rounded-md border border-border p-2"
						>
							<code className="truncate text-sm">{u}</code>
							<CopyButton value={u} />
						</li>
					))}
				</ul>
			)}
		</ToolCard>
	);
}

function TimestampTool() {
	const [epoch, setEpoch] = useState("");
	const [iso, setIso] = useState("");
	const [error, setError] = useState<string | null>(null);

	function fromEpoch() {
		const n = Number(epoch);
		if (!Number.isFinite(n)) {
			setError("Enter a numeric epoch");
			return;
		}
		// Heuristic: 13-digit values are milliseconds, otherwise seconds.
		const ms = epoch.trim().length >= 13 ? n : n * 1000;
		const d = new Date(ms);
		if (Number.isNaN(d.getTime())) {
			setError("Out of range");
			return;
		}
		setIso(d.toISOString());
		setError(null);
	}

	function fromIso() {
		const d = new Date(iso);
		if (Number.isNaN(d.getTime())) {
			setError("Invalid date string");
			return;
		}
		setEpoch(String(Math.floor(d.getTime() / 1000)));
		setError(null);
	}

	function now() {
		const d = new Date();
		setEpoch(String(Math.floor(d.getTime() / 1000)));
		setIso(d.toISOString());
		setError(null);
	}

	return (
		<ToolCard
			title="Timestamp converter"
			description="Convert between Unix epoch and ISO 8601. Auto-detects seconds vs ms."
		>
			<div className="space-y-2">
				<Label htmlFor="ts-epoch">Unix epoch</Label>
				<Input
					id="ts-epoch"
					value={epoch}
					onChange={(e) => setEpoch(e.target.value)}
					placeholder="1700000000"
					className="font-mono"
				/>
				<Button size="sm" onClick={fromEpoch} disabled={!epoch}>
					Epoch → ISO
				</Button>
			</div>
			<div className="space-y-2">
				<Label htmlFor="ts-iso">ISO 8601 (UTC)</Label>
				<Input
					id="ts-iso"
					value={iso}
					onChange={(e) => setIso(e.target.value)}
					placeholder="2023-11-14T22:13:20.000Z"
					className="font-mono"
				/>
				<div className="flex gap-2">
					<Button size="sm" onClick={fromIso} disabled={!iso}>
						ISO → Epoch
					</Button>
					<Button size="sm" variant="outline" onClick={now}>
						Now
					</Button>
				</div>
			</div>
			{error && <p className="text-sm text-destructive">{error}</p>}
		</ToolCard>
	);
}

function ColorTool() {
	const [input, setInput] = useState("#3366cc");
	const parsed = parseColor(input);
	const formats = parsed
		? [
				{ label: "HEX", value: toHex(parsed) },
				{ label: "RGB", value: toRgb(parsed) },
				{ label: "HSL", value: toHsl(parsed) },
				{ label: "OKLCH", value: toOklch(parsed) },
			]
		: [];
	return (
		<ToolCard
			title="Color converter"
			description="Convert between HEX, RGB, HSL and OKLCH. Accepts hex, rgb() or hsl()."
		>
			<div className="space-y-2">
				<Label htmlFor="color-in">Color</Label>
				<div className="flex items-center gap-3">
					<Input
						id="color-in"
						value={input}
						onChange={(e) => setInput(e.target.value)}
						placeholder="#3366cc"
						className="font-mono"
					/>
					<div
						className="h-9 w-9 shrink-0 rounded-md border border-border"
						style={parsed ? { background: toRgb(parsed) } : undefined}
						title="Color preview"
					/>
				</div>
			</div>
			{parsed ? (
				<div className="space-y-2">
					{formats.map((f) => (
						<div
							key={f.label}
							className="flex items-center justify-between gap-2 rounded-md border border-border p-2"
						>
							<div className="flex min-w-0 items-baseline gap-2">
								<span className="w-14 shrink-0 text-xs text-muted-foreground">
									{f.label}
								</span>
								<code className="truncate font-mono text-sm">{f.value}</code>
							</div>
							<CopyButton value={f.value} />
						</div>
					))}
				</div>
			) : (
				input && <p className="text-sm text-destructive">Unrecognized color.</p>
			)}
		</ToolCard>
	);
}

const REGEX_FLAGS = ["g", "i", "m", "s", "u"] as const;

function RegexTool() {
	const [pattern, setPattern] = useState("");
	const [flags, setFlags] = useState("g");
	const [text, setText] = useState("");
	const result = runRegex(pattern, flags, text);

	function toggleFlag(flag: string) {
		setFlags((prev) =>
			prev.includes(flag) ? prev.replace(flag, "") : prev + flag,
		);
	}

	// Split the test string into matched / unmatched segments for highlighting.
	const segments: { text: string; match: boolean }[] = [];
	if (!result.error) {
		let cursor = 0;
		for (const m of result.matches) {
			if (m.index > cursor) {
				segments.push({ text: text.slice(cursor, m.index), match: false });
			}
			segments.push({
				text: text.slice(m.index, m.index + m.match.length),
				match: true,
			});
			cursor = m.index + m.match.length;
		}
		if (cursor < text.length) {
			segments.push({ text: text.slice(cursor), match: false });
		}
	}

	return (
		<ToolCard
			title="Regex tester"
			description="Test a regular expression against sample text. Matches are highlighted."
		>
			<div className="space-y-2">
				<Label htmlFor="re-pattern">Pattern</Label>
				<Input
					id="re-pattern"
					value={pattern}
					onChange={(e) => setPattern(e.target.value)}
					placeholder="\d+"
					className="font-mono"
				/>
			</div>
			<div className="flex flex-wrap gap-2">
				{REGEX_FLAGS.map((flag) => (
					<Button
						key={flag}
						size="sm"
						variant={flags.includes(flag) ? "default" : "outline"}
						onClick={() => toggleFlag(flag)}
						className="font-mono"
					>
						{flag}
					</Button>
				))}
			</div>
			<div className="space-y-2">
				<Label htmlFor="re-text">Test string</Label>
				<Textarea
					id="re-text"
					rows={4}
					value={text}
					onChange={(e) => setText(e.target.value)}
					placeholder="Sample text to search…"
					className="resize-none font-mono text-sm"
				/>
			</div>
			{result.error ? (
				<p className="text-sm text-destructive">{result.error}</p>
			) : (
				pattern && (
					<div className="space-y-2">
						<p className="text-sm text-muted-foreground">
							{result.count} {result.count === 1 ? "match" : "matches"}
						</p>
						{segments.length > 0 && (
							<div className="whitespace-pre-wrap break-words rounded-md border border-input bg-background px-3 py-2 font-mono text-sm">
								{segments.map((seg, i) =>
									seg.match ? (
										<mark
											key={i}
											className="rounded-sm bg-primary/30 text-foreground"
										>
											{seg.text}
										</mark>
									) : (
										<span key={i}>{seg.text}</span>
									),
								)}
							</div>
						)}
					</div>
				)
			)}
		</ToolCard>
	);
}

function UrlTool() {
	const [raw, setRaw] = useState("");
	const [encoded, setEncoded] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [query, setQuery] = useState("");
	const params = parseQuery(query);

	function encode() {
		setEncoded(encodeComponent(raw));
		setError(null);
	}
	function decode() {
		const result = decodeComponent(encoded);
		if (result.error) {
			setError(result.error);
			return;
		}
		setRaw(result.value ?? "");
		setError(null);
	}

	return (
		<ToolCard
			title="URL tools"
			description="Encode or decode URL components, and split a query string into parameters."
		>
			<div className="space-y-2">
				<Label htmlFor="url-raw">Text</Label>
				<Textarea
					id="url-raw"
					rows={2}
					value={raw}
					onChange={(e) => setRaw(e.target.value)}
					placeholder="a b&c=d"
					className="resize-none font-mono text-sm"
				/>
			</div>
			<div className="flex gap-2">
				<Button size="sm" onClick={encode} disabled={!raw}>
					Encode ↓
				</Button>
				<Button size="sm" variant="outline" onClick={decode} disabled={!encoded}>
					↑ Decode
				</Button>
			</div>
			<div className="space-y-2">
				<Label htmlFor="url-enc">Encoded</Label>
				<Textarea
					id="url-enc"
					rows={2}
					value={encoded}
					onChange={(e) => setEncoded(e.target.value)}
					className="resize-none font-mono text-sm"
				/>
				<CopyButton value={encoded} />
			</div>
			{error && <p className="text-sm text-destructive">{error}</p>}

			<div className="space-y-2">
				<Label htmlFor="url-query">Query string</Label>
				<Input
					id="url-query"
					value={query}
					onChange={(e) => setQuery(e.target.value)}
					placeholder="https://example.com?a=1&b=two%20words"
					className="font-mono"
				/>
			</div>
			{params.length > 0 && (
				<ul className="space-y-2">
					{params.map((p, i) => (
						<li
							key={`${p.key}-${i}`}
							className="flex items-center justify-between gap-2 rounded-md border border-border p-2"
						>
							<div className="flex min-w-0 gap-2">
								<code className="shrink-0 font-mono text-sm text-muted-foreground">
									{p.key}
								</code>
								<code className="truncate font-mono text-sm">{p.value}</code>
							</div>
							<CopyButton value={p.value} />
						</li>
					))}
				</ul>
			)}
		</ToolCard>
	);
}

const DIFF_PREFIX = { eq: " ", add: "+", del: "-" } as const;
const DIFF_ROW_CLASS = {
	eq: "",
	add: "bg-primary/15",
	del: "bg-destructive/15 text-destructive",
} as const;

function DiffTool() {
	const [left, setLeft] = useState("");
	const [right, setRight] = useState("");
	const result = left || right ? diffLines(left, right) : [];
	const added = result.filter((l) => l.type === "add").length;
	const removed = result.filter((l) => l.type === "del").length;

	return (
		<ToolCard
			title="Text diff"
			description="Compare two blocks of text line by line."
		>
			<div className="grid gap-4 sm:grid-cols-2">
				<div className="space-y-2">
					<Label htmlFor="diff-left">Original</Label>
					<Textarea
						id="diff-left"
						rows={6}
						value={left}
						onChange={(e) => setLeft(e.target.value)}
						className="resize-none font-mono text-sm"
					/>
				</div>
				<div className="space-y-2">
					<Label htmlFor="diff-right">Changed</Label>
					<Textarea
						id="diff-right"
						rows={6}
						value={right}
						onChange={(e) => setRight(e.target.value)}
						className="resize-none font-mono text-sm"
					/>
				</div>
			</div>
			{result.length > 0 && (
				<div className="space-y-2">
					<p className="flex gap-3 text-sm">
						<span className="text-primary">+{added}</span>
						<span className="text-destructive">−{removed}</span>
					</p>
					<div className="overflow-x-auto rounded-md border border-input bg-background py-1 font-mono text-sm">
						{result.map((l, i) => (
							<div
								key={i}
								className={`flex gap-2 whitespace-pre px-3 py-0.5 ${DIFF_ROW_CLASS[l.type]}`}
							>
								<span className="select-none text-muted-foreground">
									{DIFF_PREFIX[l.type]}
								</span>
								<span>{l.line || " "}</span>
							</div>
						))}
					</div>
				</div>
			)}
		</ToolCard>
	);
}
