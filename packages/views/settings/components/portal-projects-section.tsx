"use client";

import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Pencil, Plus, Trash2, Upload, X } from "lucide-react";
import { Button } from "@multica/ui/components/ui/button";
import { Card, CardContent } from "@multica/ui/components/ui/card";
import { Input } from "@multica/ui/components/ui/input";
import { Label } from "@multica/ui/components/ui/label";
import { Switch } from "@multica/ui/components/ui/switch";
import { Textarea } from "@multica/ui/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@multica/ui/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@multica/ui/components/ui/alert-dialog";
import { api } from "@multica/core/api";
import { useWorkspaceId } from "@multica/core/hooks";
import {
  portalAdminProjectsOptions,
  portalProjectKeys,
} from "@multica/core/workspace/queries";
import type {
  PortalAdminProject,
  PortalProjectInput,
} from "@multica/core/types/portal";
import { useT } from "../../i18n";

const EMPTY_INPUT: PortalProjectInput = {
  name: "",
  description: "",
  industry: "",
  features: [],
  images: [],
  demo_url: "",
  portfolio_url: "",
  source_url: "",
  published: false,
  sort_order: 0,
};

function toInput(p: PortalAdminProject): PortalProjectInput {
  return {
    name: p.name,
    description: p.description,
    industry: p.industry,
    features: p.features,
    images: p.images,
    demo_url: p.demo_url,
    portfolio_url: p.portfolio_url,
    source_url: p.source_url,
    published: p.published,
    sort_order: p.sort_order,
  };
}

