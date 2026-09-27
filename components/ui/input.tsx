import * as React from "react";

import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
	({ className, type, ...props }, ref) => {
		// iOS WebKit lays out a date input's width before adding its own
		// horizontal padding. Keep the native picker, but put the visual border
		// and spacing on an outer box so the input itself cannot overflow 100%.
		if (type === "date") {
			return (
				<span
					className={cn(
						"flex h-10 w-full min-w-0 max-w-full items-center rounded-md border border-input bg-background px-3 ring-offset-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2",
						props.disabled && "cursor-not-allowed opacity-50",
						className,
					)}
				>
					<input
						type={type}
						className="h-full w-full min-w-0 max-w-full flex-1 border-0 bg-transparent px-0 py-0 text-base outline-none md:text-sm"
						ref={ref}
						{...props}
					/>
				</span>
			);
		}

		return (
			<input
				type={type}
				className={cn(
					// Canonical tweakcn 2077 look: bg matches page, 1px border using
					// the slightly-tweaked --input token so the field is visible
					// against pure-white/pure-black without being heavy/bright.
					"flex h-10 w-full min-w-0 max-w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
					className,
				)}
				ref={ref}
				{...props}
			/>
		);
	},
);
Input.displayName = "Input";

export { Input };
