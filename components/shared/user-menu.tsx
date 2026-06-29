"use client";

import { Coins, LogOut } from "lucide-react";
import { signOut } from "next-auth/react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuPortal,
	DropdownMenuRadioGroup,
	DropdownMenuRadioItem,
	DropdownMenuSeparator,
	DropdownMenuSub,
	DropdownMenuSubContent,
	DropdownMenuSubTrigger,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CURRENCIES, currencyLabel } from "@/lib/currencies";
import { useCurrency } from "@/lib/hooks/use-currency";

export function UserMenu({
	email,
	name,
}: {
	email: string;
	name?: string | null;
}) {
	const { currency, setCurrency } = useCurrency();

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button variant="ghost" className="relative h-9 w-9 rounded-full">
					<Avatar className="h-9 w-9">
						<AvatarFallback>
							{name?.[0]?.toUpperCase() || email[0].toUpperCase()}
						</AvatarFallback>
					</Avatar>
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end">
				<DropdownMenuLabel>
					<div className="flex flex-col">
						<span className="text-sm font-medium">{name || "User"}</span>
						<span className="text-xs text-muted-foreground">{email}</span>
					</div>
				</DropdownMenuLabel>
				<DropdownMenuSeparator />
				<DropdownMenuSub>
					<DropdownMenuSubTrigger>
						<Coins className="mr-2 h-4 w-4" />
						Currency
						<span className="ml-auto pl-2 text-xs text-muted-foreground">
							{currencyLabel(currency)}
						</span>
					</DropdownMenuSubTrigger>
					<DropdownMenuPortal>
						<DropdownMenuSubContent>
							<DropdownMenuRadioGroup
								value={currency}
								onValueChange={(v) => {
									void setCurrency(v);
								}}
							>
								{CURRENCIES.map((c) => (
									<DropdownMenuRadioItem key={c} value={c}>
										{currencyLabel(c)}
									</DropdownMenuRadioItem>
								))}
							</DropdownMenuRadioGroup>
						</DropdownMenuSubContent>
					</DropdownMenuPortal>
				</DropdownMenuSub>
				<DropdownMenuSeparator />
				<DropdownMenuItem onClick={() => signOut({ callbackUrl: "/login" })}>
					<LogOut className="mr-2 h-4 w-4" />
					Sign out
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
