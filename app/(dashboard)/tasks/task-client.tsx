"use client";

import { useState } from "react";
import useSWR from "swr";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2, Plus, Check, Circle, Clock } from "lucide-react";
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

const fetcher = (url: string) => fetch(url).then((r) => r.json());

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

export function TaskClient() {
  const { data: tasks, mutate } = useSWR<Task[]>("/api/tasks", fetcher);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<{
    title: string;
    description: string;
    status: Status;
    priority: Priority;
    dueDate: string;
  }>({
    title: "",
    description: "",
    status: "todo",
    priority: "medium",
    dueDate: "",
  });

  async function addTask(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      setForm({ title: "", description: "", status: "todo", priority: "medium", dueDate: "" });
      setShowForm(false);
      mutate();
    }
  }

  async function updateStatus(id: string, status: string) {
    await fetch(`/api/tasks/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    mutate();
  }

  async function deleteTask(id: string) {
    await fetch(`/api/tasks/${id}`, { method: "DELETE" });
    mutate();
  }

  const columns = ["todo", "in_progress", "done"] as const;

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Tasks</h1>
        <p className="text-sm text-muted-foreground sm:text-base">
          Kanban view of your todos, in-progress, and done work.
        </p>
      </div>
      <div className="flex justify-end">
        <Button onClick={() => setShowForm(!showForm)} className="w-full sm:w-auto">
          <Plus className="mr-2 h-4 w-4" /> Add Task
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>New Task</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={addTask} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  required
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
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
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dueDate">Due Date</Label>
                  <Input
                    id="dueDate"
                    type="date"
                    value={form.dueDate}
                    onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
                  />
                </div>
              </div>
              <Button type="submit">Save</Button>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
        {columns.map((col) => {
          const config = statusConfig[col];
          const Icon = config.icon;
          const colTasks = tasks?.filter((t) => t.status === col) ?? [];

          return (
            <div key={col} className="space-y-3">
              <div className="flex items-center gap-2">
                <Icon className={cn("h-4 w-4", config.color)} />
                <h2 className="font-semibold">{config.label}</h2>
                <span className="text-sm text-muted-foreground">({colTasks.length})</span>
              </div>
              <div className="space-y-2">
                {colTasks.map((task) => (
                  <Card key={task.id} className="transition-colors hover:bg-accent/40">
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between">
                        <CardTitle className="text-sm">{task.title}</CardTitle>
                        <Button variant="ghost" size="icon" onClick={() => deleteTask(task.id)} aria-label="Delete">
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </CardHeader>
                    {task.description && (
                      <CardContent className="pt-0 pb-2">
                        <p className="text-xs text-muted-foreground">{task.description}</p>
                      </CardContent>
                    )}
                    <CardContent className="pt-0">
                      <div className="flex items-center justify-between">
                        <span className={cn("rounded-full px-2 py-0.5 text-xs", priorityColors[task.priority])}>
                          {task.priority}
                        </span>
                        <Select
                          value={task.status}
                          onValueChange={(v) => updateStatus(task.id, v)}
                        >
                          <SelectTrigger className="h-7 w-32 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="todo">To Do</SelectItem>
                            <SelectItem value="in_progress">In Progress</SelectItem>
                            <SelectItem value="done">Done</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
