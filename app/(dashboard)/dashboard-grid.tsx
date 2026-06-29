"use client";

import {
	closestCenter,
	DndContext,
	type DragEndEvent,
	KeyboardSensor,
	PointerSensor,
	useSensor,
	useSensors,
} from "@dnd-kit/core";
import {
	arrayMove,
	SortableContext,
	sortableKeyboardCoordinates,
	useSortable,
	verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Eye, EyeOff, GripVertical, Settings2 } from "lucide-react";
import type { ReactNode } from "react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { apiPut } from "@/lib/api-client";
import { DEFAULT_ORDER, WIDGETS } from "@/lib/dashboard/widgets";

const TITLES: Record<string, string> = Object.fromEntries(
	WIDGETS.map((w) => [w.id, w.title]),
);

interface DashboardGridProps {
	/** Server-rendered widget content keyed by widget id. */
	slots: Record<string, ReactNode>;
	initialOrder: string[];
	initialHidden: string[];
}

function SortableRow({
	id,
	title,
	hidden,
	onToggle,
}: {
	id: string;
	title: string;
	hidden: boolean;
	onToggle: (id: string) => void;
}) {
	const {
		attributes,
		listeners,
		setNodeRef,
		transform,
		transition,
		isDragging,
	} = useSortable({ id });
	const style = {
		transform: CSS.Transform.toString(transform),
		transition,
		opacity: isDragging ? 0.5 : 1,
	};
	return (
		<div
			ref={setNodeRef}
			style={style}
			className="flex items-center gap-3 rounded-md border border-border bg-background p-3"
		>
			<button
				type="button"
				aria-label="Drag to reorder"
				className="cursor-grab touch-none text-muted-foreground hover:text-foreground"
				{...attributes}
				{...listeners}
			>
				<GripVertical className="h-4 w-4" />
			</button>
			<span
				className={`flex-1 text-sm ${hidden ? "text-muted-foreground line-through" : ""}`}
			>
				{title}
			</span>
			<Button
				type="button"
				variant="ghost"
				size="sm"
				onClick={() => onToggle(id)}
				aria-label={hidden ? `Show ${title}` : `Hide ${title}`}
			>
				{hidden ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
			</Button>
		</div>
	);
}

export function DashboardGrid({
	slots,
	initialOrder,
	initialHidden,
}: DashboardGridProps) {
	const [editing, setEditing] = useState(false);
	const [order, setOrder] = useState<string[]>(initialOrder);
	const [hidden, setHidden] = useState<Set<string>>(new Set(initialHidden));
	const [saving, setSaving] = useState(false);

	const sensors = useSensors(
		useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
		useSensor(KeyboardSensor, {
			coordinateGetter: sortableKeyboardCoordinates,
		}),
	);

	function handleDragEnd(event: DragEndEvent) {
		const { active, over } = event;
		if (over && active.id !== over.id) {
			setOrder((prev) =>
				arrayMove(
					prev,
					prev.indexOf(active.id as string),
					prev.indexOf(over.id as string),
				),
			);
		}
	}

	function toggle(id: string) {
		setHidden((prev) => {
			const next = new Set(prev);
			if (next.has(id)) next.delete(id);
			else next.add(id);
			return next;
		});
	}

	async function save() {
		setSaving(true);
		try {
			await apiPut("/api/settings", {
				dashboardLayout: { order, hidden: [...hidden] },
			});
			toast.success("Layout saved");
			setEditing(false);
		} catch (err) {
			toast.error(err instanceof Error ? err.message : "Failed to save layout");
		} finally {
			setSaving(false);
		}
	}

	function cancel() {
		setOrder(initialOrder);
		setHidden(new Set(initialHidden));
		setEditing(false);
	}

	return (
		<div className="space-y-6 sm:space-y-8">
			<div className="flex justify-end">
				{editing ? (
					<div className="flex gap-2">
						<Button
							variant="ghost"
							size="sm"
							onClick={() => {
								setOrder(DEFAULT_ORDER);
								setHidden(new Set());
							}}
						>
							Reset
						</Button>
						<Button variant="outline" size="sm" onClick={cancel}>
							Cancel
						</Button>
						<Button size="sm" onClick={save} disabled={saving}>
							{saving ? "Saving…" : "Save layout"}
						</Button>
					</div>
				) : (
					<Button variant="outline" size="sm" onClick={() => setEditing(true)}>
						<Settings2 className="h-4 w-4" /> Customize
					</Button>
				)}
			</div>

			{editing ? (
				<DndContext
					sensors={sensors}
					collisionDetection={closestCenter}
					onDragEnd={handleDragEnd}
				>
					<SortableContext items={order} strategy={verticalListSortingStrategy}>
						<div className="space-y-2">
							{order.map((id) => (
								<SortableRow
									key={id}
									id={id}
									title={TITLES[id] ?? id}
									hidden={hidden.has(id)}
									onToggle={toggle}
								/>
							))}
						</div>
					</SortableContext>
				</DndContext>
			) : (
				<div className="space-y-6 sm:space-y-8">
					{order
						.filter((id) => !hidden.has(id))
						.map((id) => (
							<div key={id}>{slots[id]}</div>
						))}
				</div>
			)}
		</div>
	);
}
