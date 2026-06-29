"use client";

import { X } from "lucide-react";
import * as React from "react";
import { cn } from "@/lib/utils";

interface TagInputProps {
	value: string[];
	onChange: (next: string[]) => void;
	/** Existing tags offered as autocomplete suggestions. */
	suggestions?: string[];
	placeholder?: string;
	id?: string;
	/** When false, the user can only pick existing suggestions (no free text). */
	allowCreate?: boolean;
	className?: string;
}

const norm = (s: string) => s.trim().toLowerCase();

/**
 * Multi-tag autocomplete. Selected tags render as removable chips; typing
 * filters a suggestion dropdown; Enter/click adds (creating a new tag when
 * `allowCreate`), Backspace on an empty field removes the last chip.
 * No external deps — built on the project's input styling.
 */
export function TagInput({
	value,
	onChange,
	suggestions = [],
	placeholder = "Add tag…",
	id,
	allowCreate = true,
	className,
}: TagInputProps) {
	const [query, setQuery] = React.useState("");
	const [open, setOpen] = React.useState(false);
	const containerRef = React.useRef<HTMLDivElement>(null);

	const selectedSet = React.useMemo(() => new Set(value.map(norm)), [value]);

	const filtered = React.useMemo(() => {
		const q = norm(query);
		return suggestions
			.filter((s) => !selectedSet.has(norm(s)))
			.filter((s) => (q ? norm(s).includes(q) : true))
			.slice(0, 8);
	}, [suggestions, selectedSet, query]);

	const canCreate =
		allowCreate &&
		query.trim().length > 0 &&
		!selectedSet.has(norm(query)) &&
		!suggestions.some((s) => norm(s) === norm(query));

	function addTag(tag: string) {
		const t = tag.trim();
		if (!t || selectedSet.has(norm(t))) {
			setQuery("");
			return;
		}
		onChange([...value, t]);
		setQuery("");
	}

	function removeTag(tag: string) {
		onChange(value.filter((t) => t !== tag));
	}

	function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
		if ((e.key === "Enter" || e.key === ",") && query.trim()) {
			e.preventDefault();
			if (filtered.length > 0 && !canCreate) addTag(filtered[0]);
			else addTag(query);
		} else if (e.key === "Backspace" && !query && value.length > 0) {
			removeTag(value[value.length - 1]);
		}
	}

	// Close the dropdown on outside click.
	React.useEffect(() => {
		function onDoc(e: MouseEvent) {
			if (
				containerRef.current &&
				!containerRef.current.contains(e.target as Node)
			) {
				setOpen(false);
			}
		}
		document.addEventListener("mousedown", onDoc);
		return () => document.removeEventListener("mousedown", onDoc);
	}, []);

	const showDropdown = open && (filtered.length > 0 || canCreate);

	return (
		<div ref={containerRef} className={cn("relative", className)}>
			<div className="flex min-h-10 w-full flex-wrap items-center gap-1.5 rounded-md border border-input bg-background px-2 py-1.5 text-sm ring-offset-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
				{value.map((tag) => (
					<span
						key={tag}
						className="inline-flex items-center gap-1 rounded-md bg-primary px-2 py-0.5 text-xs font-medium text-primary-foreground"
					>
						{tag}
						<button
							type="button"
							onClick={() => removeTag(tag)}
							className="-mr-0.5 rounded-sm opacity-70 transition-opacity hover:opacity-100"
							aria-label={`Remove ${tag}`}
						>
							<X className="h-3 w-3" />
						</button>
					</span>
				))}
				<input
					id={id}
					value={query}
					onChange={(e) => {
						setQuery(e.target.value);
						setOpen(true);
					}}
					onFocus={() => setOpen(true)}
					onKeyDown={onKeyDown}
					placeholder={value.length === 0 ? placeholder : ""}
					className="h-7 min-w-24 flex-1 bg-transparent px-1 placeholder:text-muted-foreground focus-visible:outline-none"
				/>
			</div>

			{showDropdown && (
				<ul className="absolute z-50 mt-1 max-h-56 w-full overflow-auto rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-md">
					{filtered.map((s) => (
						<li key={s}>
							<button
								type="button"
								onClick={() => {
									addTag(s);
									setOpen(true);
								}}
								className="flex w-full items-center rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground"
							>
								{s}
							</button>
						</li>
					))}
					{canCreate && (
						<li>
							<button
								type="button"
								onClick={() => {
									addTag(query);
									setOpen(true);
								}}
								className="flex w-full items-center gap-1 rounded-sm px-2 py-1.5 text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground"
							>
								Create{" "}
								<span className="font-medium text-foreground">
									“{query.trim()}”
								</span>
							</button>
						</li>
					)}
				</ul>
			)}
		</div>
	);
}
