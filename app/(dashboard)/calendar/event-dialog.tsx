"use client";

import { Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogDescription,
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
import { TagInput } from "@/components/ui/tag-input";
import { Textarea } from "@/components/ui/textarea";
import { apiDelete, apiPatch, apiPost } from "@/lib/api-client";
import { RECURRENCE_OPTIONS, REMINDER_OPTIONS } from "@/lib/calendar/display";
import type { Occurrence } from "@/lib/calendar/expand";
import type { Recurrence } from "@/lib/calendar/recurrence";
import { useAllTags } from "@/lib/hooks/use-all-tags";
import type { EditScope } from "@/lib/validations/calendar";

type Form = {
	title: string;
	allDay: boolean;
	date: string;
	time: string;
	endDate: string;
	endTime: string;
	location: string;
	description: string;
	recurrence: Recurrence;
	recurrenceEnd: string;
	reminder: string;
	tags: string[];
};

function pad(n: number) {
	return String(n).padStart(2, "0");
}
function dateInput(d: Date) {
	return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function timeInput(d: Date) {
	return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function emptyForm(dateKey: string | null): Form {
	const now = new Date();
	return {
		title: "",
		allDay: false,
		date: dateKey ?? dateInput(now),
		time: "09:00",
		endDate: "",
		endTime: "",
		location: "",
		description: "",
		recurrence: "none",
		recurrenceEnd: "",
		reminder: "none",
		tags: [],
	};
}

function fromOccurrence(o: Occurrence): Form {
	const start = new Date(o.start);
	const end = o.end ? new Date(o.end) : null;
	return {
		title: o.title,
		allDay: o.allDay,
		date: o.allDay ? o.start.slice(0, 10) : dateInput(start),
		time: o.allDay ? "09:00" : timeInput(start),
		endDate: end ? (o.allDay ? o.end?.slice(0, 10) ?? "" : dateInput(end)) : "",
		endTime: end && !o.allDay ? timeInput(end) : "",
		location: o.location ?? "",
		description: o.description ?? "",
		recurrence: o.recurrence,
		recurrenceEnd: o.recurrenceEnd ? dateInput(new Date(o.recurrenceEnd)) : "",
		reminder: o.reminderMinutes == null ? "none" : String(o.reminderMinutes),
		tags: o.tags,
	};
}

const SCOPE_LABELS: { value: EditScope; label: string }[] = [
	{ value: "this", label: "This event" },
	{ value: "following", label: "This and following events" },
	{ value: "all", label: "All events" },
];

export function EventDialog({
	open,
	onOpenChange,
	editing,
	defaultDateKey,
	onSaved,
}: {
	open: boolean;
	onOpenChange: (v: boolean) => void;
	editing: Occurrence | null;
	defaultDateKey: string | null;
	onSaved: () => void;
}) {
	const [form, setForm] = useState<Form>(emptyForm(null));
	// When set, the recurring-scope chooser is shown for the pending action.
	const [scopeFor, setScopeFor] = useState<"save" | "delete" | null>(null);
	const [busy, setBusy] = useState(false);
	const tagSuggestions = useAllTags();

	useEffect(() => {
		if (!open) return;
		setScopeFor(null);
		setForm(editing ? fromOccurrence(editing) : emptyForm(defaultDateKey));
	}, [open, editing, defaultDateKey]);

	function set<K extends keyof Form>(key: K, value: Form[K]) {
		setForm((f) => ({ ...f, [key]: value }));
	}

	/** Turn the form into an API payload. */
	function payload() {
		const startAt = form.allDay
			? new Date(`${form.date}T00:00:00.000Z`).toISOString()
			: new Date(`${form.date}T${form.time || "00:00"}`).toISOString();

		let endAt: string | null = null;
		if (!form.allDay && form.endTime) {
			endAt = new Date(
				`${form.endDate || form.date}T${form.endTime}`,
			).toISOString();
		} else if (form.allDay && form.endDate && form.endDate !== form.date) {
			endAt = new Date(`${form.endDate}T00:00:00.000Z`).toISOString();
		}

		return {
			title: form.title,
			description: form.description || null,
			location: form.location || null,
			startAt,
			endAt,
			allDay: form.allDay,
			recurrence: form.recurrence,
			recurrenceEnd:
				form.recurrence !== "none" && form.recurrenceEnd
					? new Date(`${form.recurrenceEnd}T00:00:00.000Z`).toISOString()
					: null,
			reminderMinutes: form.reminder === "none" ? null : Number(form.reminder),
			tags: form.tags,
		};
	}

	async function persist(scope?: EditScope) {
		setBusy(true);
		try {
			if (!editing) {
				await apiPost("/api/calendar/events", payload());
			} else if (editing.recurring && editing.masterId) {
				await apiPatch(`/api/calendar/events/${editing.masterId}`, {
					...payload(),
					scope: scope ?? "all",
					occurrenceStart: editing.occurrenceStart,
				});
			} else {
				await apiPatch(`/api/calendar/events/${editing.eventId}`, payload());
			}
			toast.success(editing ? "Event updated" : "Event created");
			onSaved();
			onOpenChange(false);
		} catch (err) {
			toast.error("Failed to save event", {
				description: err instanceof Error ? err.message : undefined,
			});
		} finally {
			setBusy(false);
		}
	}

	async function destroy(scope: EditScope) {
		if (!editing) return;
		setBusy(true);
		try {
			const target =
				editing.recurring && editing.masterId
					? editing.masterId
					: editing.eventId;
			const qs =
				editing.recurring && editing.masterId
					? `?scope=${scope}&occurrenceStart=${encodeURIComponent(editing.occurrenceStart)}`
					: "";
			await apiDelete(`/api/calendar/events/${target}${qs}`);
			toast.success("Event deleted");
			onSaved();
			onOpenChange(false);
		} catch (err) {
			toast.error("Failed to delete event", {
				description: err instanceof Error ? err.message : undefined,
			});
		} finally {
			setBusy(false);
		}
	}

	function onSubmit(e: React.FormEvent) {
		e.preventDefault();
		if (editing?.recurring) setScopeFor("save");
		else persist();
	}

	function onDeleteClick() {
		if (editing?.recurring) setScopeFor("delete");
		else destroy("all");
	}

	// Recurring scope chooser (shown before applying an edit or delete).
	if (scopeFor) {
		const isDelete = scopeFor === "delete";
		return (
			<Dialog open={open} onOpenChange={onOpenChange}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>
							{isDelete ? "Delete recurring event" : "Edit recurring event"}
						</DialogTitle>
						<DialogDescription>
							Apply this {isDelete ? "deletion" : "change"} to:
						</DialogDescription>
					</DialogHeader>
					<div className="space-y-2">
						{SCOPE_LABELS.map((s) => (
							<Button
								key={s.value}
								type="button"
								variant="outline"
								className="w-full justify-start"
								disabled={busy}
								onClick={() => (isDelete ? destroy(s.value) : persist(s.value))}
							>
								{s.label}
							</Button>
						))}
					</div>
					<DialogFooter>
						<Button
							type="button"
							variant="ghost"
							disabled={busy}
							onClick={() => setScopeFor(null)}
						>
							Back
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		);
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>{editing ? "Edit event" : "New event"}</DialogTitle>
					<DialogDescription>
						Set the time, repeat rule, reminder, and tags for this event.
					</DialogDescription>
				</DialogHeader>
				<form onSubmit={onSubmit} className="space-y-4">
					<div className="space-y-2">
						<Label htmlFor="ev-title">Title</Label>
						<Input
							id="ev-title"
							required
							value={form.title}
							onChange={(e) => set("title", e.target.value)}
							placeholder="e.g. Dentist appointment"
						/>
					</div>

					<label
						htmlFor="ev-allday"
						className="flex items-center gap-2 text-sm"
					>
						<input
							id="ev-allday"
							type="checkbox"
							className="h-4 w-4 rounded border-input accent-primary"
							checked={form.allDay}
							onChange={(e) => set("allDay", e.target.checked)}
						/>
						All day
					</label>

					<div className="grid grid-cols-2 gap-4">
						<div className="space-y-2">
							<Label htmlFor="ev-date">Date</Label>
							<Input
								id="ev-date"
								type="date"
								required
								value={form.date}
								onChange={(e) => set("date", e.target.value)}
							/>
						</div>
						{!form.allDay && (
							<div className="space-y-2">
								<Label htmlFor="ev-time">Start time</Label>
								<Input
									id="ev-time"
									type="time"
									value={form.time}
									onChange={(e) => set("time", e.target.value)}
								/>
							</div>
						)}
					</div>

					<div className="grid grid-cols-2 gap-4">
						<div className="space-y-2">
							<Label htmlFor="ev-enddate">End date (optional)</Label>
							<Input
								id="ev-enddate"
								type="date"
								value={form.endDate}
								onChange={(e) => set("endDate", e.target.value)}
							/>
						</div>
						{!form.allDay && (
							<div className="space-y-2">
								<Label htmlFor="ev-endtime">End time (optional)</Label>
								<Input
									id="ev-endtime"
									type="time"
									value={form.endTime}
									onChange={(e) => set("endTime", e.target.value)}
								/>
							</div>
						)}
					</div>

					<div className="grid grid-cols-2 gap-4">
						<div className="space-y-2">
							<Label htmlFor="ev-recurrence">Repeat</Label>
							<Select
								value={form.recurrence}
								onValueChange={(v) => set("recurrence", v as Recurrence)}
							>
								<SelectTrigger id="ev-recurrence">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{RECURRENCE_OPTIONS.map((o) => (
										<SelectItem key={o.value} value={o.value}>
											{o.label}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
						{form.recurrence !== "none" && (
							<div className="space-y-2">
								<Label htmlFor="ev-until">Repeat until (optional)</Label>
								<Input
									id="ev-until"
									type="date"
									value={form.recurrenceEnd}
									onChange={(e) => set("recurrenceEnd", e.target.value)}
								/>
							</div>
						)}
					</div>

					<div className="space-y-2">
						<Label htmlFor="ev-reminder">Reminder (Telegram)</Label>
						<Select
							value={form.reminder}
							onValueChange={(v) => set("reminder", v)}
						>
							<SelectTrigger id="ev-reminder">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								{REMINDER_OPTIONS.map((o) => (
									<SelectItem key={o.value} value={o.value}>
										{o.label}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
						<p className="text-xs text-muted-foreground">
							Reminders arrive in your daily Telegram digest once the lead time
							is reached. Set it up in Settings → Notifications.
						</p>
					</div>

					<div className="space-y-2">
						<Label htmlFor="ev-location">Location (optional)</Label>
						<Input
							id="ev-location"
							value={form.location}
							onChange={(e) => set("location", e.target.value)}
							placeholder="e.g. 12 Main St, or a video link"
						/>
					</div>

					<div className="space-y-2">
						<Label htmlFor="ev-desc">Notes (optional)</Label>
						<Textarea
							id="ev-desc"
							value={form.description}
							onChange={(e) => set("description", e.target.value)}
							rows={2}
						/>
					</div>

					<div className="space-y-2">
						<Label>Tags</Label>
						<TagInput
							value={form.tags}
							onChange={(tags) => set("tags", tags)}
							suggestions={tagSuggestions}
							placeholder="e.g. work, family…"
						/>
					</div>

					<DialogFooter className="sm:justify-between">
						{editing ? (
							<Button
								type="button"
								variant="ghost"
								className="text-destructive hover:text-destructive"
								disabled={busy}
								onClick={onDeleteClick}
							>
								<Trash2 className="mr-2 h-4 w-4" /> Delete
							</Button>
						) : (
							<span className="hidden sm:block" />
						)}
						<div className="flex flex-col-reverse gap-2 sm:flex-row">
							<DialogClose asChild>
								<Button type="button" variant="outline" disabled={busy}>
									Cancel
								</Button>
							</DialogClose>
							<Button type="submit" disabled={busy}>
								{editing ? "Save" : "Create"}
							</Button>
						</div>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
