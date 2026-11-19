import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { membersQuery, useMe } from "@/hooks/use-me";
import { MemberTabs } from "@/components/family/MemberPicker";
import { fmtDate } from "@/lib/family";
import { schoolProgress, SCHOOL_KINDS } from "@/lib/school";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/ecole")({
  head: () => ({ meta: [{ title: "Scolarité — Family OS" }, { name: "description", content: "Devoirs, contrôles, notes et progrès scolaires." }] }),
  component: SchoolPage,
});

function SchoolPage() {
  const { data: me } = useMe();
  const qc = useQueryClient();
  const { data: members = [] } = useQuery(membersQuery);
  const kids = me?.isManager ? members.filter((m) => m.family_role !== "admin" && m.family_role !== "adulte") : me?.member ? [me.member] : [];
  const [sel, setSel] = useState<string>();
  const cur = kids.find((k) => k.id === sel) ?? kids[0];
  const { data } = useQuery({
    queryKey: ["school", cur?.id],
    enabled: !!cur,
    queryFn: async () => {
      const [p, items] = await Promise.all([
        supabase.from("school_profiles").select("*").eq("member_id", cur!.id).maybeSingle(),
        supabase.from("school_items").select("*").eq("member_id", cur!.id).order("due_date", { ascending: true, nullsFirst: false }),
      ]);
      return { profile: p.data, items: items.data ?? [] };
    },
  });
  const [f, setF] = useState({ kind: "devoir", subject: "", title: "", due_date: "", grade: "", out_of: "20" });
  if (!cur) return <p className="text-muted-foreground">Chargement…</p>;
  const items = data?.items ?? [];
  const prog = schoolProgress(items.map((i) => ({ ...i, grade: i.grade == null ? null : Number(i.grade), out_of: i.out_of == null ? null : Number(i.out_of) })));
  const today = new Date().toISOString().slice(0, 10);
  const todo = items.filter((i) => (i.kind === "devoir" || i.kind === "controle") && !(i.done && (i.due_date ?? "") < today));
  const notes = items.filter((i) => i.kind === "note");
  const others = items.filter((i) => !["devoir", "controle", "note"].includes(i.kind));
  const refresh = () => qc.invalidateQueries({ queryKey: ["school"] });

  async function saveProfile(patch: Record<string, string>) {
    const { error } = await supabase.from("school_profiles").upsert({ member_id: cur!.id, ...data?.profile, ...patch });
    if (error) toast.error(error.message); else refresh();
  }
  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!f.title.trim()) { toast.error("Titre requis"); return; }
    const { error } = await supabase.from("school_items").insert({
      member_id: cur!.id, kind: f.kind, subject: f.subject.trim() || null, title: f.title.trim().slice(0, 200),
      due_date: f.due_date || null, grade: f.kind === "note" && f.grade ? Number(f.grade.replace(",", ".")) : null, out_of: Number(f.out_of) || 20,
    });
    if (error) toast.error(error.message); else { toast.success("Ajouté"); setF({ ...f, title: "", grade: "" }); refresh(); }
  }

  return (
    <div className="stagger mx-auto max-w-6xl space-y-6">
      <h1 className="text-3xl font-bold">🏫 <span className="text-gradient">Scolarité</span></h1>
      {me?.isManager && <MemberTabs members={kids} current={cur.id} onSelect={setSel} />}

      <div className="stagger grid gap-4 md:grid-cols-4">
        <section className="card-modern p-5 md:col-span-2">
          <h2 className="mb-3 text-lg font-bold">🎒 {cur.first_name}</h2>
          <div className="grid grid-cols-3 gap-2">
            {([["school", "Établissement"], ["class_name", "Classe"], ["teacher", "Enseignant(e)"]] as const).map(([k, l]) => (
              <div key={k}><div className="text-xs font-bold text-muted-foreground">{l}</div>
                {me?.isManager ? <Input key={cur.id + (data?.profile?.[k] ?? "")} defaultValue={data?.profile?.[k] ?? ""} maxLength={80} onBlur={(e) => e.target.value !== (data?.profile?.[k] ?? "") && saveProfile({ [k]: e.target.value })} />
                  : <div className="font-semibold">{data?.profile?.[k] || "—"}</div>}
              </div>
            ))}
          </div>
        </section>
        <Gauge label="Moyenne générale" value={prog.average != null ? `${prog.average}/20` : "—"} pct={prog.average != null ? (prog.average / 20) * 100 : 0} />
        <Gauge label="Devoirs faits" value={prog.homeworkDone != null ? `${prog.homeworkDone} %` : "—"} pct={prog.homeworkDone ?? 0} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card-modern p-5">
          <h2 className="mb-3 text-lg font-bold">📚 Devoirs & contrôles</h2>
          {!todo.length && <p className="text-sm text-muted-foreground">Rien à préparer. 🎉</p>}
          <div className="space-y-2">
            {todo.map((i) => {
              const late = !i.done && i.due_date && i.due_date < today;
              return (
                <label key={i.id} className={cn("tile flex cursor-pointer items-center gap-3 p-3", late && "ring-2 ring-destructive/40")}>
                  <input type="checkbox" className="size-5 accent-primary" checked={i.done} onChange={async () => { const { error } = await supabase.from("school_items").update({ done: !i.done }).eq("id", i.id); if (error) toast.error(error.message); else refresh(); }} />
                  <span className="text-xl">{SCHOOL_KINDS[i.kind]?.icon}</span>
                  <span className="min-w-0 flex-1">
                    <span className={cn("block font-bold", i.done && "text-muted-foreground line-through")}>{i.title}</span>
                    <span className="text-xs text-muted-foreground">{i.subject ?? SCHOOL_KINDS[i.kind]?.label}{i.due_date && ` · pour le ${fmtDate(i.due_date)}`}{late && " · en retard"}</span>
                  </span>
                  {me?.isManager && <Del id={i.id} onDone={refresh} />}
                </label>
              );
            })}
          </div>
        </section>
        <section className="card-modern p-5">
          <h2 className="mb-3 text-lg font-bold">🎯 Notes & progrès</h2>
          {prog.subjects.length > 0 && (
            <div className="mb-4 space-y-2">
              {prog.subjects.map((s) => (
                <div key={s.subject}>
                  <div className="mb-1 flex justify-between text-sm font-bold"><span>{s.subject}</span><span>{s.average}/20</span></div>
                  <div className="h-2.5 overflow-hidden rounded-full bg-muted"><div className={cn("h-full rounded-full transition-all duration-700", s.average >= 12 ? "bg-success" : s.average >= 10 ? "bg-star" : "bg-accent")} style={{ width: `${(s.average / 20) * 100}%` }} /></div>
                </div>
              ))}
            </div>
          )}
          <div className="space-y-2">
            {notes.map((n) => (
              <div key={n.id} className="tile flex items-center gap-3 p-3 text-sm">
                <span className="flex-1 font-semibold">{n.title} <span className="text-xs text-muted-foreground">· {n.subject}{n.due_date && ` · ${fmtDate(n.due_date)}`}</span></span>
                <span className="font-extrabold">{Number(n.grade)}/{Number(n.out_of)}</span>
                {me?.isManager && <Del id={n.id} onDone={refresh} />}
              </div>
            ))}
            {!notes.length && <p className="text-sm text-muted-foreground">Aucune note pour l'instant.</p>}
          </div>
        </section>
      </div>

      {others.length > 0 && (
        <section className="card-modern p-5">
          <h2 className="mb-3 text-lg font-bold">🗂️ Absences, rendez-vous & fournitures</h2>
          <div className="grid gap-2 sm:grid-cols-2">
            {others.map((o) => (
              <div key={o.id} className="tile flex items-center gap-3 p-3 text-sm">
                <span className="text-xl">{SCHOOL_KINDS[o.kind]?.icon}</span>
                <span className="flex-1 font-semibold">{o.title} <span className="text-xs text-muted-foreground">· {SCHOOL_KINDS[o.kind]?.label}{o.due_date && ` · ${fmtDate(o.due_date)}`}</span></span>
                {me?.isManager && <Del id={o.id} onDone={refresh} />}
              </div>
            ))}
          </div>
        </section>
      )}

      {me?.isManager && (
        <section className="card-modern p-5">
          <h2 className="mb-3 text-lg font-bold">➕ Ajouter pour {cur.first_name}</h2>
          <form onSubmit={add} className="grid gap-2 sm:grid-cols-[11rem_9rem_1fr_10rem_auto]">
            <Select value={f.kind} onValueChange={(v) => setF({ ...f, kind: v })}><SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{Object.entries(SCHOOL_KINDS).map(([k, v]) => <SelectItem key={k} value={k}>{v.icon} {v.label}</SelectItem>)}</SelectContent></Select>
            <Input placeholder="Matière" maxLength={40} value={f.subject} onChange={(e) => setF({ ...f, subject: e.target.value })} />
            <Input placeholder={f.kind === "note" ? "Ex. Contrôle fractions" : "Ex. Exercices p. 42"} value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} />
            <Input type="date" aria-label="Date" value={f.due_date} onChange={(e) => setF({ ...f, due_date: e.target.value })} />
            <Button type="submit">Ajouter</Button>
            {f.kind === "note" && (
              <div className="flex items-center gap-2 sm:col-span-5">
                <Input className="w-24" placeholder="Note" inputMode="decimal" value={f.grade} onChange={(e) => setF({ ...f, grade: e.target.value })} />
                <span className="font-bold">/</span>
                <Input className="w-20" inputMode="decimal" value={f.out_of} onChange={(e) => setF({ ...f, out_of: e.target.value })} />
              </div>
            )}
          </form>
        </section>
      )}
    </div>
  );
}

function Gauge({ label, value, pct }: { label: string; value: string; pct: number }) {
  return (
    <div className="card-modern card-hover flex items-center gap-4 p-5">
      <div className="relative size-16 shrink-0 rounded-full" style={{ background: `conic-gradient(var(--primary) ${pct * 3.6}deg, var(--muted) 0)` }}>
        <div className="absolute inset-1.5 rounded-full bg-card" />
      </div>
      <div><div className="text-xs font-bold text-muted-foreground">{label}</div><div className="text-2xl font-extrabold">{value}</div></div>
    </div>
  );
}
function Del({ id, onDone }: { id: string; onDone: () => void }) {
  return <button type="button" aria-label="Supprimer" className="text-xs text-destructive" onClick={async (e) => { e.preventDefault(); await supabase.from("school_items").delete().eq("id", id); onDone(); }}>✕</button>;
}
