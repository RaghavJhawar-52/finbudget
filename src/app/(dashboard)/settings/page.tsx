"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";
import type { Category } from "@/types";
import { CATEGORY_COLORS } from "@/lib/utils";
import { Plus, Pencil, Trash2, Save, Palette } from "lucide-react";

// ---- Category form (inline) ----
function CategoryForm({ cat, onSuccess, onCancel }: { cat?: Category | null; onSuccess: () => void; onCancel: () => void }) {
  const [form, setForm] = useState({
    name: cat?.name ?? "",
    icon: cat?.icon ?? "tag",
    color: cat?.color ?? "#6366f1",
    keywords: (cat?.keywords ?? []).join(", "),
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const url    = cat ? `/api/categories/${cat.id}` : "/api/categories";
    const method = cat ? "PUT" : "POST";
    await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        keywords: form.keywords.split(",").map((k) => k.trim()).filter(Boolean),
      }),
    });
    setLoading(false);
    onSuccess();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name</label>
        <input className="input-base" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Color</label>
        <div className="flex gap-2 flex-wrap">
          {CATEGORY_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setForm({ ...form, color: c })}
              className={`w-7 h-7 rounded-full transition-all ${form.color === c ? "ring-2 ring-offset-2 ring-gray-400 scale-110" : ""}`}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Keywords <span className="text-gray-400 font-normal">(comma separated, for auto-categorization)</span>
        </label>
        <input
          className="input-base"
          placeholder="zomato, swiggy, restaurant"
          value={form.keywords}
          onChange={(e) => setForm({ ...form, keywords: e.target.value })}
        />
      </div>
      <div className="flex gap-3 pt-2">
        <Button type="button" variant="secondary" className="flex-1" onClick={onCancel}>Cancel</Button>
        <Button type="submit" loading={loading} className="flex-1">{cat ? "Update" : "Create"}</Button>
      </div>
    </form>
  );
}

// ---- Main settings page ----
export default function SettingsPage() {
  const { data: session, update: updateSession } = useSession();
  const [categories, setCategories] = useState<Category[]>([]);
  const [showCatForm, setShowCatForm] = useState(false);
  const [editingCat, setEditingCat] = useState<Category | null>(null);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);
  const [profileError, setProfileError] = useState("");
  const [profileName, setProfileName] = useState(session?.user?.name ?? "");

  useEffect(() => {
    fetch("/api/categories")
      .then((r) => r.json())
      .then(setCategories);
  }, []);

  useEffect(() => {
    setProfileName(session?.user?.name ?? "");
  }, [session]);

  const handleDeleteCat = async (id: string) => {
    if (!confirm("Delete this category? Transactions in this category will become uncategorized.")) return;
    await fetch(`/api/categories/${id}`, { method: "DELETE" });
    setCategories((prev) => prev.filter((c) => c.id !== id));
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Settings</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">Manage your account and preferences</p>
      </div>

      {/* Profile */}
      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
        </CardHeader>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
            <input className="input-base opacity-60" value={session?.user?.email ?? ""} readOnly />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name</label>
            <input
              className="input-base"
              value={profileName}
              onChange={(e) => setProfileName(e.target.value)}
            />
          </div>
          {profileError && (
            <p className="text-sm text-red-500">{profileError}</p>
          )}
          <Button
            size="sm"
            loading={profileSaving}
            onClick={async () => {
              setProfileSaving(true);
              setProfileError("");
              try {
                const res = await fetch("/api/profile", {
                  method: "PATCH",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ name: profileName }),
                });
                if (!res.ok) throw new Error("Failed to save");
                // Refresh the JWT so the new name shows in the session
                await updateSession({ name: profileName });
                setProfileSaved(true);
                setTimeout(() => setProfileSaved(false), 2500);
              } catch {
                setProfileError("Could not save changes. Please try again.");
              } finally {
                setProfileSaving(false);
              }
            }}
          >
            <Save className="w-4 h-4" />
            {profileSaved ? "Saved!" : "Save Changes"}
          </Button>
        </div>
      </Card>

      {/* Categories */}
      <Card>
        <CardHeader>
          <CardTitle>Categories</CardTitle>
          <Button size="sm" onClick={() => { setEditingCat(null); setShowCatForm(true); }}>
            <Plus className="w-4 h-4" /> Add Category
          </Button>
        </CardHeader>
        <div className="space-y-2">
          {categories.map((cat) => (
            <div
              key={cat.id}
              className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800/50 group transition-colors"
            >
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: cat.color + "25" }}
              >
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.color }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-white">{cat.name}</p>
                {cat.keywords.length > 0 && (
                  <p className="text-xs text-gray-400 truncate">{cat.keywords.slice(0, 5).join(", ")}</p>
                )}
              </div>
              {cat.isDefault && (
                <span className="text-xs text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full">default</span>
              )}
              <div className="hidden group-hover:flex gap-1">
                <button
                  onClick={() => { setEditingCat(cat); setShowCatForm(true); }}
                  className="p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-400"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleDeleteCat(cat.id)}
                  className="p-1.5 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 text-gray-400 hover:text-red-600"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* About */}
      <Card>
        <CardHeader><CardTitle>About</CardTitle></CardHeader>
        <div className="text-sm text-gray-500 dark:text-gray-400 space-y-1">
          <p>FinBudget v1.0.0 — Personal Finance Tracker</p>
          <p>Built with Next.js 14 · Prisma · Tailwind CSS · Recharts</p>
        </div>
      </Card>

      <Modal
        open={showCatForm}
        onClose={() => { setShowCatForm(false); setEditingCat(null); }}
        title={editingCat ? "Edit Category" : "New Category"}
      >
        <CategoryForm
          cat={editingCat}
          onSuccess={() => {
            setShowCatForm(false);
            setEditingCat(null);
            fetch("/api/categories").then((r) => r.json()).then(setCategories);
          }}
          onCancel={() => { setShowCatForm(false); setEditingCat(null); }}
        />
      </Modal>
    </div>
  );
}
