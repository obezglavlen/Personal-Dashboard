"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import * as React from "react";

import { cn } from "@/lib/utils";

const Dialog = DialogPrimitive.Root;

const DialogTrigger = DialogPrimitive.Trigger;

const DialogPortal = DialogPrimitive.Portal;

const DialogClose = DialogPrimitive.Close;

const DialogOverlay = React.forwardRef<
	React.ElementRef<typeof DialogPrimitive.Overlay>,
	React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
	<DialogPrimitive.Overlay
		ref={ref}
		className={cn(
			"fixed inset-0 z-50 bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
			className,
		)}
		{...props}
	/>
));
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName;

const DialogContent = React.forwardRef<
	React.ElementRef<typeof DialogPrimitive.Content>,
	React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, ...props }, ref) => {
	// Radix Select/Popover dropdowns are portaled outside this content node and
	// break dialog dismissal: while one is open, Radix sets pointer-events:none
	// on everything outside it, so a click meant for inside the modal falls
	// through to the overlay and dismisses the dialog. By the time Radix's own
	// outside handlers run, the dropdown has already unmounted — so we snapshot
	// "was a popper open at pointerdown?" in a capture-phase listener (which
	// runs first) and consult it in the dismiss guards below.
	const popperOpenAtPointerDown = React.useRef(false);
	React.useEffect(() => {
		const onPointerDown = () => {
			popperOpenAtPointerDown.current = !!document.querySelector(
				"[data-radix-popper-content-wrapper]",
			);
		};
		document.addEventListener("pointerdown", onPointerDown, true);
		return () =>
			document.removeEventListener("pointerdown", onPointerDown, true);
	}, []);

	return (
		<DialogPortal>
			<DialogOverlay />
			<DialogPrimitive.Content
				ref={ref}
				className={cn(
					// Mobile: full-width sheet pinned to the bottom (sheet-from-bottom feel);
					// max-h capped so it doesn't cover the whole screen and content scrolls.
					// Desktop (sm+): centered modal as before.
					"fixed left-1/2 top-1/2 z-50 grid w-[calc(100vw-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 gap-4 border bg-background p-6 shadow-lg duration-200",
					// pb uses max() so desktop keeps the 1.5rem padding while mobile
					// extends it past the safe-area inset (pb-safe alone is 0 on desktop
					// and would leave the footer button flush against the edge).
					"max-h-[90vh] overflow-y-auto pb-[max(1.5rem,env(safe-area-inset-bottom))]",
					"data-[state=open]:animate-in data-[state=closed]:animate-out",
					"data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
					"data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
					"data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%]",
					"data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]",
					"sm:rounded-lg",
					className,
				)}
				{...props}
				// Radix Select/Popover render their dropdown in a portal *outside* this
				// content node, which breaks dialog dismissal in two ways:
				//  1. Pointer: while a Select is open, Radix sets pointer-events:none on
				//     everything outside it (incl. this content), so a click meant for
				//     inside the modal falls through to the overlay and would dismiss
				//     the dialog. Suppress when the target is a popper layer or any
				//     popper is currently open.
				//  2. Focus: closing the Select moves focus, firing focusOutside *after*
				//     the popper is gone (so the pointer guard can't see it). We never
				//     want a focus shift to dismiss the dialog, so always prevent it.
				// Placed after {...props} so they win, while chaining caller handlers.
				onPointerDownOutside={(e) => {
					const target = e.target as HTMLElement | null;
					if (
						popperOpenAtPointerDown.current ||
						target?.closest(
							"[data-radix-popper-content-wrapper],[data-radix-select-content]",
						)
					) {
						e.preventDefault();
					}
					props.onPointerDownOutside?.(e);
				}}
				onFocusOutside={(e) => {
					// A Select closing moves focus, firing focusOutside right after the
					// popper unmounts; the ref still reflects that it was just open.
					if (popperOpenAtPointerDown.current) e.preventDefault();
					props.onFocusOutside?.(e);
				}}
			>
				{children}
				<DialogPrimitive.Close className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground">
					<X className="h-4 w-4" />
					<span className="sr-only">Close</span>
				</DialogPrimitive.Close>
			</DialogPrimitive.Content>
		</DialogPortal>
	);
});
DialogContent.displayName = DialogPrimitive.Content.displayName;

const DialogHeader = ({
	className,
	...props
}: React.HTMLAttributes<HTMLDivElement>) => (
	<div
		className={cn(
			"flex flex-col space-y-1.5 text-center sm:text-left",
			className,
		)}
		{...props}
	/>
);
DialogHeader.displayName = "DialogHeader";

const DialogFooter = ({
	className,
	...props
}: React.HTMLAttributes<HTMLDivElement>) => (
	<div
		className={cn(
			"flex flex-col-reverse gap-2 sm:flex-row sm:justify-end",
			className,
		)}
		{...props}
	/>
);
DialogFooter.displayName = "DialogFooter";

const DialogTitle = React.forwardRef<
	React.ElementRef<typeof DialogPrimitive.Title>,
	React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
	<DialogPrimitive.Title
		ref={ref}
		className={cn(
			"text-lg font-semibold leading-none tracking-tight",
			className,
		)}
		{...props}
	/>
));
DialogTitle.displayName = DialogPrimitive.Title.displayName;

const DialogDescription = React.forwardRef<
	React.ElementRef<typeof DialogPrimitive.Description>,
	React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
	<DialogPrimitive.Description
		ref={ref}
		className={cn("text-sm text-muted-foreground", className)}
		{...props}
	/>
));
DialogDescription.displayName = DialogPrimitive.Description.displayName;

export {
	Dialog,
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogOverlay,
	DialogPortal,
	DialogTitle,
	DialogTrigger,
};
