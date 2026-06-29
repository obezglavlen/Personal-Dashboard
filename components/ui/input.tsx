import * as React from "react"

import { cn } from "@/lib/utils"

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          // 2077 brutalist: dark border + filled bg so the input reads
          // as a solid block against the page. bg-input uses --input
          // (a clearly contrasting shade set in globals.css), not
          // bg-background (which equals the page and made the field
          // invisible). border-foreground keeps edges crisp in both
          // light (black border) and dark (white border) themes.
          "flex h-10 w-full rounded-md border-2 border-foreground bg-input px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }