"use client";

import * as PopoverPrimitive from "@radix-ui/react-popover";
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

type Option = { type: "tag" | "create"; value: string };

/**
 * Multi-tag autocomplete. Selected tags render as removable chips; typing
 * filters a suggestion dropdown; Enter/click adds (creating a new tag when
 * `allowCreate`), Backspace on an empty field removes the last chip.
 *
 * The suggestion list is rendered through a Radix Popover portal so it floats
 * above any surrounding `overflow` container (e.g. a scrollable Dialog) and
 * flips above the field when there's no room below — an in-flow `absolute`
 * dropdown would otherwise be clipped by the modal's scroll box.
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
	// -1 means "no explicit selection" — Enter then falls back to the smart
	// default below instead of whatever happens to be first.
	const [activeIndex, setActiveIndex] = React.useState(-1);
	const containerRef = React.useRef<HTMLDivElement>(null);
	const inputRef = React.useRef<HTMLInputElement>(null);
	const listId = React.useId();

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

	const options = React.useMemo<Option[]>(
		() => [
			...filtered.map((s) => ({ type: "tag" as const, value: s })),
			...(canCreate ? [{ type: "create" as const, value: query.trim() }] : []),
		],
		[filtered, canCreate, query],
	);

	// Keep the highlight in range as options shrink/grow.
	React.useEffect(() => {
		setActiveIndex((i) => (i >= options.length ? -1 : i));
	}, [options.length]);

	const showDropdown = open && options.length > 0;

	// Escape must close only the dropdown, never the enclosing Dialog. Radix's
	// Dialog dismisses on a capture-phase Escape listener attached to
	// `document`, and its layer registered before this popover's, so it fires
	// first and would close the whole modal. Listening on `window` in the
	// capture phase runs *earlier still* (window precedes document in the
	// capture path), so we can swallow the key and close just the list while
	// the dropdown is open.
	React.useEffect(() => {
		if (!showDropdown) return;
		function onKeyDownCapture(e: KeyboardEvent) {
			if (e.key === "Escape") {
				e.preventDefault();
				e.stopImmediatePropagation();
				setOpen(false);
			}
		}
		window.addEventListener("keydown", onKeyDownCapture, true);
		return () => window.removeEventListener("keydown", onKeyDownCapture, true);
	}, [showDropdown]);

	function addTag(tag: string) {
		const t = tag.trim();
		if (!t || selectedSet.has(norm(t))) {
			setQuery("");
			return;
		}
		onChange([...value, t]);
		setQuery("");
		setActiveIndex(-1);
	}

	function removeTag(tag: string) {
		onChange(value.filter((t) => t !== tag));
	}

	function commit(index: number) {
		const opt = options[index];
		if (opt) addTag(opt.value);
	}

	function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
		if (e.key === "ArrowDown") {
			e.preventDefault();
			setOpen(true);
			if (options.length > 0) setActiveIndex((i) => (i + 1) % options.length);
		} else if (e.key === "ArrowUp") {
			e.preventDefault();
			setOpen(true);
			if (options.length > 0)
				setActiveIndex((i) => (i <= 0 ? options.length - 1 : i - 1));
		} else if ((e.key === "Enter" || e.key === ",") && query.trim()) {
			e.preventDefault();
			if (showDropdown && activeIndex >= 0) commit(activeIndex);
			// Smart default (matches prior behaviour): prefer the first existing
			// match only when the typed text isn't itself a new tag.
			else if (filtered.length > 0 && !canCreate) addTag(filtered[0]);
			else addTag(query);
		} else if (e.key === "Backspace" && !query && value.length > 0) {
			removeTag(value[value.length - 1]);
		}
	}

	return (
		<PopoverPrimitive.Root
			open={showDropdown}
			onOpenChange={(o) => {
				if (!o) setOpen(false);
			}}
			modal={false}
		>
			<div ref={containerRef} className={cn("relative", className)}>
				<PopoverPrimitive.Anchor asChild>
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
							ref={inputRef}
							id={id}
							value={query}
							role="combobox"
							aria-expanded={showDropdown}
							aria-controls={listId}
							aria-autocomplete="list"
							aria-activedescendant={
								showDropdown && activeIndex >= 0
									? `${listId}-opt-${activeIndex}`
									: undefined
							}
							onChange={(e) => {
								setQuery(e.target.value);
								setOpen(true);
								setActiveIndex(-1);
							}}
							onFocus={() => setOpen(true)}
							onKeyDown={onKeyDown}
							placeholder={value.length === 0 ? placeholder : ""}
							className="h-7 min-w-24 flex-1 bg-transparent px-1 placeholder:text-muted-foreground focus-visible:outline-none"
						/>
					</div>
				</PopoverPrimitive.Anchor>

				<PopoverPrimitive.Portal>
					<PopoverPrimitive.Content
						id={listId}
						role="listbox"
						align="start"
						side="bottom"
						sideOffset={4}
						// Keep focus in the text field — this is a combobox, not a menu.
						onOpenAutoFocus={(e) => e.preventDefault()}
						onCloseAutoFocus={(e) => e.preventDefault()}
						// Typing in the anchored input registers as "outside" the portaled
						// content; don't let that close the list.
						onInteractOutside={(e) => {
							if (containerRef.current?.contains(e.target as Node))
								e.preventDefault();
						}}
						// The enclosing modal Dialog sets body { pointer-events: none };
						// this list is portaled to <body> as a separate layer, so it must
						// re-enable pointer events on itself or clicks won't register.
						className="pointer-events-auto z-50 max-h-[min(14rem,var(--radix-popover-content-available-height))] w-[var(--radix-popover-trigger-width)] overflow-auto rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-md"
					>
						{options.map((opt, idx) => {
							const active = idx === activeIndex;
							return (
								<div
									key={`${opt.type}:${opt.value}`}
									id={`${listId}-opt-${idx}`}
									role="option"
									aria-selected={active}
									// Prevent the mousedown from blurring the input (which would
									// close the popover before the click lands).
									onMouseDown={(e) => e.preventDefault()}
									onMouseEnter={() => setActiveIndex(idx)}
									onClick={() => {
										commit(idx);
										inputRef.current?.focus();
									}}
									className={cn(
										"flex w-full cursor-pointer items-center gap-1 rounded-sm px-2 py-1.5 text-sm",
										active && "bg-accent text-accent-foreground",
										opt.type === "create" && !active && "text-muted-foreground",
									)}
								>
									{opt.type === "create" ? (
										<>
											Create{" "}
											<span className="font-medium text-foreground">
												“{opt.value}”
											</span>
										</>
									) : (
										opt.value
									)}
								</div>
							);
						})}
					</PopoverPrimitive.Content>
				</PopoverPrimitive.Portal>
			</div>
		</PopoverPrimitive.Root>
	);
}
