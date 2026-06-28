"use client";

import { useState } from "react";
import useSWR from "swr";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trash2, ExternalLink, Plus } from "lucide-react";

type Bookmark = {
  id: string;
  url: string;
  title: string;
  description?: string;
  category: string;
  createdAt: string;
};

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function BookmarkClient() {
  const { data: bookmarks, mutate } = useSWR<Bookmark[]>("/api/bookmarks", fetcher);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ url: "", title: "", category: "general" });

  async function addBookmark(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/bookmarks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      setForm({ url: "", title: "", category: "general" });
      setShowForm(false);
      mutate();
    }
  }

  async function deleteBookmark(id: string) {
    await fetch(`/api/bookmarks/${id}`, { method: "DELETE" });
    mutate();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Bookmarks</h1>
        <Button onClick={() => setShowForm(!showForm)}>
          <Plus className="mr-2 h-4 w-4" />
          Add
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>New Bookmark</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={addBookmark} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="url">URL</Label>
                <Input
                  id="url"
                  type="url"
                  required
                  value={form.url}
                  onChange={(e) => setForm({ ...form, url: e.target.value })}
                  placeholder="https://..."
                />
              </div>
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
                <Label htmlFor="category">Category</Label>
                <Input
                  id="category"
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                />
              </div>
              <Button type="submit">Save</Button>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {bookmarks?.map((bm) => (
          <Card key={bm.id}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <CardTitle className="text-base">{bm.title}</CardTitle>
                <div className="flex gap-1">
                  <a href={bm.url} target="_blank" rel="noopener noreferrer">
                    <Button variant="ghost" size="icon">
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </a>
                  <Button variant="ghost" size="icon" onClick={() => deleteBookmark(bm.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="truncate text-sm text-muted-foreground">{bm.url}</p>
              <span className="mt-2 inline-block rounded-full bg-muted px-2 py-0.5 text-xs">
                {bm.category}
              </span>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
