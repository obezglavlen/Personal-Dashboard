"use client";

import { type ReactNode, useEffect, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { Bot, Send, User, Wrench } from "lucide-react";
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
	getTaxRecords: "tax records",
	getNotes: "notes",
	getBookmarks: "bookmarks",
	getExchangeRates: "exchange rates",
};

const SUGGESTIONS = [
	"How much did I spend this month?",
	"Am I over any budget?",
	"What subscriptions renew in the next two weeks?",
	"What's my net worth?",
];

export function AssistantClient() {
	const { messages, sendMessage, status, error } = useChat({
		transport: new DefaultChatTransport({ api: "/api/chat" }),
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
						messages.map((m) => <Message key={m.id} message={m} />)
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
					{!busy && !error && last?.role === "assistant" && !lastHasAnswerText && (
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

function Message({ message }: { message: ChatMessage }) {
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
