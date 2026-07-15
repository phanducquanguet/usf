"use client";

import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ImageIcon, ImagePlus, Pencil, Plus, Store, Trash2, X } from "lucide-react";
import { Badge } from "@multica/ui/components/ui/badge";
import { Button } from "@multica/ui/components/ui/button";
import { Card, CardContent } from "@multica/ui/components/ui/card";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@multica/ui/components/ui/empty";
import { Input } from "@multica/ui/components/ui/input";
import { Label } from "@multica/ui/components/ui/label";
import { Separator } from "@multica/ui/components/ui/separator";
import { Spinner } from "@multica/ui/components/ui/spinner";
import { Switch } from "@multica/ui/components/ui/switch";
import { Textarea } from "@multica/ui/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@multica/ui/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@multica/ui/components/ui/tabs";
import { Skeleton } from "@multica/ui/components/ui/skeleton";
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
  PortalProjectCopy,
  PortalProjectInput,
} from "@multica/core/types/portal";
import { useT } from "../../i18n";

// Autonyms, never translated — matches the landing's VI|EN switch.
const LOCALE_LABELS = { vi: "Tiếng Việt", en: "English" } as const;

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
  i18n: {},
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
    i18n: p.i18n ?? {},
  };
}

export function PortalProjectsSection() {
  const { t } = useT("settings");
  const wsId = useWorkspaceId();
  const queryClient = useQueryClient();
  const { data: projects = [], isPending } = useQuery(
    portalAdminProjectsOptions(wsId),
  );

  // Dialog state: null = closed, "new" = create, otherwise the project being edited.
  const [editing, setEditing] = useState<PortalAdminProject | "new" | null>(null);
  const [form, setForm] = useState<PortalProjectInput>(EMPTY_INPUT);
  const [deleting, setDeleting] = useState<PortalAdminProject | null>(null);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  // Snapshot of the form as opened, to detect unsaved edits on dismiss.
  const openedForm = useRef("");

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
    openedForm.current = JSON.stringify(EMPTY_INPUT);
    setEditing("new");
  };
  const openEdit = (p: PortalAdminProject) => {
    const input = toInput(p);
    setForm(input);
    openedForm.current = JSON.stringify(input);
    setEditing(p);
  };
  const requestClose = () => {
    if (JSON.stringify(form) !== openedForm.current) setConfirmDiscard(true);
    else setEditing(null);
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

  const setEnField = <K extends keyof PortalProjectCopy>(
    key: K,
    value: PortalProjectCopy[K],
  ) =>
    setForm((f) => ({
      ...f,
      i18n: { ...f.i18n, en: { ...f.i18n?.en, [key]: value } },
    }));
  const enCopy = form.i18n?.en ?? {};

  const publishedCount = projects.filter((p) => p.published).length;

  return (
    <section className="space-y-4">
      <div className="flex items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold">
              {t(($) => $.portal_projects.title)}
            </h2>
            {projects.length > 0 ? (
              <Badge variant="secondary" className="tabular-nums">
                {publishedCount}/{projects.length}
              </Badge>
            ) : null}
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            {t(($) => $.portal_projects.description)}
          </p>
        </div>
        <Button size="sm" onClick={openCreate}>
          <Plus className="size-4 mr-1.5" />
          {t(($) => $.portal_projects.add)}
        </Button>
      </div>

      {isPending ? (
        <Card className="py-0" aria-busy="true">
          <CardContent className="divide-y px-0">
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-3 sm:gap-4">
                <Skeleton className="size-11 rounded-lg" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : projects.length === 0 ? (
        <Empty className="border py-10">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Store />
            </EmptyMedia>
            <EmptyTitle>{t(($) => $.portal_projects.empty_title)}</EmptyTitle>
            <EmptyDescription>{t(($) => $.portal_projects.empty)}</EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button size="sm" variant="outline" onClick={openCreate}>
              <Plus className="size-4 mr-1.5" />
              {t(($) => $.portal_projects.add)}
            </Button>
          </EmptyContent>
        </Empty>
      ) : (
        <Card className="py-0">
          <CardContent className="divide-y px-0">
            {projects.map((p) => (
              <div
                key={p.id}
                className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/40 sm:gap-4"
              >
                <div className="flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-lg border bg-muted">
                  {p.images[0] ? (
                    <img
                      src={p.images[0]}
                      alt=""
                      loading="lazy"
                      className="size-full object-cover"
                    />
                  ) : (
                    <ImageIcon className="size-4 text-muted-foreground" aria-hidden />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-medium">{p.name}</p>
                    {p.published ? (
                      <Badge variant="secondary" className="shrink-0 gap-1.5">
                        <span
                          className="size-1.5 rounded-full bg-success"
                          aria-hidden
                        />
                        {t(($) => $.portal_projects.status_live)}
                      </Badge>
                    ) : (
                      <Badge
                        variant="outline"
                        className="shrink-0 text-muted-foreground"
                      >
                        {t(($) => $.portal_projects.status_draft)}
                      </Badge>
                    )}
                  </div>
                  {p.industry ? (
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                      {p.industry}
                    </p>
                  ) : null}
                </div>
                <Switch
                  checked={p.published}
                  aria-label={t(($) => $.portal_projects.published_aria, {
                    name: p.name,
                  })}
                  onCheckedChange={(published) =>
                    save.mutate({ id: p.id, input: { ...toInput(p), published } })
                  }
                  disabled={save.isPending}
                />
                <div className="flex shrink-0 items-center">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground hover:text-foreground"
                    aria-label={t(($) => $.portal_projects.edit_aria, { name: p.name })}
                    onClick={() => openEdit(p)}
                  >
                    <Pencil className="size-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground hover:text-destructive"
                    aria-label={t(($) => $.portal_projects.delete_aria, { name: p.name })}
                    onClick={() => setDeleting(p)}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Create/edit dialog */}
      <Dialog open={editing != null} onOpenChange={(open) => !open && requestClose()}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>
              {t(($) => (editing === "new" ? $.portal_projects.add : $.portal_projects.edit))}
            </DialogTitle>
            <DialogDescription>
              {t(($) => $.portal_projects.dialog_description)}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-5">
            {/* One tab per marketplace language, mirroring the portal hero
             * editor. Tab labels are autonyms, never translated. Blank
             * English fields fall back to the Vietnamese copy. */}
            <Tabs defaultValue="vi">
              <TabsList>
                {(["vi", "en"] as const).map((locale) => (
                  <TabsTrigger key={locale} value={locale} lang={locale}>
                    {LOCALE_LABELS[locale]}
                  </TabsTrigger>
                ))}
              </TabsList>
              <TabsContent value="vi">
                <fieldset lang="vi" className="space-y-5 pt-3">
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
                    <Label htmlFor="pp-desc">
                      {t(($) => $.portal_projects.description_label)}
                    </Label>
                    <Textarea
                      id="pp-desc"
                      value={form.description}
                      onChange={(e) => setField("description", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="pp-industry">
                      {t(($) => $.portal_projects.industry)}
                    </Label>
                    <Input
                      id="pp-industry"
                      value={form.industry}
                      placeholder={t(($) => $.portal_projects.industry_placeholder)}
                      onChange={(e) => setField("industry", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="pp-features">
                      {t(($) => $.portal_projects.features)}
                    </Label>
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
                </fieldset>
              </TabsContent>
              <TabsContent value="en">
                <fieldset lang="en" className="space-y-5 pt-3">
                  <p id="pp-i18n-hint" className="text-xs text-muted-foreground">
                    {t(($) => $.portal_projects.i18n_hint)}
                  </p>
                  <div className="space-y-2">
                    <Label htmlFor="pp-name-en">
                      {t(($) => $.portal_projects.name)}
                    </Label>
                    <Input
                      id="pp-name-en"
                      aria-describedby="pp-i18n-hint"
                      value={enCopy.name ?? ""}
                      placeholder={form.name}
                      onChange={(e) => setEnField("name", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="pp-desc-en">
                      {t(($) => $.portal_projects.description_label)}
                    </Label>
                    <Textarea
                      id="pp-desc-en"
                      aria-describedby="pp-i18n-hint"
                      value={enCopy.description ?? ""}
                      placeholder={form.description}
                      onChange={(e) => setEnField("description", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="pp-industry-en">
                      {t(($) => $.portal_projects.industry)}
                    </Label>
                    <Input
                      id="pp-industry-en"
                      aria-describedby="pp-i18n-hint"
                      value={enCopy.industry ?? ""}
                      placeholder={form.industry}
                      onChange={(e) => setEnField("industry", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="pp-features-en">
                      {t(($) => $.portal_projects.features)}
                    </Label>
                    <Textarea
                      id="pp-features-en"
                      aria-describedby="pp-i18n-hint"
                      value={(enCopy.features ?? []).join("\n")}
                      placeholder={form.features.join("\n")}
                      onChange={(e) =>
                        setEnField(
                          "features",
                          e.target.value
                            .split("\n")
                            .map((s) => s.trim())
                            .filter(Boolean),
                        )
                      }
                    />
                  </div>
                </fieldset>
              </TabsContent>
            </Tabs>

            <Separator />

            <div className="space-y-2">
              <Label>{t(($) => $.portal_projects.images)}</Label>
              <div className="flex flex-wrap items-center gap-2">
                {form.images.map((url) => (
                  <div key={url} className="relative">
                    <img src={url} alt="" className="size-16 rounded-md border object-cover" />
                    <button
                      type="button"
                      aria-label={t(($) => $.portal_projects.remove_image)}
                      className="absolute -right-1.5 -top-1.5 cursor-pointer rounded-full border bg-background p-1 shadow-sm transition-colors hover:bg-muted after:absolute after:-inset-2"
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
                <button
                  type="button"
                  disabled={uploading}
                  aria-label={t(($) => $.portal_projects.upload_image)}
                  className="flex size-16 cursor-pointer items-center justify-center rounded-md border border-dashed text-muted-foreground transition-colors hover:border-ring hover:text-foreground disabled:cursor-default disabled:opacity-50"
                  onClick={() => fileRef.current?.click()}
                >
                  {uploading ? <Spinner className="size-4" /> : <ImagePlus className="size-4" />}
                </button>
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

            <Separator />

            <div className="space-y-2">
              <Label htmlFor="pp-demo">{t(($) => $.portal_projects.demo_url)}</Label>
              <Input
                id="pp-demo"
                type="url"
                inputMode="url"
                placeholder="https://"
                value={form.demo_url}
                onChange={(e) => setField("demo_url", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pp-portfolio">{t(($) => $.portal_projects.portfolio_url)}</Label>
              <Input
                id="pp-portfolio"
                type="url"
                inputMode="url"
                placeholder="https://"
                value={form.portfolio_url}
                onChange={(e) => setField("portfolio_url", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pp-source">{t(($) => $.portal_projects.source_url)}</Label>
              {/* Not type="url": internal source links are often SSH remotes (git@...). */}
              <Input
                id="pp-source"
                inputMode="url"
                value={form.source_url}
                onChange={(e) => setField("source_url", e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                {t(($) => $.portal_projects.source_url_hint)}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="pp-sort">{t(($) => $.portal_projects.sort_order)}</Label>
              <Input
                id="pp-sort"
                type="number"
                className="w-32"
                value={form.sort_order}
                onChange={(e) => setField("sort_order", Number(e.target.value) || 0)}
              />
            </div>

            <div className="flex items-center justify-between gap-4 rounded-lg border p-3">
              <div className="space-y-0.5">
                <Label htmlFor="pp-published">{t(($) => $.portal_projects.published)}</Label>
                <p className="text-xs text-muted-foreground">
                  {t(($) => $.portal_projects.published_hint)}
                </p>
              </div>
              <Switch
                id="pp-published"
                checked={form.published}
                onCheckedChange={(v) => setField("published", v)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={requestClose}>
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
              variant="destructive"
              disabled={remove.isPending}
              onClick={() => deleting && remove.mutate(deleting.id)}
            >
              {t(($) => $.portal_projects.delete)}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Discard unsaved edits confirm */}
      <AlertDialog open={confirmDiscard} onOpenChange={setConfirmDiscard}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t(($) => $.portal_projects.discard_title)}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t(($) => $.portal_projects.discard_body)}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t(($) => $.portal_projects.cancel)}</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                setConfirmDiscard(false);
                setEditing(null);
              }}
            >
              {t(($) => $.portal_projects.discard_confirm)}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
