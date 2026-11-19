import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { membersQuery, useMe } from "@/hooks/use-me";
import { Avatar } from "@/components/family/AppShell";
import { ageFrom, fmtDate, templatesForAge, TASK_STATUS } from "@/lib/family";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/taches")({
  head: () => ({ meta: [{ title: "Tâches — Family OS" }, { name: "description", content: "Tâches, missions et validations." }] }),
  component: TasksPage,
});

function TasksPage() {
  const { data: me } = useMe();
  const qc = useQueryClient();
  const { data: members = [] } = useQuery(membersQuery);
  const { data: tasks = [] } = useQuery({ queryKey: ["tasks"], queryFn: async () => (await supabase.from("tasks").select("*").order("created_at", { ascending: false })).data ?? [] });
  const [filter, setFilter] = useState("tous");
  const byId = Object.fromEntries(members.map((m) => [m.id, m]));
  const upd = useMutation({
    mutationFn: async ({ id, ...patch }: { id: string; status?: string; comment?: string | null }) => {
      const { error } = await supabase.from("tasks").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["tasks"] }); qc.invalidateQueries({ queryKey: ["members"] }); },
    onError: (e) => toast.error(e.message),
  });
  const shown = tasks.filter((t) => filter === "tous" || t.member_id === filter);
  const groups = ["en_attente", "a_faire", "en_cours", "validee"];

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="flex-1 text-3xl font-bold">Tâches & missions</h1>
        {me?.isManager && (
          <>
            <Select value={filter} onValueChange={setFilter}><SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="tous">Tous les enfants</SelectItem>{members.filter((m) => m.family_role !== "admin").map((m) => <SelectItem key={m.id} value={m.id}>{m.avatar} {m.first_name}</SelectItem>)}</SelectContent></Select>
            <NewTask members={members.filter((m) => m.family_role !== "admin")} />
          </>
        )}
      </div>
      {groups.map((g) => {
        const list = shown.filter((t) => t.status === g || (g === "en_cours" && t.status === "terminee"));
        if (!list.length) return null;
        return (
          <section key={g} className="card-modern p-5">
            <h2 className="mb-3 text-lg font-bold">{TASK_STATUS[g]} <span className="text-muted-foreground">({list.length})</span></h2>
            <div className="space-y-2">
              {list.map((t) => (
                <div key={t.id} className="flex flex-wrap items-center gap-3 tile p-3">
                  <span className="text-2xl">{t.icon}</span>
                  <div className="min-w-40 flex-1">
                    <div className="font-bold">{t.title}</div>
                    <div className="text-xs text-muted-foreground">⭐ {t.points} pts · {t.frequency}{t.due_date && ` · échéance ${fmtDate(t.due_date)}`}</div>
                    {t.description && <div className="text-xs">{t.description}</div>}
                    {t.comment && <div className="text-xs italic text-muted-foreground">💬 {t.comment}</div>}
                  </div>
                  {byId[t.member_id] && <Avatar m={byId[t.member_id]} size={30} />}
                  {me?.isManager && t.status === "en_attente" && (
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => upd.mutate({ id: t.id, status: "validee" })}>Valider</Button>
                      <Button size="sm" variant="outline" onClick={() => { const c = prompt("Commentaire (facultatif)") ?? ""; upd.mutate({ id: t.id, status: "a_faire", comment: c.slice(0, 300) || null }); }}>Refuser</Button>
                    </div>
                  )}
                  {!me?.isManager && (t.status === "a_faire" || t.status === "en_cours") && <Button size="sm" onClick={() => upd.mutate({ id: t.id, status: "en_attente" })}>J'ai fini !</Button>}
                  {me?.isManager && g === "validee" && <Badge variant="secondary">✓</Badge>}
                  {me?.isManager && <button className="text-xs text-destructive" onClick={async () => { await supabase.from("tasks").delete().eq("id", t.id); qc.invalidateQueries({ queryKey: ["tasks"] }); }}>Suppr.</button>}
                </div>
              ))}
            </div>
          </section>
        );
      })}
      {!shown.length && <p className="text-muted-foreground">Aucune tâche.</p>}
    </div>
  );
}

function NewTask({ members }: { members: { id: string; first_name: string; birth_date: string; avatar: string }[] }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ member_id: members[0]?.id ?? "", title: "", icon: "⭐", description: "", due_date: "", frequency: "unique", points: 10 });
  const m = members.find((x) => x.id === f.member_id);
  const templates = m ? templatesForAge(ageFrom(m.birth_date)) : [];
  const save = useMutation({
    mutationFn: async () => {
      if (!f.title.trim() || !f.member_id) throw new Error("Titre et enfant requis");
      const { error } = await supabase.from("tasks").insert({ ...f, title: f.title.trim(), due_date: f.due_date || null, description: f.description || null, points: Math.max(0, Math.min(1000, f.points)) });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Tâche créée"); setOpen(false); qc.invalidateQueries({ queryKey: ["tasks"] }); },
    onError: (e) => toast.error(e.message),
  });
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button><Plus /> Tâche</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Nouvelle tâche</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Pour</Label>
            <Select value={f.member_id} onValueChange={(v) => setF({ ...f, member_id: v })}><SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{members.map((x) => <SelectItem key={x.id} value={x.id}>{x.avatar} {x.first_name}</SelectItem>)}</SelectContent></Select></div>
          <div><Label>Modèles adaptés à l'âge</Label>
            <div className="mt-1 flex flex-wrap gap-1.5">{templates.map((t) => <button key={t.title} type="button" onClick={() => setF({ ...f, title: t.title, icon: t.icon, points: t.points })} className="rounded-full bg-muted px-2.5 py-1 text-xs font-semibold">{t.icon} {t.title}</button>)}</div></div>
          <div className="grid grid-cols-[4rem_1fr] gap-2"><div><Label>Icône</Label><Input value={f.icon} maxLength={4} onChange={(e) => setF({ ...f, icon: e.target.value })} /></div><div><Label>Titre</Label><Input value={f.title} maxLength={120} onChange={(e) => setF({ ...f, title: e.target.value })} /></div></div>
          <div><Label>Description</Label><Textarea value={f.description} maxLength={500} onChange={(e) => setF({ ...f, description: e.target.value })} /></div>
          <div className="grid grid-cols-3 gap-2">
            <div><Label>Points</Label><Input type="number" min={0} value={f.points} onChange={(e) => setF({ ...f, points: Number(e.target.value) })} /></div>
            <div><Label>Échéance</Label><Input type="date" value={f.due_date} onChange={(e) => setF({ ...f, due_date: e.target.value })} /></div>
            <div><Label>Fréquence</Label>
              <Select value={f.frequency} onValueChange={(v) => setF({ ...f, frequency: v })}><SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{["unique", "quotidienne", "hebdomadaire"].map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent></Select></div>
          </div>
          <Button className="w-full" onClick={() => save.mutate()} disabled={save.isPending}>Créer</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
