"use client";

import {
	closestCorners,
	DndContext,
	type DragEndEvent,
	DragOverlay,
	type DragStartEvent,
	KeyboardSensor,
	PointerSensor,
	useDraggable,
	useDroppable,
	useSensor,
	useSensors,
} from "@dnd-kit/core";
import {
	Check,
	Circle,
	Clock,
	GripVertical,
	Pencil,
	Plus,
	Trash2,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useResource } from "@/lib/hooks/use-resource";
import { cn } from "@/lib/utils";

type Task = {
	id: string;
	title: string;
	description?: string;
	status: string;
	priority: string;
	dueDate?: string | null;
	createdAt: string;
};

const statusConfig = {
	todo: { label: "To Do", icon: Circle, color: "text-muted-foreground" },
	in_progress: { label: "In Progress", icon: Clock, color: "text-blue-500" },
	done: { label: "Done", icon: Check, color: "text-green-500" },
};

const priorityColors: Record<string, string> = {
	low: "bg-blue-500/10 text-blue-500",
	medium: "bg-yellow-500/10 text-yellow-600",
	high: "bg-red-500/10 text-red-500",
};

type Priority = "low" | "medium" | "high";
type Status = "todo" | "in_progress" | "done";

const COLUMNS = ["todo", "in_progress", "done"] as const;

type TaskFormValues = {
	title: string;
	description: string;
	status: Status;
	priority: Priority;
	dueDate: string;
};

const EMPTY_FORM: TaskFormValues = {
	title: "",
	description: "",
	status: "todo",
	priority: "medium",
	dueDate: "",
};

/** Shared title/description/priority/due-date inputs for create and edit. */
function TaskFields({
	form,
	setForm,
	idPrefix,
}: {
	form: TaskFormValues;
	setForm: (f: TaskFormValues) => void;
	idPrefix: string;
}) {
	return (
		<>
			<div className="space-y-2">
				<Label htmlFor={`${idPrefix}-title`}>Title</Label>
				<Input
					id={`${idPrefix}-title`}
					required
					value={form.title}
					onChange={(e) => setForm({ ...form, title: e.target.value })}
				/>
			</div>
			<div className="space-y-2">
				<Label htmlFor={`${idPrefix}-description`}>Description</Label>
				<Textarea
					id={`${idPrefix}-description`}
					rows={3}
					value={form.description}
					onChange={(e) => setForm({ ...form, description: e.target.value })}
				/>
			</div>
			<div className="grid grid-cols-2 gap-4">
				<div className="space-y-2">
					<Label>Priority</Label>
					<Select
						value={form.priority}
						onValueChange={(v) => setForm({ ...form, priority: v as Priority })}
					>
						<SelectTrigger>
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="low">Low</SelectItem>
							<SelectItem value="medium">Medium</SelectItem>
							<SelectItem value="high">High</SelectItem>
						</SelectContent>
					</Select>
				</div>
				<div className="space-y-2">
					<Label htmlFor={`${idPrefix}-dueDate`}>Due Date</Label>
					<Input
						id={`${idPrefix}-dueDate`}
						type="date"
						value={form.dueDate}
						onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
					/>
				</div>
			</div>
		</>
	);
}

