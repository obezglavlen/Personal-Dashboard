"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { fetcher } from "@/lib/api-client";
import { navItems } from "./sidebar";

type Bookmark = { id: string; title: string; url: string };
type Note = { id: string; title: string; tags: string[] };
type Task = { id: string; title: string; status: string };
type Expense = { id: string; name: string; tags: string[] };

interface Result {
	key: string;
	group: string;
	label: string;
	sub?: string;
	onSelect: () => void;
}

const PER_GROUP = 5;

export function CommandPalette({
	open,
	onOpenChange,
}: {
	open: boolean;
	onOpenChange: (v: boolean) => void;
}) {
	const router = useRouter();
	const [query, setQuery] = useState("");
	const [active, setActive] = useState(0);
	const inputRef = useRef<HTMLInputElement>(null);
	const listRef = useRef<HTMLUListElement>(null);

	// Fetch the searchable collections only while the palette is open; SWR keys
	// of `null` are skipped, so the dashboard never eagerly loads these.
	const { data: bookmarks } = useSWR<Bookmark[]>(
		open ? "/api/bookmarks" : null,
		fetcher,
	);
	const { data: notes } = useSWR<Note[]>(open ? "/api/notes" : null, fetcher);
	const { data: tasks } = useSWR<Task[]>(open ? "/api/tasks" : null, fetcher);
	const { data: expenses } = useSWR<Expense[]>(
		open ? "/api/expenses" : null,
		fetcher,
	);

	function close() {
		onOpenChange(false);
	}

	const results = useMemo<Result[]>(() => {
		const q = query.trim().toLowerCase();
		const match = (s: string) => s.toLowerCase().includes(q);
		const out: Result[] = [];

		// Navigation is always available; with no query, show all pages.
		for (const item of navItems) {
			if (q && !match(item.label)) continue;
			out.push({
				key: `nav:${item.href}`,
				group: "Go to",
				label: item.label,
				onSelect: () => {
					router.push(item.href);
					close();
				},
			});
		}

		// Content groups only appear once the user types, to keep the empty
		// palette a clean navigation menu.
		if (q) {
			for (const b of (bookmarks ?? []).filter((b) => match(b.title) || match(b.url)).slice(0, PER_GROUP)) {
				out.push({
					key: `bm:${b.id}`,
					group: "Bookmarks",
					label: b.title,
					sub: b.url,
					onSelect: () => {
						window.open(b.url, "_blank", "noopener,noreferrer");
						close();
					},
				});
			}
			for (const n of (notes ?? []).filter((n) => match(n.title) || n.tags.some(match)).slice(0, PER_GROUP)) {
				out.push({
					key: `note:${n.id}`,
					group: "Notes",
					label: n.title,
					sub: n.tags.join(", ") || undefined,
					onSelect: () => {
						router.push("/notes");
						close();
					},
				});
			}
			for (const t of (tasks ?? []).filter((t) => match(t.title)).slice(0, PER_GROUP)) {
				out.push({
					key: `task:${t.id}`,
					group: "Tasks",
					label: t.title,
					sub: t.status.replace("_", " "),
					onSelect: () => {
						router.push("/tasks");
						close();
					},
				});
			}
			for (const e of (expenses ?? []).filter((e) => match(e.name) || e.tags.some(match)).slice(0, PER_GROUP)) {
				out.push({
					key: `exp:${e.id}`,
					group: "Expenses",
					label: e.name,
					sub: e.tags.join(", ") || undefined,
					onSelect: () => {
						router.push("/expenses");
						close();
					},
				});
			}
		}

		return out;
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [query, bookmarks, notes, tasks, expenses]);

	// Reset state and focus when opened.
	useEffect(() => {
		if (open) {
			setQuery("");
			setActive(0);
			// Focus after the panel mounts.
			requestAnimationFrame(() => inputRef.current?.focus());
		}
	}, [open]);

	// Clamp the active index whenever the result set shrinks.
	useEffect(() => {
		setActive((a) => Math.min(a, Math.max(0, results.length - 1)));
	}, [results.length]);

	// Body scroll lock while open.
	useEffect(() => {
		if (!open) return;
		const prev = document.body.style.overflow;
		document.body.style.overflow = "hidden";
		return () => {
			document.body.style.overflow = prev;
		};
	}, [open]);

	if (!open) return null;

	function onKeyDown(e: React.KeyboardEvent) {
		if (e.key === "Escape") {
			e.preventDefault();
			close();
		} else if (e.key === "ArrowDown") {
			e.preventDefault();
			setActive((a) => Math.min(a + 1, results.length - 1));
		} else if (e.key === "ArrowUp") {
			e.preventDefault();
			setActive((a) => Math.max(a - 1, 0));
		} else if (e.key === "Enter") {
			e.preventDefault();
			results[active]?.onSelect();
		}
	}

	// Group rendering: keep insertion order of first appearance.
	const groups: { name: string; items: { r: Result; index: number }[] }[] = [];
	results.forEach((r, index) => {
		let g = groups.find((x) => x.name === r.group);
		if (!g) {
			g = { name: r.group, items: [] };
			groups.push(g);
		}
		g.items.push({ r, index });
	});

	return (
		<div
			className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 p-4 pt-[12vh] backdrop-blur-sm"
			onClick={close}
			role="presentation"
		>
			{/* biome-ignore lint/a11y/useKeyWithClickEvents: container stops propagation; interaction is via the input/list */}
			<div
				className="w-full max-w-lg overflow-hidden rounded-lg border border-border bg-popover text-popover-foreground shadow-xl"
				onClick={(e) => e.stopPropagation()}
				role="dialog"
				aria-modal="true"
				aria-label="Command palette"
			>
				<input
					ref={inputRef}
					value={query}
					onChange={(e) => setQuery(e.target.value)}
					onKeyDown={onKeyDown}
					placeholder="Search or jump to…"
					className="w-full border-b border-border bg-transparent px-4 py-3 text-sm outline-none placeholder:text-muted-foreground"
					aria-label="Search"
				/>
				<ul ref={listRef} className="max-h-[60vh] overflow-y-auto p-2">
					{results.length === 0 ? (
						<li className="px-3 py-6 text-center text-sm text-muted-foreground">
							No results.
						</li>
					) : (
						groups.map((g) => (
							<li key={g.name}>
								<p className="px-3 pb-1 pt-2 text-xs font-medium text-muted-foreground">
									{g.name}
								</p>
								<ul>
									{g.items.map(({ r, index }) => (
										<li key={r.key}>
											<button
												type="button"
												onClick={() => r.onSelect()}
												onMouseEnter={() => setActive(index)}
												className={`flex w-full flex-col items-start gap-0.5 rounded-md px-3 py-2 text-left text-sm ${
													index === active
														? "bg-accent text-accent-foreground"
														: "hover:bg-accent/50"
												}`}
											>
												<span className="font-medium">{r.label}</span>
												{r.sub && (
													<span className="truncate text-xs text-muted-foreground">
														{r.sub}
													</span>
												)}
											</button>
										</li>
									))}
								</ul>
							</li>
						))
					)}
				</ul>
			</div>
		</div>
	);
}
