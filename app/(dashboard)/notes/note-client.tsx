"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useAllTags } from "@/lib/hooks/use-all-tags";
import { useResource } from "@/lib/hooks/use-resource";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TagInput } from "@/components/ui/tag-input";
import { Textarea } from "@/components/ui/textarea";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import {
  Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Trash2, Pin, Plus, StickyNote, Search } from "lucide-react";

type Note = {
  id: string;
  title: string;
  content: string;
  tags: string[];
  pinned: boolean;
  updatedAt: string;
};

export function NoteClient() {
  const { items: notes, create, update, remove } = useResource<Note>("/api/notes", {
    updateMethod: "PUT",
  });
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ title: "", content: "", tags: [] as string[], pinned: false });
  const [search, setSearch] = useState("");
  const tagSuggestions = useAllTags();

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

  async function saveNote(e: React.FormEvent) {
    e.preventDefault();
    try {
      if (editingId) await update(editingId, form);
      else await create(form);
      setShowForm(false);
      setEditingId(null);
      setForm({ title: "", content: "", tags: [], pinned: false });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save note");
    }
  }

  async function deleteNote(id: string) {
    try {
      await remove(id);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete note");
    }
  }

  async function togglePin(note: Note) {
    try {
      await update(note.id, {
        title: note.title,
        content: note.content,
        tags: note.tags,
        pinned: !note.pinned,
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update note");
    }
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
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Notes</h1>
        <p className="text-sm text-muted-foreground sm:text-base">Jot down ideas, snippets, and todos.</p>
      </div>

      <Card>
        <CardContent className="flex flex-col gap-3 pt-6 sm:flex-row sm:flex-wrap sm:items-end sm:gap-4">
          <div className="space-y-2 sm:flex-1 sm:min-w-48">
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
              <Button onClick={startNew} className="sm:w-auto">
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
                  <TagInput
                    value={form.tags}
                    onChange={(tags) => setForm({ ...form, tags })}
                    suggestions={tagSuggestions}
                    placeholder="Add tag…"
                  />
                </div>
                <DialogFooter>
                  <DialogClose asChild>
                    <Button type="button" variant="outline">
                      Cancel
                    </Button>
                  </DialogClose>
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