/** Presentational card body, shared by the in-column card and the drag overlay. */
function TaskCardView({
	task,
	onDelete,
	onEdit,
	dragging,
	handleProps,
}: {
	task: Task;
	onDelete?: (id: string) => void;
	onEdit?: (task: Task) => void;
	dragging?: boolean;
	// Drag listeners/attributes applied to the grip handle only, so the rest
	// of the card stays scrollable on touch devices. Typed loosely because
	// dnd-kit's listener map isn't assignable to React's button attributes.
	handleProps?: Record<string, unknown>;
}) {
	return (
		<Card
			className={cn(
				"transition-colors hover:bg-accent/40",
				dragging && "shadow-lg ring-2 ring-primary/40",
			)}
		>
			<CardHeader className="pb-2">
				<div className="flex items-start justify-between gap-2">
					<div className="flex items-start gap-1.5">
						{handleProps ? (
							<button
								type="button"
								aria-label="Drag to reorder"
								className="-m-1 flex shrink-0 cursor-grab touch-none items-center self-stretch p-1 text-muted-foreground"
								{...handleProps}
							>
								<GripVertical className="h-4 w-4" />
							</button>
						) : (
							<GripVertical className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
						)}
						<CardTitle className="mt-0.5 text-sm">{task.title}</CardTitle>
					</div>
					<div className="flex shrink-0 items-center">
						{onEdit && (
							<Button
								variant="ghost"
								size="icon"
								// Stop the pointer from initiating a drag when editing.
								onPointerDown={(e) => e.stopPropagation()}
								onClick={() => onEdit(task)}
								aria-label="Edit"
							>
								<Pencil className="h-3 w-3" />
							</Button>
						)}
						{onDelete && (
							<Button
								variant="ghost"
								size="icon"
								// Stop the pointer from initiating a drag when deleting.
								onPointerDown={(e) => e.stopPropagation()}
								onClick={() => onDelete(task.id)}
								aria-label="Delete"
							>
								<Trash2 className="h-3 w-3" />
							</Button>
						)}
					</div>
				</div>
			</CardHeader>
			{task.description && (
				<CardContent className="pt-0 pb-2">
					<p className="text-xs text-muted-foreground">{task.description}</p>
				</CardContent>
			)}
			<CardContent className="pt-0">
				<span
					className={cn(
						"rounded-full px-2 py-0.5 text-xs",
						priorityColors[task.priority],
					)}
				>
					{task.priority}
				</span>
			</CardContent>
		</Card>
	);
}

function DraggableCard({
	task,
	onDelete,
	onEdit,
}: {
	task: Task;
	onDelete: (id: string) => void;
	onEdit: (task: Task) => void;
}) {
	const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
		id: task.id,
	});
	return (
		<div ref={setNodeRef} className={cn(isDragging && "opacity-40")}>
			<TaskCardView
				task={task}
				onDelete={onDelete}
				onEdit={onEdit}
				handleProps={{ ...attributes, ...listeners }}
			/>
		</div>
	);
}

function Column({
	col,
	count,
	children,
}: {
	col: Status;
	count: number;
	children: React.ReactNode;
}) {
	const { setNodeRef, isOver } = useDroppable({ id: col });
	const config = statusConfig[col];
	const Icon = config.icon;
	return (
		<div className="space-y-3">
			<div className="flex items-center gap-2">
				<Icon className={cn("h-4 w-4", config.color)} />
				<h2 className="font-semibold">{config.label}</h2>
				<span className="text-sm text-muted-foreground">({count})</span>
			</div>
			<div
				ref={setNodeRef}
				className={cn(
					"min-h-24 space-y-2 rounded-md p-1 transition-colors",
					isOver && "bg-accent/50 ring-2 ring-primary/40",
				)}
			>
				{children}
			</div>
		</div>
	);
}

