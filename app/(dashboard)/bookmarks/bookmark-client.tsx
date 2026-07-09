"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useResource } from "@/lib/hooks/use-resource";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import {
  Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Trash2, ExternalLink, Plus, Bookmark as BookmarkIcon, Search,
} from "lucide-react";

type Bookmark = {
  id: string;
  url: string;
  title: string;
  description?: string;
  category: string;
  createdAt: string;
};

export function BookmarkClient() {
  const { items: bookmarks, create, remove } = useResource<Bookmark>("/api/bookmarks");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ url: "", title: "", category: "general" });
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");

  async function addBookmark(e: React.FormEvent) {
    e.preventDefault();
    try {
      await create(form);
      setForm({ url: "", title: "", category: "general" });
      setShowForm(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add bookmark");
    }
  }

  async function deleteBookmark(id: string) {
    try {
      await remove(id);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete bookmark");
    }
  }

  const categories = Array.from(
    new Set((bookmarks ?? []).map((b) => b.category))
  );

  const filtered = (bookmarks ?? []).filter((b) => {
    if (category !== "all" && b.category !== category) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        b.title.toLowerCase().includes(q) ||
        b.url.toLowerCase().includes(q) ||
        (b.description ?? "").toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Bookmarks</h1>
        <p className="text-sm text-muted-foreground sm:text-base">
          Save and organise links across categories.
        </p>
      </div>

      <Card>
        <CardContent className="flex flex-col gap-3 pt-6 sm:flex-row sm:flex-wrap sm:items-end sm:gap-4">
          <div className="space-y-2 sm:flex-1 sm:min-w-48">
            <Label htmlFor="bm-search">Search</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="bm-search"
                placeholder="Title, URL, or description…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="bm-cat">Category</Label>
            <select
              id="bm-cat"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring sm:h-9 sm:w-48"
            >
              <option value="all">All categories</option>
              {categories.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <Dialog open={showForm} onOpenChange={setShowForm}>
            <DialogTrigger asChild>
              <Button className="sm:w-auto">
                <Plus className="mr-2 h-4 w-4" /> Add Bookmark
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>New Bookmark</DialogTitle>
                <DialogDescription>Save a link to your collection.</DialogDescription>
              </DialogHeader>
              <form onSubmit={addBookmark} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="bm-url">URL</Label>
                  <Input id="bm-url" type="url" required
                    value={form.url}
                    onChange={(e) => setForm({ ...form, url: e.target.value })}
                    placeholder="https://..." />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bm-title">Title</Label>
                  <Input id="bm-title" required
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bm-category">Category</Label>
                  <Input id="bm-category"
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })} />
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
            <BookmarkIcon className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              {bookmarks?.length === 0
                ? "No bookmarks yet. Click Add Bookmark to save your first link."
                : "No bookmarks match your filters."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((bm) => (
            <Card key={bm.id} className="flex flex-col transition-colors hover:bg-accent/40">
              <CardHeader className="flex flex-row items-start justify-between space-y-0">
                <div className="min-w-0 flex-1">
                  <CardTitle className="truncate text-base">{bm.title}</CardTitle>
                  <CardDescription className="truncate">{bm.url}</CardDescription>
                </div>
                <div className="flex shrink-0 gap-1">
                  <a href={bm.url} target="_blank" rel="noopener noreferrer">
                    <Button variant="ghost" size="icon" aria-label="Open">
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </a>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => deleteBookmark(bm.id)}
                    aria-label="Delete"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              {bm.description && (
                <CardContent className="pt-0">
                  <p className="line-clamp-2 text-sm text-muted-foreground">
                    {bm.description}
                  </p>
                </CardContent>
              )}
              <CardContent className="mt-auto pt-0">
                <span className="inline-block rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                  {bm.category}
                </span>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}