export function PortalProjectsSection() {
  const { t } = useT("settings");
  const wsId = useWorkspaceId();
  const queryClient = useQueryClient();
  const { data: projects = [] } = useQuery(portalAdminProjectsOptions(wsId));

  // Dialog state: null = closed, "new" = create, otherwise the project being edited.
  const [editing, setEditing] = useState<PortalAdminProject | "new" | null>(null);
  const [form, setForm] = useState<PortalProjectInput>(EMPTY_INPUT);
  const [deleting, setDeleting] = useState<PortalAdminProject | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: portalProjectKeys.admin(wsId) });

  const save = useMutation({
    mutationFn: ({ id, input }: { id?: string; input: PortalProjectInput }) =>
      id ? api.updatePortalProject(id, input) : api.createPortalProject(input),
    onSuccess: () => {
      invalidate();
      setEditing(null);
      toast.success(t(($) => $.portal_projects.toast_saved));
    },
    onError: () => toast.error(t(($) => $.portal_projects.toast_failed)),
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.deletePortalProject(id),
    onSuccess: () => {
      invalidate();
      setDeleting(null);
      toast.success(t(($) => $.portal_projects.toast_deleted));
    },
    onError: () => toast.error(t(($) => $.portal_projects.toast_failed)),
  });

  const openCreate = () => {
    setForm(EMPTY_INPUT);
    setEditing("new");
  };
  const openEdit = (p: PortalAdminProject) => {
    setForm(toInput(p));
    setEditing(p);
  };

  const uploadImage = async (file: File) => {
    setUploading(true);
    try {
      const attachment = await api.uploadFile(file);
      if (attachment.url) {
        setForm((f) => ({ ...f, images: [...f.images, attachment.url] }));
      }
    } catch {
      toast.error(t(($) => $.portal_projects.toast_failed));
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const setField = <K extends keyof PortalProjectInput>(
    key: K,
    value: PortalProjectInput[K],
  ) => setForm((f) => ({ ...f, [key]: value }));

  return (
    <section className="space-y-4">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h2 className="text-sm font-semibold">{t(($) => $.portal_projects.title)}</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {t(($) => $.portal_projects.description)}
          </p>
        </div>
        <Button size="sm" onClick={openCreate}>
          <Plus className="size-4 mr-1.5" />
          {t(($) => $.portal_projects.add)}
        </Button>
      </div>

      <Card>
        <CardContent className="divide-y">
          {projects.length === 0 ? (
            <p className="py-6 text-sm text-muted-foreground">
              {t(($) => $.portal_projects.empty)}
            </p>
          ) : (
            projects.map((p) => (
              <div key={p.id} className="flex items-center gap-4 py-3 first:pt-0 last:pb-0">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{p.name}</p>
                  {p.industry ? (
                    <p className="text-xs text-muted-foreground">{p.industry}</p>
                  ) : null}
                </div>
                <Switch
                  checked={p.published}
                  aria-label={t(($) => $.portal_projects.published)}
                  onCheckedChange={(published) =>
                    save.mutate({ id: p.id, input: { ...toInput(p), published } })
                  }
                  disabled={save.isPending}
                />
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={t(($) => $.portal_projects.edit)}
                  onClick={() => openEdit(p)}
                >
                  <Pencil className="size-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={t(($) => $.portal_projects.delete)}
                  onClick={() => setDeleting(p)}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Create/edit dialog */}
      <Dialog open={editing != null} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {t(($) => (editing === "new" ? $.portal_projects.add : $.portal_projects.edit))}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="pp-name">{t(($) => $.portal_projects.name)}</Label>
              <Input
                id="pp-name"
                value={form.name}
                placeholder={t(($) => $.portal_projects.name_placeholder)}
                onChange={(e) => setField("name", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pp-desc">{t(($) => $.portal_projects.description_label)}</Label>
              <Textarea
                id="pp-desc"
                value={form.description}
                onChange={(e) => setField("description", e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="pp-industry">{t(($) => $.portal_projects.industry)}</Label>
                <Input
                  id="pp-industry"
                  value={form.industry}
                  placeholder={t(($) => $.portal_projects.industry_placeholder)}
                  onChange={(e) => setField("industry", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pp-sort">{t(($) => $.portal_projects.sort_order)}</Label>
                <Input
                  id="pp-sort"
                  type="number"
                  value={form.sort_order}
                  onChange={(e) => setField("sort_order", Number(e.target.value) || 0)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="pp-features">{t(($) => $.portal_projects.features)}</Label>
              <Textarea
                id="pp-features"
                value={form.features.join("\n")}
                onChange={(e) =>
                  setField(
                    "features",
                    e.target.value
                      .split("\n")
                      .map((s) => s.trim())
                      .filter(Boolean),
                  )
                }
              />
            </div>
            <div className="space-y-2">
              <Label>{t(($) => $.portal_projects.images)}</Label>
              <div className="flex flex-wrap items-center gap-2">
                {form.images.map((url) => (
                  <div key={url} className="relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={url} alt="" className="size-16 rounded-md border object-cover" />
                    <button
                      type="button"
                      aria-label={t(($) => $.portal_projects.remove_image)}
                      className="absolute -right-1.5 -top-1.5 rounded-full border bg-background p-0.5"
                      onClick={() =>
                        setField(
                          "images",
                          form.images.filter((u) => u !== url),
                        )
                      }
                    >
                      <X className="size-3" />
                    </button>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={uploading}
                  onClick={() => fileRef.current?.click()}
                >
                  <Upload className="size-4 mr-1.5" />
                  {t(($) => $.portal_projects.upload_image)}
                </Button>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void uploadImage(file);
                  }}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="pp-demo">{t(($) => $.portal_projects.demo_url)}</Label>
              <Input
                id="pp-demo"
                value={form.demo_url}
                onChange={(e) => setField("demo_url", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pp-portfolio">{t(($) => $.portal_projects.portfolio_url)}</Label>
              <Input
                id="pp-portfolio"
                value={form.portfolio_url}
                onChange={(e) => setField("portfolio_url", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pp-source">{t(($) => $.portal_projects.source_url)}</Label>
              <Input
                id="pp-source"
                value={form.source_url}
                onChange={(e) => setField("source_url", e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                {t(($) => $.portal_projects.source_url_hint)}
              </p>
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="pp-published">{t(($) => $.portal_projects.published)}</Label>
              <Switch
                id="pp-published"
                checked={form.published}
                onCheckedChange={(v) => setField("published", v)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>
              {t(($) => $.portal_projects.cancel)}
            </Button>
            <Button
              disabled={save.isPending || !form.name.trim()}
              onClick={() =>
                save.mutate({
                  id: editing === "new" || editing == null ? undefined : editing.id,
                  input: form,
                })
              }
            >
              {t(($) => (save.isPending ? $.portal_projects.saving : $.portal_projects.save))}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog open={deleting != null} onOpenChange={(open) => !open && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t(($) => $.portal_projects.delete_confirm_title)}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t(($) => $.portal_projects.delete_confirm_body, { name: deleting?.name ?? "" })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t(($) => $.portal_projects.cancel)}</AlertDialogCancel>
            <AlertDialogAction
              disabled={remove.isPending}
              onClick={() => deleting && remove.mutate(deleting.id)}
            >
              {t(($) => $.portal_projects.delete)}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
