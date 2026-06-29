"use client";

import { Database, Download, Lock, Palette, Upload, User } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiGet, apiPost, apiPut } from "@/lib/api-client";

type SettingsData = {
	name: string | null;
	email: string | null;
	theme: string;
};

export function SettingsClient() {
	const { setTheme } = useTheme();
	const [name, setName] = useState("");
	const [email, setEmail] = useState("");
	const [theme, setThemeState] = useState("system");
	const [currentPassword, setCurrentPassword] = useState("");
	const [newPassword, setNewPassword] = useState("");
	const fileInputRef = useRef<HTMLInputElement>(null);
	const importModeRef = useRef<"merge" | "replace">("merge");
	const [importing, setImporting] = useState(false);
	const [pendingFile, setPendingFile] = useState<File | null>(null);
	const [confirmReplace, setConfirmReplace] = useState(false);

	useEffect(() => {
		apiGet<SettingsData>("/api/settings")
			.then((data) => {
				setName(data.name || "");
				setEmail(data.email || "");
				setThemeState(data.theme || "system");
			})
			.catch(() => toast.error("Failed to load settings"));
	}, []);

	async function saveProfile(e: React.FormEvent) {
		e.preventDefault();
		try {
			await apiPut("/api/settings", { name, theme });
			setTheme(theme);
			toast.success("Profile saved");
		} catch (err) {
			toast.error(
				err instanceof Error ? err.message : "Failed to save profile",
			);
		}
	}

	async function changePassword(e: React.FormEvent) {
		e.preventDefault();
		try {
			await apiPut("/api/settings", { currentPassword, newPassword });
			setCurrentPassword("");
			setNewPassword("");
			toast.success("Password changed");
		} catch (err) {
			toast.error(err instanceof Error ? err.message : "Error");
		}
	}

	function pickFile(mode: "merge" | "replace") {
		importModeRef.current = mode;
		fileInputRef.current?.click();
	}

	async function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
		const file = e.target.files?.[0];
		e.target.value = ""; // allow re-selecting the same file
		if (!file) return;
		if (importModeRef.current === "replace") {
			setPendingFile(file);
			setConfirmReplace(true);
			return;
		}
		await runImport(file, false);
	}

	async function runImport(file: File, replace: boolean) {
		setImporting(true);
		try {
			const bundle = JSON.parse(await file.text());
			const res = await apiPost<{
				imported: Record<string, number>;
				skipped: number;
			}>(`/api/import${replace ? "?mode=replace" : ""}`, bundle);
			const counts = Object.entries(res.imported)
				.filter(([, n]) => n > 0)
				.map(([k, n]) => `${n} ${k}`)
				.join(", ");
			toast.success(
				`Imported ${counts || "nothing"}${res.skipped ? ` (${res.skipped} skipped)` : ""}`,
			);
		} catch (err) {
			toast.error(err instanceof Error ? err.message : "Import failed");
		} finally {
			setImporting(false);
			setPendingFile(null);
			setConfirmReplace(false);
		}
	}

	return (
		<div className="space-y-4 sm:space-y-6">
			<div className="flex flex-col gap-1">
				<h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
					Settings
				</h1>
				<p className="text-sm text-muted-foreground sm:text-base">
					Manage your account, theme, and security.
				</p>
			</div>

			<div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
				<Card>
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<User className="h-4 w-4" /> Profile
						</CardTitle>
						<CardDescription>Your account details.</CardDescription>
					</CardHeader>
					<CardContent>
						<form onSubmit={saveProfile} className="space-y-4">
							<div className="space-y-2">
								<Label htmlFor="settings-name">Name</Label>
								<Input
									id="settings-name"
									value={name}
									onChange={(e) => setName(e.target.value)}
								/>
							</div>
							<div className="space-y-2">
								<Label htmlFor="settings-email">Email</Label>
								<Input id="settings-email" value={email} disabled />
							</div>
							<div className="space-y-2">
								<Label className="flex items-center gap-2">
									<Palette className="h-3 w-3" /> Theme
								</Label>
								<div className="flex flex-wrap gap-2">
									{(["light", "dark", "system"] as const).map((t) => (
										<Button
											key={t}
											type="button"
											variant={theme === t ? "default" : "outline"}
											onClick={() => {
												setThemeState(t);
												setTheme(t);
											}}
											className="flex-1 sm:flex-none"
										>
											{t.charAt(0).toUpperCase() + t.slice(1)}
										</Button>
									))}
								</div>
							</div>
							<Button type="submit">Save Changes</Button>
						</form>
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<Lock className="h-4 w-4" /> Change Password
						</CardTitle>
						<CardDescription>Update your account password.</CardDescription>
					</CardHeader>
					<CardContent>
						<form onSubmit={changePassword} className="space-y-4">
							<div className="space-y-2">
								<Label htmlFor="settings-current">Current Password</Label>
								<Input
									id="settings-current"
									type="password"
									value={currentPassword}
									onChange={(e) => setCurrentPassword(e.target.value)}
									required
								/>
							</div>
							<div className="space-y-2">
								<Label htmlFor="settings-new">New Password</Label>
								<Input
									id="settings-new"
									type="password"
									value={newPassword}
									onChange={(e) => setNewPassword(e.target.value)}
									required
									minLength={8}
								/>
							</div>
							<Button type="submit">Change Password</Button>
						</form>
					</CardContent>
				</Card>

				<Card className="lg:col-span-2">
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<Database className="h-4 w-4" /> Data
						</CardTitle>
						<CardDescription>
							Export your data as a portable backup, or import it into this or
							another deployment.
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-4">
						<div className="flex flex-wrap gap-2">
							<Button asChild variant="outline">
								<a href="/api/export">
									<Download className="h-4 w-4" /> Export JSON
								</a>
							</Button>
							<Button
								type="button"
								variant="outline"
								onClick={() => pickFile("merge")}
								disabled={importing}
							>
								<Upload className="h-4 w-4" />
								{importing ? "Importing…" : "Import (merge)"}
							</Button>
							<Button
								type="button"
								variant="destructive"
								onClick={() => pickFile("replace")}
								disabled={importing}
							>
								<Upload className="h-4 w-4" /> Import (replace all)
							</Button>
						</div>
						<p className="text-xs text-muted-foreground">
							Merge adds the imported records alongside your existing data.
							Replace deletes all current bookmarks, notes, tasks,
							subscriptions, expenses and tax data first.
						</p>
						<input
							ref={fileInputRef}
							type="file"
							accept="application/json"
							className="hidden"
							onChange={onFileChange}
						/>
					</CardContent>
				</Card>
			</div>

			<Dialog
				open={confirmReplace}
				onOpenChange={(o) => !o && setConfirmReplace(false)}
			>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Replace all data?</DialogTitle>
						<DialogDescription>
							This permanently deletes all your current bookmarks, notes, tasks,
							subscriptions, expenses and tax data, then imports the file. This
							cannot be undone.
						</DialogDescription>
					</DialogHeader>
					<DialogFooter>
						<Button
							variant="outline"
							onClick={() => {
								setConfirmReplace(false);
								setPendingFile(null);
							}}
							disabled={importing}
						>
							Cancel
						</Button>
						<Button
							variant="destructive"
							onClick={() => pendingFile && runImport(pendingFile, true)}
							disabled={importing || !pendingFile}
						>
							{importing ? "Replacing…" : "Replace everything"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}
