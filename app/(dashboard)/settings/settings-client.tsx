"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import { User, Lock, Palette } from "lucide-react";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import { apiGet, apiPut } from "@/lib/api-client";

type SettingsData = { name: string | null; email: string | null; theme: string };

export function SettingsClient() {
  const { setTheme } = useTheme();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [theme, setThemeState] = useState("system");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");

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
      toast.error(err instanceof Error ? err.message : "Failed to save profile");
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

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Settings</h1>
        <p className="text-sm text-muted-foreground sm:text-base">Manage your account, theme, and security.</p>
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
                      onClick={() => { setThemeState(t); setTheme(t); }}
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
      </div>
    </div>
  );
}