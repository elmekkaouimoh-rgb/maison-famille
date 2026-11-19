import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Camera, Heart, ImagePlus, Plus, Trash2, Video } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { membersQuery, useMe } from "@/hooks/use-me";
import { Avatar } from "@/components/family/AppShell";
import { fmtDate } from "@/lib/family";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/souvenirs")({
  head: () => ({ meta: [{ title: "Souvenirs — EL MEKKAOUI" }, { name: "description", content: "Le coffre-fort des photos, vidéos et moments de la famille." }] }),
  component: MemoriesPage,
});

const FILTERS = [
  { key: "tous", label: "Tous" },
  { key: "photo", label: "📷 Photos" },
  { key: "video", label: "🎬 Vidéos" },
  { key: "moment", label: "✨ Moments" },
  { key: "fav", label: "❤️ Favoris" },
];

function MemoriesPage() {
  const { data: me } = useMe();
  const qc = useQueryClient();
  const { data: members = [] } = useQuery(membersQuery);
  const byId = Object.fromEntries(members.map((m) => [m.id, m]));
  const [filter, setFilter] = useState("tous");
  const [view, setView] = useState<string>();
  const { data: mems = [] } = useQuery({
    queryKey: ["memories"],
    queryFn: async () => {
      const { data } = await supabase.from("memories").select("*").order("day", { ascending: false });
      const list = data ?? [];
      const paths = list.map((m) => m.file_path).filter((p): p is string => !!p);
      const urls: Record<string, string> = {};
      if (paths.length) {
        const { data: signed } = await supabase.storage.from("memories").createSignedUrls(paths, 3600);
        signed?.forEach((s) => { if (s.path && s.signedUrl) urls[s.path] = s.signedUrl; });
      }
      return list.map((m) => ({ ...m, url: m.file_path ? urls[m.file_path] : undefined }));
    },
  });
  const shown = mems.filter((m) => filter === "tous" || (filter === "fav" ? m.favorite : m.kind === filter));
  const cur = mems.find((m) => m.id === view);
  const refresh = () => qc.invalidateQueries({ queryKey: ["memories"] });

  return (
    <div className="stagger mx-auto max-w-6xl space-y-6">
      <section className="relative overflow-hidden rounded-[2rem] bg-gradient-to-b from-primary/40 via-primary/10 to-card p-6 shadow-soft">
        <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-end">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-muted-foreground">Coffre-fort familial</p>
            <h1 className="text-3xl font-extrabold sm:text-4xl">Nos <span className="text-accent">souvenirs</span> 💛</h1>
            <p className="mt-1 text-sm font-semibold text-muted-foreground">{mems.length} moment(s) précieux gardés ensemble</p>
          </div>
          {me?.member && <AddMemory members={members} me={me.member.id} isManager={!!me.isManager} onDone={refresh} />}
        </div>
        <div aria-hidden className="pointer-events-none absolute -right-6 -top-4 flex gap-2 opacity-90">
          {mems.filter((m) => m.url && m.kind === "photo").slice(0, 3).map((m, i) => <img key={m.id} src={m.url} alt="" className="size-20 rounded-2xl border-4 border-card object-cover shadow-soft sm:size-24" style={{ transform: `rotate(${[-8, 6, -3][i]}deg)` }} />)}
        </div>
      </section>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {FILTERS.map((f) => <button key={f.key} onClick={() => setFilter(f.key)} className={cn("shrink-0 rounded-full px-4 py-1.5 text-sm font-bold transition", filter === f.key ? "bg-primary text-primary-foreground" : "card-modern")}>{f.label}</button>)}
      </div>
      {!shown.length && <div className="card-modern p-10 text-center text-muted-foreground"><div className="text-5xl">🖼️</div>Aucun souvenir ici pour l'instant.</div>}
      <div className="stagger columns-2 gap-4 sm:columns-3 lg:columns-4 [&>*]:mb-4">
        {shown.map((m) => (
          <button key={m.id} onClick={() => setView(m.id)} className="card-modern card-hover group block w-full break-inside-avoid overflow-hidden text-left">
            {m.url && m.kind === "photo" && <img src={m.url} alt={m.title} loading="lazy" className="w-full object-cover transition duration-500 group-hover:scale-105" />}
            {m.url && m.kind === "video" && <video src={m.url} muted playsInline className="w-full" />}
            {!m.url && <div className="bg-hero flex aspect-square items-center justify-center text-5xl">✨</div>}
            <div className="p-3">
              <div className="flex items-center gap-1 font-bold">{m.favorite && <Heart className="size-4 fill-accent text-accent" />}<span className="truncate">{m.title}</span></div>
              <div className="mt-1 flex items-center justify-between"><span className="text-xs text-muted-foreground">{fmtDate(m.day)}</span><span className="flex -space-x-1.5">{m.member_ids.slice(0, 4).map((id) => <Avatar key={id} m={byId[id]} size={20} />)}</span></div>
            </div>
          </button>
        ))}
      </div>

      <Dialog open={!!cur} onOpenChange={(o) => !o && setView(undefined)}>
        <DialogContent className="max-w-3xl">
          {cur && <>
            <DialogHeader><DialogTitle>{cur.title}</DialogTitle></DialogHeader>
            {cur.url && cur.kind === "photo" && <img src={cur.url} alt={cur.title} className="max-h-[65vh] w-full rounded-2xl object-contain" />}
            {cur.url && cur.kind === "video" && <video src={cur.url} controls className="max-h-[65vh] w-full rounded-2xl" />}
            <p className="text-sm font-semibold text-muted-foreground">{fmtDate(cur.day)}</p>
            {cur.description && <p className="whitespace-pre-wrap">{cur.description}</p>}
            {me?.isManager && (
              <div className="flex gap-2">
                <Button variant="secondary" onClick={async () => { await supabase.from("memories").update({ favorite: !cur.favorite }).eq("id", cur.id); refresh(); }}><Heart className={cn(cur.favorite && "fill-accent text-accent")} /> {cur.favorite ? "Retirer des favoris" : "Favori"}</Button>
                <Button variant="destructive" onClick={async () => {
                  if (!confirm("Supprimer ce souvenir ?")) return;
                  if (cur.file_path) await supabase.storage.from("memories").remove([cur.file_path]);
                  await supabase.from("memories").delete().eq("id", cur.id);
                  setView(undefined); refresh();
                }}><Trash2 /> Supprimer</Button>
              </div>
            )}
          </>}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function AddMemory({ members, me, isManager, onDone }: { members: { id: string; first_name: string; avatar: string; color: string; photo_url?: string | undefined }[]; me: string; isManager: boolean; onDone: () => void }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string>();
  const [f, setF] = useState({ title: "", description: "", day: new Date().toISOString().slice(0, 10), member_ids: [me] as string[] });
  function pick(fl: File | undefined) {
    if (!fl) return;
    setFile(fl);
    setPreview(URL.createObjectURL(fl));
  }
  async function save() {
    if (!f.title.trim()) { toast.error("Titre requis"); return; }
    if (file && file.size > 50 * 1024 * 1024) { toast.error("Fichier trop lourd (50 Mo max)"); return; }
    const ids = isManager ? f.member_ids : [...new Set([me, ...f.member_ids])];
    setBusy(true);
    try {
      let file_path: string | null = null;
      let kind = "moment";
      if (file) {
        kind = file.type.startsWith("video/") ? "video" : "photo";
        const ext = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "bin";
        file_path = `${me}/${crypto.randomUUID()}.${ext}`;
        const { error } = await supabase.storage.from("memories").upload(file_path, file, { contentType: file.type });
        if (error) throw error;
      }
      const { error } = await supabase.from("memories").insert({ title: f.title.trim().slice(0, 120), description: f.description.slice(0, 2000) || null, day: f.day, kind, file_path, member_ids: ids, created_by: me });
      if (error) throw error;
      toast.success("Souvenir ajouté 💛");
      setOpen(false); setFile(null); setPreview(undefined); setF({ ...f, title: "", description: "", member_ids: [me] });
      onDone();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur");
    } finally { setBusy(false); }
  }
  const pickBtn = "flex flex-col items-center gap-1 rounded-2xl bg-secondary p-3 text-xs font-bold transition hover:scale-[1.03] cursor-pointer";
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button size="lg" className="rounded-full shadow-soft"><Plus /> Ajouter un souvenir</Button></DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Nouveau souvenir</DialogTitle></DialogHeader>
        <div className="grid grid-cols-3 gap-2">
          <label className={pickBtn}><Camera className="size-6 text-primary" />Photo<input type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => pick(e.target.files?.[0])} /></label>
          <label className={pickBtn}><Video className="size-6 text-accent" />Vidéo<input type="file" accept="video/*" capture="environment" className="hidden" onChange={(e) => pick(e.target.files?.[0])} /></label>
          <label className={pickBtn}><ImagePlus className="size-6 text-star-foreground" />Importer<input type="file" accept="image/*,video/*" className="hidden" onChange={(e) => pick(e.target.files?.[0])} /></label>
        </div>
        {preview && file && (file.type.startsWith("video/") ? <video src={preview} controls className="max-h-56 w-full rounded-2xl" /> : <img src={preview} alt="Aperçu" className="max-h-56 w-full rounded-2xl object-cover" />)}
        <div className="grid gap-2 sm:grid-cols-[1fr_10rem]"><div><Label>Titre</Label><Input value={f.title} maxLength={120} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder="Premier pas d'Eden" /></div><div><Label>Date</Label><Input type="date" value={f.day} onChange={(e) => setF({ ...f, day: e.target.value })} /></div></div>
        <div><Label>Histoire du moment</Label><Textarea value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></div>
        {isManager && <div><Label>Qui est dessus ? (ils pourront le voir)</Label>
          <div className="mt-1 flex flex-wrap gap-2">{members.map((m) => { const on = f.member_ids.includes(m.id); return <button key={m.id} type="button" onClick={() => setF({ ...f, member_ids: on ? f.member_ids.filter((x) => x !== m.id) : [...f.member_ids, m.id] })} className={cn("flex items-center gap-1.5 rounded-full border px-2 py-1 text-sm font-semibold", on ? "border-primary bg-secondary" : "opacity-60")}><Avatar m={m} size={22} />{m.first_name}</button>; })}</div></div>}
        {!isManager && <p className="text-xs font-semibold text-muted-foreground">Ce souvenir sera visible par toi et par Papa.</p>}
        <Button onClick={save} disabled={busy}>{busy ? "Envoi…" : "Ajouter au coffre-fort"}</Button>
      </DialogContent>
    </Dialog>
  );
}
