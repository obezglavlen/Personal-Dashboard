"use client";

import { useState } from "react";
import useSWR from "swr";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Trash2, Pin, Plus, X, StickyNote, Search } from "lucide-react";

type Note = {
  id: string;
  title: string;
  content: string;
  tags: string[];
  pinned: boolean;
  updatedAt: string;
};

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function NoteClient() {
  const { data: notes, mutate } = useSWR<Note[]>("/api/notes", fetcher);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ title: "", content: "", tags: [] as string[], pinned: false });
  const [tagInput, setTagInput] = useState("");
  const [search, setSearch] = useState("");

  function startNew() {
    setEditingId(null);
    setForm({ title: "", content: "", tags: [], pinned: false });
    setShowForm(true);
  }

  function startEdit(note: Note) {
    setEditingId(note.id);
    setForm({ title: note.title, content: note.content, tags: note.tags, pinned: note.pinned });
    setShowForm(true);
  }

  function addTag() {
    if (tagInput.trim() && !form.tags.includes(tagInput.trim())) {
      setForm({ ...form, tags: [...form.tags, tagInput.trim()] });
      setTagInput("");
    }
  }

  function removeTag(tag: string) {
    setForm({ ...form, tags: form.tags.filter((t) => t !== tag) });
  }

  async function saveNote(e: React.FormEvent) {
    e.preventDefault();
    const url = editingId ? `/api/notes/${editingId}` : "/api/notes";
    const method = editingId ? "PUT" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    if (res.ok) {
      setShowForm(false);
      setEditingId(null);
      setForm({ title: "", content: "", tags: [], pinned: false });
      mutate();
    }
  }

  async function deleteNote(id: string) {
    await fetch(`/api/notes/${id}`, { method: "DELETE" });
    mutate();
  }

  async function togglePin(note: Note) {
    await fetch(`/api/notes/${note.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: note.title,
        content: note.content,
        tags: note.tags,
        pinned: !note.pinned,
      }),
    });
    mutate();
  }

  const filtered = (notes ?? []).filter((n) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      n.title.toLowerCase().includes(q) ||
      n.content.toLowerCase().includes(q) ||
      n.tags.some((t) => t.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold tracking-tight">Notes</h1>
        <p className="text-muted-foreground">Jot down ideas, snippets, and todos.</p>
      </div>

      <Card>
        <CardContent className="flex flex-wrap items-end gap-4 pt-6">
          <div className="space-y-2 flex-1 min-w-48">
            <Label htmlFor="note-search">Search</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="note-search"
                placeholder="Title, content, or tag…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
          <Dialog open={showForm} onOpenChange={setShowForm}>
            <DialogTrigger asChild>
              <Button onClick={startNew}>
                <Plus className="mr-2 h-4 w-4" /> New Note
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingId ? "Edit Note" : "New Note"}</DialogTitle>
                <DialogDescription>
                  {editingId ? "Update this note." : "Capture a thought."}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={saveNote} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="note-title">Title</Label>
                  <Input id="note-title" required
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="note-content">Content</Label>
                  <Textarea id="note-content" rows={6}
                    value={form.content}
                    onChange={(e) => setForm({ ...form, content: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Tags</Label>
                  <div className="flex gap-2">
                    <Input
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          addTag();
                        }
                      }}
                      placeholder="Add tag..."
                    />
                    <Button type="button" onClick={addTag} variant="secondary">Add</Button>
                  </div>
                  {form.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {form.tags.map((tag) => (
                        <span
                          key={tag}
                          className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground"
                        >
                          {tag}
                          <button type="button" onClick={() => removeTag(tag)} aria-label={`Remove ${tag}`}>
                            <X className="h-3 w-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <DialogFooter className="gap-2 sm:gap-2">
                  <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">Save</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center gap-2 py-12 text-center">
            <StickyNote className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              {notes?.length === 0
                ? "No notes yet. Click New Note to create your first one."
                : "No notes match your search."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((note) => (
            <Card
              key={note.id}
              className="flex cursor-pointer flex-col transition-colors hover:bg-accent/40"
              onClick={() => startEdit(note)}
            >
              <CardHeader className="flex flex-row items-start justify-between space-y-0">
                <div className="min-w-0 flex-1">
                  <CardTitle className="truncate text-base">{note.title}</CardTitle>
                  <CardDescription>
                    Updated {new Date(note.updatedAt).toLocaleDateString()}
                  </CardDescription>
                </div>
                <div className="flex shrink-0 gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => { e.stopPropagation(); togglePin(note); }}
                    aria-label={note.pinned ? "Unpin" : "Pin"}
                  >
                    <Pin className={`h-4 w-4 ${note.pinned ? "fill-current text-foreground" : ""}`} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => { e.stopPropagation(); deleteNote(note.id); }}
                    aria-label="Delete"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="flex-1 pt-0">
                <p className="line-clamp-3 text-sm text-muted-foreground">{note.content}</p>
              </CardContent>
              {note.tags.length > 0 && (
                <CardContent className="mt-auto pt-0">
                  <div className="flex flex-wrap gap-1">
                    {note.tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}