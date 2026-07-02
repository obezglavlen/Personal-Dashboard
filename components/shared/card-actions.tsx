"use client";

import { Pencil, Trash2, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Shared card action cluster used by the subscriptions and recurring cards:
 * Edit, auto-post toggle, Delete — in that order. The Zap fills with the
 * primary colour when auto-post is on and is muted when off.
 */
export function CardActions({
	auto,
	onEdit,
	onToggleAuto,
	onDelete,
	autoOnTitle = "Auto-post on",
	autoOffTitle = "Auto-post off",
	editLabel = "Edit",
	deleteLabel = "Delete",
}: {
	auto: boolean;
	onEdit: () => void;
	onToggleAuto: () => void;
	onDelete: () => void;
	autoOnTitle?: string;
	autoOffTitle?: string;
	editLabel?: string;
	deleteLabel?: string;
}) {
	return (
		<div className="flex shrink-0 items-center gap-1">
			<Button variant="ghost" size="icon" onClick={onEdit} aria-label={editLabel}>
				<Pencil className="h-3 w-3" />
			</Button>
			<Button
				variant="ghost"
				size="icon"
				onClick={onToggleAuto}
				aria-label={auto ? "Disable auto-post" : "Enable auto-post"}
				title={auto ? autoOnTitle : autoOffTitle}
			>
				<Zap
					className={`h-3 w-3 ${auto ? "fill-current text-primary" : "text-muted-foreground"}`}
				/>
			</Button>
			<Button
				variant="ghost"
				size="icon"
				onClick={onDelete}
				aria-label={deleteLabel}
			>
				<Trash2 className="h-3 w-3" />
			</Button>
		</div>
	);
}
