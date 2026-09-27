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
	/** Accessible name for unlabeled uses (e.g. tag filters). */
	ariaLabel?: string;
	/** When false, the user can only pick existing suggestions (no free text). */
	allowCreate?: boolean;
	className?: string;
}

const norm = (s: string) => s.trim().toLowerCase();

type Option = { type: "tag" | "create"; value: string };

/** An in-dialog combobox: the scrollable list stays in the modal's DOM and scroll
 * area, rather than portaling behind its focus trap/pointer-event layer. */
export function TagInput({
	value,
	onChange,
	suggestions = [],
	placeholder = "Add tag…",
	id,
	ariaLabel = "Tags",
	allowCreate = true,
	className,
}: TagInputProps) {
	const [query, setQuery] = React.useState("");
	const [open, setOpen] = React.useState(false);
	const [activeIndex, setActiveIndex] = React.useState(-1);
	const [placement, setPlacement] = React.useState<"top" | "bottom">("bottom");
	const [availableHeight, setAvailableHeight] = React.useState(192);
	const containerRef = React.useRef<HTMLDivElement>(null);
	const listRef = React.useRef<HTMLDivElement>(null);
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

	React.useEffect(() => {
		setActiveIndex((i) => (i >= options.length ? -1 : i));
	}, [options.length]);

	const showDropdown = open && options.length > 0;

	React.useEffect(() => {
		if (!open) return;
		function onPointerDown(e: PointerEvent) {
			if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
		}
		document.addEventListener("pointerdown", onPointerDown, true);
		return () =>
			document.removeEventListener("pointerdown", onPointerDown, true);
	}, [open]);

	// Dialog handles Escape at document capture phase. Intercept it on window
	// only when the combobox owns focus, so the first Escape closes the list and
	// the next one closes the enclosing dialog.
	React.useEffect(() => {
		if (!showDropdown) return;
		function onKeyDownCapture(e: KeyboardEvent) {
			if (
				e.key === "Escape" &&
				containerRef.current?.contains(e.target as Node)
			) {
				e.preventDefault();
				e.stopImmediatePropagation();
				setOpen(false);
			}
		}
		window.addEventListener("keydown", onKeyDownCapture, true);
		return () => window.removeEventListener("keydown", onKeyDownCapture, true);
	}, [showDropdown]);

	// Anchor inside the dialog (not a body portal), and flip above the field
	// when there is less room below. Measuring the dialog's visible scroll box
	// prevents the list from moving the header/close button out of view.
	React.useLayoutEffect(() => {
		if (!showDropdown) return;
		const anchor = containerRef.current;
		if (!anchor) return;
		const dialog = anchor.closest<HTMLElement>("[role='dialog']");
		const viewport = window.visualViewport;
		function measure() {
			if (!anchor) return;
			const rect = anchor.getBoundingClientRect();
			const bounds = dialog?.getBoundingClientRect();
			const top = Math.max(bounds?.top ?? 0, viewport?.offsetTop ?? 0);
			const bottom = Math.min(
				bounds?.bottom ?? window.innerHeight,
				(viewport?.offsetTop ?? 0) + (viewport?.height ?? window.innerHeight),
			);
			const above = Math.max(0, rect.top - top);
			const below = Math.max(0, bottom - rect.bottom);
			const side =
				below >= Math.min(192, options.length * 40) || below >= above
					? "bottom"
					: "top";
			setPlacement(side);
			setAvailableHeight(
				Math.max(0, Math.min(192, (side === "top" ? above : below) - 8)),
			);
		}
		measure();
		window.addEventListener("resize", measure);
		window.addEventListener("scroll", measure, true);
		viewport?.addEventListener("resize", measure);
		viewport?.addEventListener("scroll", measure);
		return () => {
			window.removeEventListener("resize", measure);
			window.removeEventListener("scroll", measure, true);
			viewport?.removeEventListener("resize", measure);
			viewport?.removeEventListener("scroll", measure);
		};
	}, [showDropdown, options.length]);

	// Focus remains in the text field; keep its aria-activedescendant visibly
	// inside the scroll box when keyboard navigation reaches lower suggestions.
	React.useLayoutEffect(() => {
		if (!showDropdown || activeIndex < 0) return;
		const list = listRef.current;
		const option = list?.children[activeIndex] as HTMLElement | undefined;
		if (!list || !option) return;
		if (option.offsetTop < list.scrollTop) list.scrollTop = option.offsetTop;
		else if (
			option.offsetTop + option.offsetHeight >
			list.scrollTop + list.clientHeight
		) {
			list.scrollTop =
				option.offsetTop + option.offsetHeight - list.clientHeight;
		}
	}, [showDropdown, activeIndex]);

	function addTag(tag: string) {
		const t = tag.trim();
		if (t && !selectedSet.has(norm(t))) onChange([...value, t]);
		setQuery("");
		setActiveIndex(-1);
		setOpen(false);
	}

	function removeTag(tag: string) {
		onChange(value.filter((t) => t !== tag));
	}

	function commit(index: number) {
		const opt = options[index];
		if (opt) addTag(opt.value);
	}

	function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
		if (e.key === "Tab") {
			setOpen(false);
		} else if (e.key === "ArrowDown") {
			e.preventDefault();
			setOpen(true);
			if (options.length > 0) setActiveIndex((i) => (i + 1) % options.length);
		} else if (e.key === "ArrowUp") {
			e.preventDefault();
			setOpen(true);
			if (options.length > 0)
				setActiveIndex((i) => (i <= 0 ? options.length - 1 : i - 1));
		} else if (e.key === "Enter" || (e.key === "," && query.trim())) {
			if (!showDropdown && !query.trim()) return;
			e.preventDefault();
			if (showDropdown && activeIndex >= 0) commit(activeIndex);
			else if (query.trim()) {
				if (filtered.length > 0 && !canCreate) addTag(filtered[0]);
				else if (canCreate) addTag(query);
			} else if (showDropdown) commit(0);
		} else if (e.key === "Backspace" && !query && value.length > 0) {
			removeTag(value[value.length - 1]);
		}
	}

	return (
		<div ref={containerRef} className={cn("relative min-w-0", className)}>
			<div className="flex min-h-10 w-full min-w-0 flex-wrap items-center gap-1.5 rounded-md border border-input bg-background px-2 py-1.5 text-sm ring-offset-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
				{value.map((tag) => (
					<span
						key={tag}
						className="inline-flex max-w-full min-w-0 items-center gap-1 rounded-md bg-primary px-2 py-0.5 text-xs font-medium text-primary-foreground"
					>
						<span className="truncate">{tag}</span>
						<button
							type="button"
							onClick={() => removeTag(tag)}
							className="-mr-0.5 shrink-0 rounded-sm opacity-70 transition-opacity hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
							aria-label={`Remove ${tag}`}
						>
							<X className="h-3 w-3" />
						</button>
					</span>
				))}
				<input
					id={id}
					value={query}
					role="combobox"
					aria-label={ariaLabel}
					aria-expanded={showDropdown}
					aria-controls={showDropdown ? listId : undefined}
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
					onClick={() => setOpen(true)}
					onKeyDown={onKeyDown}
					placeholder={value.length === 0 ? placeholder : ""}
					className="h-7 min-w-0 flex-[1_0_6rem] bg-transparent px-1 text-base placeholder:text-muted-foreground focus-visible:outline-none sm:text-sm"
				/>
			</div>

			{showDropdown && (
				<div
					ref={listRef}
					id={listId}
					role="listbox"
					style={{ maxHeight: availableHeight }}
					className={cn(
						"absolute z-20 w-full overflow-y-auto overscroll-contain rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-md touch-pan-y",
						placement === "top"
							? "bottom-[calc(100%+0.25rem)]"
							: "top-[calc(100%+0.25rem)]",
					)}
				>
					{options.map((opt, idx) => {
						const active = idx === activeIndex;
						return (
							<button
								type="button"
								tabIndex={-1}
								key={`${opt.type}:${opt.value}`}
								id={`${listId}-opt-${idx}`}
								role="option"
								aria-selected={active}
								onMouseDown={(e) => e.preventDefault()}
								onMouseEnter={() => setActiveIndex(idx)}
								onClick={() => commit(idx)}
								className={cn(
									"flex min-h-10 w-full cursor-pointer items-center gap-1 rounded-sm px-2 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground focus-visible:bg-accent focus-visible:text-accent-foreground focus-visible:outline-none",
									active && "bg-accent text-accent-foreground",
									opt.type === "create" && !active && "text-muted-foreground",
								)}
							>
								{opt.type === "create" ? (
									<>
										Create{" "}
										<span className="min-w-0 truncate font-medium text-foreground">
											“{opt.value}”
										</span>
									</>
								) : (
									<span className="truncate">{opt.value}</span>
								)}
							</button>
						);
					})}
				</div>
			)}
		</div>
	);
}
