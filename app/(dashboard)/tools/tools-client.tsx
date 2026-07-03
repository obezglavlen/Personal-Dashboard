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