export function TaskClient() {
	const {
		items: tasks,
		create,
		update,
		remove,
		mutate,
	} = useResource<Task>("/api/tasks");
	const [showForm, setShowForm] = useState(false);
	const [savingAdd, setSavingAdd] = useState(false);
	const [activeId, setActiveId] = useState<string | null>(null);
	const [form, setForm] = useState<TaskFormValues>(EMPTY_FORM);
	const [editId, setEditId] = useState<string | null>(null);
	const [editForm, setEditForm] = useState<TaskFormValues>(EMPTY_FORM);
	const [savingEdit, setSavingEdit] = useState(false);

	const sensors = useSensors(
		useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
		useSensor(KeyboardSensor),
	);

	async function addTask(e: React.FormEvent) {
		e.preventDefault();
		setSavingAdd(true);
		try {
			await create(form);
			setForm(EMPTY_FORM);
			setShowForm(false);
		} catch (err) {
			toast.error(err instanceof Error ? err.message : "Failed to add task");
		} finally {
			setSavingAdd(false);
		}
	}

	function openEdit(task: Task) {
		setEditId(task.id);
		setEditForm({
			title: task.title,
			description: task.description ?? "",
			status: task.status as Status,
			priority: task.priority as Priority,
			dueDate: task.dueDate ? task.dueDate.slice(0, 10) : "",
		});
	}

	async function saveEdit(e: React.FormEvent) {
		e.preventDefault();
		if (!editId) return;
		setSavingEdit(true);
		try {
			await update(editId, {
				title: editForm.title,
				description: editForm.description,
				priority: editForm.priority,
				// Empty string clears the due date (toUpdateData maps falsy -> null);
				// sending null directly would fail the optional-string schema.
				dueDate: editForm.dueDate,
			});
			setEditId(null);
		} catch (err) {
			toast.error(err instanceof Error ? err.message : "Failed to save task");
		} finally {
			setSavingEdit(false);
		}
	}

	async function moveTask(id: string, status: Status) {
		// Optimistically reflect the move, then persist (update() revalidates).
		mutate((prev) => prev?.map((t) => (t.id === id ? { ...t, status } : t)), {
			revalidate: false,
		});
		try {
			await update(id, { status });
		} catch (err) {
			mutate();
			toast.error(err instanceof Error ? err.message : "Failed to move task");
		}
	}

	async function deleteTask(id: string) {
		try {
			await remove(id);
		} catch (err) {
			toast.error(err instanceof Error ? err.message : "Failed to delete task");
		}
	}

	function onDragStart(e: DragStartEvent) {
		setActiveId(e.active.id as string);
	}

	function onDragEnd(e: DragEndEvent) {
		setActiveId(null);
		const { active, over } = e;
		if (!over) return;
		const id = active.id as string;
		const target = over.id as Status;
		const task = tasks?.find((t) => t.id === id);
		if (task && task.status !== target) moveTask(id, target);
	}

	const activeTask = tasks?.find((t) => t.id === activeId) ?? null;

	return (
		<div className="space-y-4 sm:space-y-6">
			<div className="flex flex-col gap-1">
				<h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Tasks</h1>
				<p className="text-sm text-muted-foreground sm:text-base">
					Kanban board — drag cards between columns to change status.
				</p>
			</div>
			<div className="flex justify-end">
				<Button
					onClick={() => {
						setForm(EMPTY_FORM);
						setShowForm(true);
					}}
					className="w-full sm:w-auto"
				>
					<Plus className="mr-2 h-4 w-4" /> Add Task
				</Button>
			</div>

			<Dialog open={showForm} onOpenChange={setShowForm}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>New Task</DialogTitle>
					</DialogHeader>
					<form onSubmit={addTask} className="space-y-4">
						<TaskFields form={form} setForm={setForm} idPrefix="new" />
						<DialogFooter>
							<Button
								type="button"
								variant="outline"
								onClick={() => setShowForm(false)}
								disabled={savingAdd}
							>
								Cancel
							</Button>
							<Button type="submit" disabled={savingAdd}>
								{savingAdd ? "Saving…" : "Add task"}
							</Button>
						</DialogFooter>
					</form>
				</DialogContent>
			</Dialog>

			<DndContext
				sensors={sensors}
				collisionDetection={closestCorners}
				onDragStart={onDragStart}
				onDragEnd={onDragEnd}
				onDragCancel={() => setActiveId(null)}
			>
				<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
					{COLUMNS.map((col) => {
						const colTasks = tasks?.filter((t) => t.status === col) ?? [];
						return (
							<Column key={col} col={col} count={colTasks.length}>
								{colTasks.map((task) => (
									<DraggableCard
										key={task.id}
										task={task}
										onDelete={deleteTask}
										onEdit={openEdit}
									/>
								))}
							</Column>
						);
					})}
				</div>

				<DragOverlay>
					{activeTask ? <TaskCardView task={activeTask} dragging /> : null}
				</DragOverlay>
			</DndContext>

			<Dialog
				open={editId !== null}
				onOpenChange={(o) => !o && setEditId(null)}
			>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Edit Task</DialogTitle>
					</DialogHeader>
					<form onSubmit={saveEdit} className="space-y-4">
						<TaskFields form={editForm} setForm={setEditForm} idPrefix="edit" />
						<DialogFooter>
							<Button
								type="button"
								variant="outline"
								onClick={() => setEditId(null)}
								disabled={savingEdit}
							>
								Cancel
							</Button>
							<Button type="submit" disabled={savingEdit}>
								{savingEdit ? "Saving…" : "Save changes"}
							</Button>
						</DialogFooter>
					</form>
				</DialogContent>
			</Dialog>
		</div>
	);
}
