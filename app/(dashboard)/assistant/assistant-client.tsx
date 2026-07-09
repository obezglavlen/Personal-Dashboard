"use client";

import { type ReactNode, useEffect, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import {
	DefaultChatTransport,
	lastAssistantMessageIsCompleteWithApprovalResponses,
} from "ai";
import { Bot, Check, Send, User, Wrench, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const TOOL_LABELS: Record<string, string> = {
	getExpenses: "expenses",
	getBudgets: "budgets",
	getSubscriptions: "subscriptions",
	getTasks: "tasks",
	getNetWorth: "net worth",
	getGoals: "goals",
	getIncome: "income",
	getTaxRecords: "tax records",
	getNotes: "notes",
	getBookmarks: "bookmarks",
	getExchangeRates: "exchange rates",
};

// Tools that write. These render an approval card (Confirm/Cancel) before the
// write runs, then a success/denied/error pill — never the read-only badge.
const WRITE_LABELS: Record<string, string> = {
	createExpense: "expense",
	createTask: "task",
	createNote: "note",
	createBookmark: "bookmark",
	createBudget: "budget",
	createSubscription: "subscription",
	createGoal: "goal",
	createFinancialAccount: "account",
};

const SUGGESTIONS = [
	"How much did I spend this month?",
	"Am I over any budget?",
	"What subscriptions renew in the next two weeks?",
	"What's my net worth?",
];

export function AssistantClient() {
	const { messages, sendMessage, status, error, addToolApprovalResponse } =
		useChat({
			transport: new DefaultChatTransport({ api: "/api/chat" }),
			// After the user approves/denies a write tool, resubmit automatically
			// so the server can run (or skip) the tool and continue the answer.
			// The approval-specific helper fires ONLY when an approval was just
			// responded — not after ordinary read-tool answers (which would cause
			// a spurious extra round-trip).
			sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithApprovalResponses,
		});
	const [input, setInput] = useState("");
	const endRef = useRef<HTMLDivElement>(null);
	const busy = status === "submitted" || status === "streaming";

	// While the model streams its chain-of-thought (reasoning) and tool calls,
	// no answer text exists yet. Keep the "Thinking…" indicator up until the
	// final answer text starts arriving, so the bubble is never blank.
	const last = messages[messages.length - 1];
	const lastHasAnswerText =
		last?.role === "assistant" &&
		last.parts.some((p) => p.type === "text" && p.text.trim().length > 0);

	// A write tool is waiting for the user's Confirm/Cancel. The assistant
	// message then has a tool part but no answer text yet, so this suppresses
	// the "no answer" fallback below.
	const lastHasPendingApproval =
		last?.role === "assistant" &&
		last.parts.some(
			(p) =>
				p.type.startsWith("tool-") &&
				(p as { state?: string }).state === "approval-requested",
		);

	// Any tool part (read badge or write pill) is itself visible content, so the
	// "no answer" fallback below must not fire under it — e.g. a write completes
	// with a "Created …" pill but the model adds no trailing sentence.
	const lastHasToolActivity =
		last?.role === "assistant" &&
		last.parts.some((p) => p.type.startsWith("tool-"));

	const handleApproval = (id: string, approved: boolean) => {
		addToolApprovalResponse({ id, approved });
	};

	// Keep the latest message in view as tokens stream in.
	useEffect(() => {
		endRef.current?.scrollIntoView({ behavior: "smooth" });
	}, [messages]);

	function submit(text: string) {
		const trimmed = text.trim();
		if (!trimmed || busy) return;
		sendMessage({ text: trimmed });
		setInput("");
	}

	return (
		<div className="flex h-[calc(100vh-8rem)] flex-col gap-4">
			<div className="flex flex-col gap-1">
				<h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
					Assistant
				</h1>
				<p className="text-sm text-muted-foreground sm:text-base">
					Ask about your finances, tasks, and notes — answered from your own
					data.
				</p>
			</div>

			<Card className="flex min-h-0 flex-1 flex-col">
				<CardContent className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto pt-6">
					{messages.length === 0 ? (
						<div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
							<Bot className="h-10 w-10 text-muted-foreground" />
							<p className="text-sm text-muted-foreground">
								Ask me anything about your dashboard.
							</p>
							<div className="flex flex-wrap justify-center gap-2">
								{SUGGESTIONS.map((s) => (
									<button
										key={s}
										type="button"
										onClick={() => submit(s)}
										className="rounded-full border border-border bg-muted px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
									>
										{s}
									</button>
								))}
							</div>
						</div>
					) : (
						messages.map((m) => (
							<Message key={m.id} message={m} onApproval={handleApproval} />
						))
					)}
					{busy && !lastHasAnswerText && (
						<div className="flex items-center gap-2 text-sm text-muted-foreground">
							<Bot className="h-4 w-4" />
							<span className="animate-pulse">Thinking…</span>
						</div>
					)}
					{error && (
						<div className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
							{error.message || "Something went wrong. Please try again."}
						</div>
					)}
					{/* Model finished a turn but produced no answer text (e.g. it put
					    everything in reasoning, or a tool step returned nothing). */}
					{!busy &&
						!error &&
						last?.role === "assistant" &&
						!lastHasAnswerText &&
						!lastHasPendingApproval &&
						!lastHasToolActivity && (
							<div className="text-sm text-muted-foreground">
								No answer was returned. Try rephrasing or ask again.
							</div>
						)}
					<div ref={endRef} />
				</CardContent>
			</Card>

			<form
				onSubmit={(e) => {
					e.preventDefault();
					submit(input);
				}}
				className="flex gap-2"
			>
				<Input
					value={input}
					onChange={(e) => setInput(e.target.value)}
					placeholder="Ask about your spending, budgets, tasks…"
					disabled={busy}
					aria-label="Message"
				/>
				<Button type="submit" disabled={busy || !input.trim()}>
					<Send className="h-4 w-4" />
					<span className="sr-only">Send</span>
				</Button>
			</form>
		</div>
	);
}

type ChatMessage = ReturnType<typeof useChat>["messages"][number];

function Message({
	message,
	onApproval,
}: {
	message: ChatMessage;
	onApproval: (id: string, approved: boolean) => void;
}) {
	const isUser = message.role === "user";
	return (
		<div className={cn("flex gap-3", isUser && "flex-row-reverse")}>
			<div
				className={cn(
					"flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
					isUser
						? "bg-primary text-primary-foreground"
						: "bg-muted text-muted-foreground",
				)}
			>
				{isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
			</div>
			<div
				className={cn(
					"flex max-w-[80%] flex-col gap-2",
					isUser && "items-end",
				)}
			>
				{message.parts.map((part, i) => {
					if (part.type === "text") {
						return (
							<div
								key={i}
								className={cn(
									"rounded-lg px-3 py-2 text-sm",
									isUser
										? "bg-primary text-primary-foreground"
										: "bg-muted text-foreground",
								)}
							>
								<Markdown text={part.text} />
							</div>
						);
					}
					// Model streams chain-of-thought before the answer. Show it
					// collapsed so the bubble isn't blank while it thinks.
					if (part.type === "reasoning") {
						if (!part.text.trim()) return null;
						return (
							<details
								key={i}
								className="rounded-lg bg-muted/50 px-3 py-2 text-xs text-muted-foreground"
							>
								<summary className="cursor-pointer select-none">
									Reasoning
								</summary>
								<div className="mt-1 max-h-40 overflow-y-auto whitespace-pre-wrap">
									{part.text}
								</div>
							</details>
						);
					}
					if (part.type.startsWith("tool-")) {
						const name = part.type.slice("tool-".length);
						if (name in WRITE_LABELS) {
							return (
								<WriteToolPart
									key={i}
									name={name}
									part={part as unknown as ToolUIPartLike}
									onApproval={onApproval}
								/>
							);
						}
						return (
							<div
								key={i}
								className="inline-flex items-center gap-1.5 rounded-full bg-accent px-2.5 py-1 text-xs text-accent-foreground"
							>
								<Wrench className="h-3 w-3" />
								Looked up {TOOL_LABELS[name] ?? name}
							</div>
						);
					}
					return null;
				})}
			</div>
		</div>
	);
}

/**
 * Minimal shape of an ai-sdk tool UI part (the full union is generic over the
 * tool set; we only read these fields). A write tool moves through
 * approval-requested -> approval-responded -> output-available|denied|error.
 */
type ToolUIPartLike = {
	type: string;
	toolCallId: string;
	state:
		| "input-streaming"
		| "input-available"
		| "approval-requested"
		| "approval-responded"
		| "output-available"
		| "output-denied"
		| "output-error";
	input?: Record<string, unknown>;
	output?: Record<string, unknown>;
	errorText?: string;
	approval?: { id: string; approved?: boolean };
};

/** One-line summary of a create tool's input/output for the approval card. */
function summarizeWrite(obj: Record<string, unknown> | undefined): string {
	if (!obj) return "";
	const out: string[] = [];
	const label = obj.name ?? obj.title ?? obj.url;
	if (label) out.push(String(label));
	const money = obj.amount ?? obj.price ?? obj.target ?? obj.balance;
	if (money !== undefined && money !== null) {
		const cur = typeof obj.currency === "string" ? ` ${obj.currency}` : "";
		out.push(`${money}${cur}`);
	}
	if (typeof obj.dueDate === "string" && obj.dueDate) out.push(`due ${obj.dueDate}`);
	else if (typeof obj.date === "string" && obj.date) out.push(obj.date);
	return out.join(" · ");
}

function StatusPill({
	label,
	icon = "wrench",
	tone,
}: {
	label: string;
	icon?: "check" | "x" | "wrench";
	tone?: "error";
}) {
	const Icon = icon === "check" ? Check : icon === "x" ? X : Wrench;
	return (
		<div
			className={cn(
				"inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs",
				tone === "error"
					? "bg-destructive/10 text-destructive"
					: "bg-accent text-accent-foreground",
			)}
		>
			<Icon className="h-3 w-3" />
			{label}
		</div>
	);
}

/** Renders a write tool: approval card, then success/denied/error state. */
function WriteToolPart({
	name,
	part,
	onApproval,
}: {
	name: string;
	part: ToolUIPartLike;
	onApproval: (id: string, approved: boolean) => void;
}) {
	const label = WRITE_LABELS[name] ?? name;

	if (part.state === "approval-requested" && part.approval) {
		const id = part.approval.id;
		return (
			<div className="flex flex-col gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm">
				<div className="flex items-center gap-1.5 text-muted-foreground">
					<Wrench className="h-3.5 w-3.5" />
					<span>Create {label}?</span>
				</div>
				<p className="font-medium text-foreground">
					{summarizeWrite(part.input) || `New ${label}`}
				</p>
				<div className="flex gap-2">
					<Button type="button" size="sm" onClick={() => onApproval(id, true)}>
						<Check className="h-4 w-4" />
						Confirm
					</Button>
					<Button
						type="button"
						size="sm"
						variant="outline"
						onClick={() => onApproval(id, false)}
					>
						<X className="h-4 w-4" />
						Cancel
					</Button>
				</div>
			</div>
		);
	}

	if (part.state === "approval-responded") {
		return part.approval?.approved ? (
			<StatusPill label={`Saving ${label}…`} />
		) : null;
	}

	if (part.state === "output-available") {
		const detail = summarizeWrite(part.output);
		return (
			<StatusPill
				icon="check"
				label={`Created ${label}${detail ? `: ${detail}` : ""}`}
			/>
		);
	}

	if (part.state === "output-denied") {
		return <StatusPill icon="x" label={`Cancelled — ${label} not created`} />;
	}

	if (part.state === "output-error") {
		return (
			<StatusPill
				icon="x"
				tone="error"
				label={`Couldn't create ${label}${part.errorText ? `: ${part.errorText}` : ""}`}
			/>
		);
	}

	return <StatusPill label={`Preparing ${label}…`} />;
}

/** Inline `**bold**` and `` `code` `` within one line; everything else literal. */
function renderInline(text: string, keyBase: string): ReactNode[] {
	const nodes: ReactNode[] = [];
	const re = /\*\*([^*]+)\*\*|`([^`]+)`/g;
	let last = 0;
	let idx = 0;
	let m: RegExpExecArray | null = re.exec(text);
	while (m !== null) {
		if (m.index > last) nodes.push(text.slice(last, m.index));
		if (m[1] !== undefined) {
			nodes.push(<strong key={`${keyBase}-b${idx}`}>{m[1]}</strong>);
		} else if (m[2] !== undefined) {
			nodes.push(
				<code
					key={`${keyBase}-c${idx}`}
					className="rounded bg-black/10 px-1 py-0.5 text-[0.85em] dark:bg-white/10"
				>
					{m[2]}
				</code>,
			);
		}
		last = m.index + m[0].length;
		idx++;
		m = re.exec(text);
	}
	if (last < text.length) nodes.push(text.slice(last));
	return nodes;
}

/**
 * Minimal markdown: bold, inline code, line breaks, and `-`/`*` bullets. Enough
 * for the assistant's short answers without pulling in a full markdown parser.
 */
function Markdown({ text }: { text: string }) {
	const lines = text.split("\n");
	return (
		<>
			{lines.map((line, i) => {
				const bullet = /^\s*[-*]\s+/.test(line);
				const content = bullet ? line.replace(/^\s*[-*]\s+/, "") : line;
				return (
					<div key={i} className={bullet ? "flex gap-1.5" : undefined}>
						{bullet && <span aria-hidden>•</span>}
						<span>{renderInline(content, `l${i}`)}</span>
					</div>
				);
			})}
		</>
	);
}
