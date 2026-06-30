"use client";

import { Bell, Database, Download, Lock, Upload, User } from "lucide-react";
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
	telegramChatId: string | null;
	notifyRenewals: boolean;
	notifyBudgets: boolean;
	notifyTasks: boolean;
};

export function SettingsClient() {
	const [name, setName] = useState("");
	const [email, setEmail] = useState("");
	const [currentPassword, setCurrentPassword] = useState("");
	const [newPassword, setNewPassword] = useState("");
	const [telegramChatId, setTelegramChatId] = useState("");
	const [notifyRenewals, setNotifyRenewals] = useState(true);
	const [notifyBudgets, setNotifyBudgets] = useState(true);
	const [notifyTasks, setNotifyTasks] = useState(true);
	const [savingNotif, setSavingNotif] = useState(false);
	const [testingNotif, setTestingNotif] = useState(false);
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
				setTelegramChatId(data.telegramChatId || "");
				setNotifyRenewals(data.notifyRenewals);
				setNotifyBudgets(data.notifyBudgets);
				setNotifyTasks(data.notifyTasks);
			})
			.catch(() => toast.error("Failed to load settings"));
	}, []);

	async function saveProfile(e: React.FormEvent) {
		e.preventDefault();
		try {
			await apiPut("/api/settings", { name });
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

	async function saveNotifications(e: React.FormEvent) {
		e.preventDefault();
		setSavingNotif(true);
		try {
			await apiPut("/api/settings", {
				telegramChatId: telegramChatId.trim() || null,
				notifyRenewals,
				notifyBudgets,
				notifyTasks,
			});
			toast.success("Notification settings saved");
		} catch (err) {
			toast.error(
				err instanceof Error ? err.message : "Failed to save notifications",
			);
		} finally {
			setSavingNotif(false);
		}
	}

	async function sendTest() {
		setTestingNotif(true);
		try {
			await apiPost("/api/notify/test", {});
			toast.success("Test message sent — check Telegram");
		} catch (err) {
			toast.error(err instanceof Error ? err.message : "Failed to send test");
		} finally {
			setTestingNotif(false);
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
					Manage your account and security.
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

				<Card className="lg:col-span-2">
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<Bell className="h-4 w-4" /> Notifications
						</CardTitle>
						<CardDescription>
							Get a daily Telegram digest of upcoming renewals, budgets near or
							over cap, and overdue tasks.
						</CardDescription>
					</CardHeader>
					<CardContent>
						<form onSubmit={saveNotifications} className="space-y-4">
							<div className="space-y-2">
								<Label htmlFor="settings-telegram">Telegram chat ID</Label>
								<Input
									id="settings-telegram"
									inputMode="numeric"
									placeholder="e.g. 123456789"
									value={telegramChatId}
									onChange={(e) => setTelegramChatId(e.target.value)}
								/>
								<p className="text-xs text-muted-foreground">
									Message your bot once, then get your numeric ID from{" "}
									<a
										href="https://t.me/userinfobot"
										target="_blank"
										rel="noreferrer"
										className="underline"
									>
										@userinfobot
									</a>
									. Leave empty to turn notifications off.
								</p>
							</div>
							<fieldset className="space-y-2">
								<legend className="text-sm font-medium">Include</legend>
								{[
									{
										id: "notify-renewals",
										label: "Subscription renewals due soon",
										checked: notifyRenewals,
										set: setNotifyRenewals,
									},
									{
										id: "notify-budgets",
										label: "Budgets near or over cap",
										checked: notifyBudgets,
										set: setNotifyBudgets,
									},
									{
										id: "notify-tasks",
										label: "Overdue and due-today tasks",
										checked: notifyTasks,
										set: setNotifyTasks,
									},
								].map((row) => (
									<label
										key={row.id}
										htmlFor={row.id}
										className="flex items-center gap-2 text-sm"
									>
										<input
											id={row.id}
											type="checkbox"
											className="h-4 w-4 rounded border-input accent-primary"
											checked={row.checked}
											onChange={(e) => row.set(e.target.checked)}
										/>
										{row.label}
									</label>
								))}
							</fieldset>
							<div className="flex flex-wrap gap-2">
								<Button type="submit" disabled={savingNotif}>
									{savingNotif ? "Saving…" : "Save"}
								</Button>
								<Button
									type="button"
									variant="outline"
									onClick={sendTest}
									disabled={testingNotif}
								>
									{testingNotif ? "Sending…" : "Send test message"}
								</Button>
							</div>
						</form>
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
