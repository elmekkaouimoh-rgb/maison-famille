import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { addDays, format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "sonner";
import { Award, ClipboardCheck, Clock, FileText, Info, ListChecks, Puzzle, ShieldCheck, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { membersQuery, useMe, type Member } from "@/hooks/use-me";
import { MemberTabs } from "@/components/family/MemberPicker";
import { SCHOOL_KINDS } from "@/lib/school";
import { frNum, gradeLabel, homeworkStatus, groupHomework } from "@/lib/veille";
import { entryDay, mergeCourses, subjectTone, unifySchool, type SchoolEntry } from "@/lib/school-unified";
import { CollectDetails, UpdateLine, useVeilleItems } from "@/components/family/VeilleList";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/ecole")({
  head: () => ({ meta: [{ title: "Scolarité — EL MEKKAOUI" }, { name: "description", content: "Devoirs, contrôles, notes, emploi du temps et vie scolaire." }] }),
  component: SchoolPage,
});

const TONE: Record<string, string> = { blue: "bg-pastel-blue text-pastel-blue-fg", violet: "bg-pastel-violet text-pastel-violet-fg", green: "bg-pastel-green text-pastel-green-fg", orange: "bg-pastel-orange text-pastel-orange-fg", pink: "bg-pastel-pink text-pastel-pink-fg" };
const TABS = [
  { k: "todo", l: "À faire", icon: ListChecks, kinds: ["devoir"] },
  { k: "tests", l: "Contrôles", icon: ClipboardCheck, kinds: ["controle"] },
  { k: "notes", l: "Notes", icon: Award, kinds: ["note", "moyenne"] },
  { k: "edt", l: "Emploi du temps", icon: Clock, kinds: ["cours", "changement_horaire"] },
  { k: "vie", l: "Vie scolaire", icon: ShieldCheck, kinds: ["absence", "retard", "observation"] },
  { k: "info", l: "Infos", icon: Info, kinds: ["evenement", "message", "rendez_vous"] },
  { k: "docs", l: "Documents", icon: FileText, kinds: ["document", "bulletin"] },
  { k: "comp", l: "Compétences", icon: Puzzle, kinds: ["competence"] },
] as const;
type TabK = (typeof TABS)[number]["k"];
const iso = (d: Date) => format(d, "yyyy-MM-dd");
const hm = (s: string | null) => (s ? format(parseISO(s), "HH:mm") : null);
const longDate = (d: string) => { const s = format(parseISO(d), "EEEE d MMMM", { locale: fr }); return s[0]!.toUpperCase() + s.slice(1); };

function SchoolPage() {
  const { data: me } = useMe();
  const qc = useQueryClient();
  const { data: members = [] } = useQuery(membersQuery);
  const kids = me?.isManager ? members.filter((m) => m.family_role !== "admin" && m.family_role !== "adulte") : me?.member ? [me.member] : [];
  const [sel, setSel] = useState<string>();
  const cur = kids.find((k) => k.id === sel) ?? kids[0];
  const { data } = useQuery({
    queryKey: ["school", cur?.id], enabled: !!cur,
    queryFn: async () => {
      const [p, items] = await Promise.all([
        supabase.from("school_profiles").select("*").eq("member_id", cur!.id).maybeSingle(),
        supabase.from("school_items").select("*").eq("member_id", cur!.id),
      ]);
      return { profile: p.data, items: items.data ?? [] };
    },
  });
  const { data: imported = [] } = useVeilleItems(cur?.id);
  const [tab, setTab] = useState<TabK>("todo");
  const today = iso(new Date());
  const [day, setDay] = useState(today);
  if (!cur) return <p className="text-muted-foreground">Chargement…</p>;

  const all = unifySchool(data?.items ?? [], imported);
  const refresh = () => { qc.invalidateQueries({ queryKey: ["school"] }); qc.invalidateQueries({ queryKey: ["veille-items"] }); };
  const tomorrow = iso(addDays(new Date(), 1));
  const prep = all.filter((e) => (e.kind === "devoir" || e.kind === "controle") && entryDay(e) === tomorrow);
  const week = Array.from({ length: 7 }, (_, i) => iso(addDays(new Date(), i)));
  const ofDay = mergeCourses(all.filter((e) => entryDay(e) === day && ["cours", "changement_horaire", "devoir", "controle", "evenement"].includes(e.kind)));
  const by = (k: TabK) => all.filter((e) => (TABS.find((t) => t.k === k)!.kinds as readonly string[]).includes(e.kind));
  const p = data?.profile;

  return (
    <div className="school-bg mx-auto max-w-5xl space-y-4 overflow-x-hidden p-3 sm:p-6">
      {me?.isManager && kids.length > 1 && <MemberTabs members={kids} current={cur.id} onSelect={(id) => { setSel(id); setDay(today); }} />}

      <header className="school-card flex min-w-0 items-center gap-4 p-4 sm:p-5">
        <Avatar m={cur} />
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-2xl font-extrabold tracking-tight">{cur.first_name}</h1>
          <p className="truncate text-sm font-semibold text-muted-foreground">{[p?.class_name, p?.school].filter(Boolean).join(" · ") || "Classe non renseignée"}</p>
          <div className="mt-1"><UpdateLine items={imported} /></div>
        </div>
      </header>

      {me?.isManager && (
        <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Devoirs à venir" known={by("todo").length > 0} value={by("todo").filter((e) => (entryDay(e) ?? "") >= today).length} />
          <Stat label="Contrôles à venir" known={by("tests").length > 0} value={by("tests").filter((e) => (entryDay(e) ?? "") >= today).length} />
          <Stat label="Notes" known={all.some((e) => e.kind === "note")} value={all.filter((e) => e.kind === "note").length} />
          <Stat label="Absences · retards" known={all.some((e) => e.kind === "absence" || e.kind === "retard")} value={`${all.some((e) => e.kind === "absence") ? all.filter((e) => e.kind === "absence").length : "—"} · ${all.some((e) => e.kind === "retard") ? all.filter((e) => e.kind === "retard").length : "—"}`} />
        </section>
      )}

      <section className="school-card p-4 sm:p-5">
        <h2 className="text-lg font-extrabold">À préparer pour demain</h2>
        <p className="mb-3 text-sm text-muted-foreground">{longDate(tomorrow)}</p>
        {prep.length ? <div className="space-y-3">{prep.map((e) => <EntryCard key={e.id} e={e} open onToggle={refresh} />)}</div>
          : <p className="rounded-2xl bg-muted/60 p-4 text-sm text-muted-foreground">Rien d'enregistré pour demain.</p>}
      </section>

      <section className="school-card p-4 sm:p-5">
        <h2 className="mb-3 text-lg font-extrabold">Ma semaine</h2>
        <div className="grid grid-cols-7 gap-1 sm:gap-2">
          {week.map((d) => {
            const n = all.filter((e) => entryDay(e) === d && e.kind !== "cours").length;
            const on = d === day;
            return (
              <button key={d} type="button" onClick={() => setDay(d)} aria-pressed={on}
                className={cn("flex min-h-16 flex-col items-center justify-center rounded-2xl py-2 text-xs font-bold transition", on ? "school-accent shadow-md" : "bg-muted/60 text-foreground")}>
                <span className="capitalize">{format(parseISO(d), "EEE", { locale: fr }).replace(".", "")}</span>
                <span className="text-lg font-extrabold">{format(parseISO(d), "d")}</span>
                <span className={cn("size-1.5 rounded-full", n ? (on ? "bg-primary-foreground" : "bg-electric") : "bg-transparent")} />
              </button>
            );
          })}
        </div>
        <div className="mt-4 space-y-2">
          {ofDay.length ? ofDay.map((e) => e.kind === "cours" || e.kind === "changement_horaire" ? <CourseRow key={e.id} e={e} isAdmin={!!me?.isAdmin} /> : <EntryCard key={e.id} e={e} onToggle={refresh} />)
            : <p className="text-sm text-muted-foreground">Rien d'enregistré ce jour-là.</p>}
        </div>
      </section>

      <nav className="grid grid-cols-4 gap-2" aria-label="Rubriques">
        {TABS.map((t) => {
          const on = tab === t.k; const Icon = t.icon;
          return (
            <button key={t.k} type="button" onClick={() => setTab(t.k)} aria-pressed={on}
              className={cn("flex min-h-16 flex-col items-center justify-center gap-1 rounded-2xl px-1 text-[11px] font-bold leading-tight sm:text-xs", on ? "school-accent shadow-md" : "school-card text-foreground")}>
              <Icon className="size-5" aria-hidden /><span className="text-center">{t.l}</span>
            </button>
          );
        })}
      </nav>

      <section id="ecole-onglet" className="school-card p-4 sm:p-5">
        <TabBody k={tab} items={by(tab)} today={today} onToggle={refresh} isAdmin={!!me?.isAdmin} />
        <CollectDetails items={imported.filter((i: any) => (TABS.find((t) => t.k === tab)!.kinds as readonly string[]).includes(i.category))} />
      </section>

      {me?.isManager && <Manage cur={cur} profile={p} manual={data?.items ?? []} onDone={refresh} />}
    </div>
  );
}

function Avatar({ m }: { m: Member }) {
  return m.photo_url ? <img src={m.photo_url} alt="" className="size-16 shrink-0 rounded-3xl object-cover" />
    : <div className="grid size-16 shrink-0 place-items-center rounded-3xl text-3xl" style={{ background: `color-mix(in oklab, ${m.color} 30%, var(--card))` }}>{m.avatar}</div>;
}
function Stat({ label, value, known = true }: { label: string; value: number | string; known?: boolean }) {
  return <div className="school-card p-3"><div className={known ? "text-2xl font-extrabold" : "py-1 text-sm font-bold text-muted-foreground"}>{known ? value : "Pas encore importé"}</div><div className="text-xs font-semibold text-muted-foreground">{label}</div></div>;
}
function SubjectPill({ s }: { s: string | null }) {
  if (!s) return null;
  return <span className={cn("inline-block max-w-full truncate rounded-full px-2.5 py-0.5 text-xs font-bold", TONE[subjectTone(s)])}>{s}</span>;
}
function CourseRow({ e, isAdmin }: { e: SchoolEntry & { merged?: SchoolEntry[]; status?: string | null }; isAdmin: boolean }) {
  const off = !!e.status;
  return (
    <div className={cn("rounded-2xl p-3", off ? "border-2 border-dashed border-border bg-card" : "bg-muted/50")}>
      <div className="flex min-w-0 items-center gap-3">
        <div className={cn("w-14 shrink-0 text-center", off && "text-muted-foreground")}><div className="text-sm font-extrabold">{hm(e.starts_at) ?? "—"}</div>{e.ends_at && <div className="text-xs text-muted-foreground">{hm(e.ends_at)}</div>}</div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2"><SubjectPill s={e.subject} />{off && <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-bold text-foreground">{e.status}</span>}</div>
          <div className={cn("font-bold", off && "text-muted-foreground line-through")}>{e.kind === "changement_horaire" && !off ? `Changement : ${e.title}` : e.title}</div>
          <div className="text-xs text-muted-foreground">{[e.kind === "changement_horaire" && !off && "Changement d'horaire", e.location && `Salle ${e.location}`].filter(Boolean).join(" · ")}</div>
        </div>
      </div>
      {isAdmin && (e.merged?.length ?? 0) > 1 && (
        <details className="mt-2 text-xs text-muted-foreground"><summary className="flex min-h-11 cursor-pointer items-center font-bold">Sources regroupées ({e.merged!.length})</summary>
          {e.merged!.map((m) => <div key={m.id}>{m.kind === "cours" ? "Cours" : "Changement d'horaire"} · {m.title}{m.raw?.source_status ? ` · statut : ${m.raw.source_status}` : ""}</div>)}</details>
      )}
    </div>
  );
}
function EntryCard({ e, open, onToggle }: { e: SchoolEntry; open?: boolean; onToggle: () => void }) {
  const st = homeworkStatus(e.done_state);
  const d = entryDay(e);
  async function toggle() {
    const { error } = await supabase.from("school_items").update({ done: e.done_state !== "fait" }).eq("id", e.id);
    if (error) toast.error(error.message); else onToggle();
  }
  return (
    <article className="rounded-2xl border border-border/60 bg-card p-4">
      <div className="flex min-w-0 items-start gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2"><SubjectPill s={e.subject} />{e.kind === "controle" && <span className="rounded-full bg-pastel-violet px-2.5 py-0.5 text-xs font-bold text-pastel-violet-fg">Contrôle</span>}</div>
          <h3 className="mt-1 font-bold leading-snug">{e.title}</h3>
          <p className="text-xs text-muted-foreground">{[d && longDate(d), hm(e.starts_at), e.location].filter(Boolean).join(" · ")}</p>
        </div>
        {e.origin === "manuel" && e.kind === "devoir" ? (
          <button type="button" onClick={toggle} aria-label={e.done_state === "fait" ? "Marquer à faire" : "Marquer fait"}
            className={cn("grid size-11 shrink-0 place-items-center rounded-full border-2", e.done_state === "fait" ? "school-accent border-transparent" : "border-border")}><Check className="size-5" /></button>
        ) : st && <span className={cn("shrink-0 rounded-full px-2.5 py-1 text-xs font-bold", st === "Fait" ? "bg-pastel-green text-pastel-green-fg" : "bg-muted text-muted-foreground")}>{st}</span>}
      </div>
      {e.description && (open
        ? <p className="mt-3 whitespace-pre-wrap rounded-xl bg-muted/50 p-3 text-sm leading-relaxed">{e.description}</p>
        : <details className="mt-2"><summary className="flex min-h-11 cursor-pointer items-center text-sm font-bold text-electric">Voir la consigne</summary><p className="whitespace-pre-wrap rounded-xl bg-muted/50 p-3 text-sm leading-relaxed">{e.description}</p></details>)}
    </article>
  );
}
const Empty = () => <p className="rounded-2xl bg-muted/60 p-5 text-center text-sm text-muted-foreground">Pas encore importé</p>;
const Group = ({ t, children }: { t: string; children: React.ReactNode }) => <div className="space-y-2"><h3 className="pt-2 text-sm font-extrabold text-muted-foreground">{t}</h3>{children}</div>;

function TabBody({ k, items, today, onToggle, isAdmin }: { k: TabK; items: SchoolEntry[]; today: string; onToggle: () => void; isAdmin: boolean }) {
  if (!items.length) return <Empty />;
  if (k === "todo" || k === "tests") {
    const g = groupHomework(items, today);
    const r = (x: SchoolEntry[]) => x.map((e) => <EntryCard key={e.id} e={e} onToggle={onToggle} />);
    return <div className="space-y-2">
      {g.today.length > 0 && <Group t="Aujourd'hui">{r(g.today)}</Group>}
      {g.tomorrow.length > 0 && <Group t="Demain">{r(g.tomorrow)}</Group>}
      {g.week.length > 0 && <Group t="Cette semaine">{r(g.week)}</Group>}
      {g.later.length > 0 && <Group t="Plus tard">{r(g.later)}</Group>}
      {g.undated.length > 0 && <Group t="Sans date">{r(g.undated)}</Group>}
      {g.history.length > 0 && <details><summary className="flex min-h-11 cursor-pointer items-center text-sm font-extrabold text-muted-foreground">Historique ({g.history.length})</summary><div className="space-y-2">{r(g.history)}</div></details>}
    </div>;
  }
  if (k === "notes") {
    return <div className="space-y-2">{[...items].reverse().map((e) => (
      <div key={e.id} className="flex min-w-0 items-center gap-3 rounded-2xl border border-border/60 p-4">
        <div className="min-w-0 flex-1">
          <SubjectPill s={e.subject} />
          <div className="mt-1 font-bold">{e.kind === "moyenne" ? `Moyenne · ${e.title}` : e.title}</div>
          <div className="text-xs text-muted-foreground">{[entryDay(e) && longDate(entryDay(e)!), e.period, e.coefficient != null && `coef. ${frNum(e.coefficient)}`, e.class_average != null && `moy. classe ${frNum(e.class_average)}`].filter(Boolean).join(" · ")}</div>
        </div>
        <div className="shrink-0 text-right"><div className="text-2xl font-extrabold tracking-tight text-electric">{gradeLabel(e)}</div></div>
      </div>))}</div>;
  }
  if (k === "edt") {
    const days = [...new Set(items.map((e) => entryDay(e) ?? ""))].sort();
    return <div className="space-y-2">{days.map((d) => <Group key={d} t={d ? longDate(d) : "Sans date"}>{mergeCourses(items.filter((e) => (entryDay(e) ?? "") === d)).map((e) => <CourseRow key={e.id} e={e} isAdmin={isAdmin} />)}</Group>)}</div>;
  }
  if (k === "vie") {
    const n = (kind: string) => items.filter((e) => e.kind === kind).length;
    return <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2">{([["Absences", n("absence")], ["Retards", n("retard")], ["Observations", n("observation")]] as const).map(([l, v]) => <div key={l} className="rounded-2xl bg-muted/60 p-3 text-center">{v ? <div className="text-xl font-extrabold">{v}</div> : <div className="py-1 text-xs font-bold text-muted-foreground">Pas encore importé</div>}<div className="text-xs font-semibold text-muted-foreground">{l}</div></div>)}</div>
      {[...items].reverse().map((e) => (
        <div key={e.id} className="rounded-2xl border border-border/60 p-4">
          <div className="flex items-center gap-2"><span className="flex-1 font-bold">{e.title}</span>{e.justified != null && <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-bold", e.justified ? "bg-pastel-green text-pastel-green-fg" : "bg-muted text-muted-foreground")}>{e.justified ? "Justifié" : "Non justifié"}</span>}</div>
          <div className="text-xs text-muted-foreground">{[SCHOOL_KINDS[e.kind]?.label ?? (e.kind === "observation" ? "Observation" : null), entryDay(e) && longDate(entryDay(e)!), hm(e.starts_at)].filter(Boolean).join(" · ")}</div>
          {e.description && <p className="mt-2 whitespace-pre-wrap text-sm">{e.description}</p>}
        </div>))}
    </div>;
  }
  return <div className="space-y-2">{items.map((e) => (
    <div key={e.id} className="flex min-w-0 items-start gap-3 rounded-2xl border border-border/60 p-4">
      <div className="min-w-0 flex-1">
        <SubjectPill s={e.subject} />
        <div className="mt-1 font-bold">{e.title}</div>
        <div className="text-xs text-muted-foreground">{[entryDay(e) && longDate(entryDay(e)!), hm(e.starts_at), e.location, e.period].filter(Boolean).join(" · ")}</div>
        {e.description && <p className="mt-2 whitespace-pre-wrap text-sm">{e.description}</p>}
      </div>
      {k === "comp" && (e.grade_raw) && <span className="shrink-0 rounded-full bg-pastel-blue px-2.5 py-1 text-xs font-bold text-pastel-blue-fg">{e.grade_raw}</span>}
      {e.document_url && <a href={e.document_url} target="_blank" rel="noreferrer noopener" className="flex min-h-11 shrink-0 items-center rounded-full bg-pastel-blue px-4 text-sm font-bold text-pastel-blue-fg">Ouvrir</a>}
    </div>))}</div>;
}

function Manage({ cur, profile, manual, onDone }: { cur: Member; profile: any; manual: any[]; onDone: () => void }) {
  const [f, setF] = useState({ kind: "devoir", subject: "", title: "", due_date: "", grade: "", out_of: "20" });
  async function saveProfile(patch: Record<string, string>) {
    const { error } = await supabase.from("school_profiles").upsert({ member_id: cur.id, ...profile, ...patch });
    if (error) toast.error(error.message); else onDone();
  }
  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!f.title.trim()) { toast.error("Titre requis"); return; }
    const { error } = await supabase.from("school_items").insert({ member_id: cur.id, kind: f.kind, subject: f.subject.trim() || null, title: f.title.trim().slice(0, 200),
      due_date: f.due_date || null, grade: f.kind === "note" && f.grade ? Number(f.grade.replace(",", ".")) : null, out_of: Number(f.out_of) || 20 });
    if (error) toast.error(error.message); else { toast.success("Ajouté"); setF({ ...f, title: "", grade: "" }); onDone(); }
  }
  return (
    <details className="school-card p-4 sm:p-5">
      <summary className="flex min-h-11 cursor-pointer items-center font-extrabold">Gérer la scolarité de {cur.first_name}</summary>
      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        {([["school", "Établissement"], ["class_name", "Classe"], ["teacher", "Enseignant(e)"]] as const).map(([k, l]) => (
          <label key={k} className="text-xs font-bold text-muted-foreground">{l}
            <Input key={cur.id + (profile?.[k] ?? "")} className="mt-1 h-11" defaultValue={profile?.[k] ?? ""} maxLength={80} onBlur={(e) => e.target.value !== (profile?.[k] ?? "") && saveProfile({ [k]: e.target.value })} /></label>
        ))}
      </div>
      <form onSubmit={add} className="mt-4 grid gap-2 sm:grid-cols-[11rem_9rem_1fr_10rem_auto]">
        <Select value={f.kind} onValueChange={(v) => setF({ ...f, kind: v })}><SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
          <SelectContent>{Object.entries(SCHOOL_KINDS).map(([k, v]) => <SelectItem key={k} value={k}>{v.icon} {v.label}</SelectItem>)}</SelectContent></Select>
        <Input className="h-11" placeholder="Matière" maxLength={40} value={f.subject} onChange={(e) => setF({ ...f, subject: e.target.value })} />
        <Input className="h-11" placeholder="Intitulé" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} />
        <Input className="h-11" type="date" aria-label="Date" value={f.due_date} onChange={(e) => setF({ ...f, due_date: e.target.value })} />
        <Button type="submit" className="h-11">Ajouter</Button>
        {f.kind === "note" && <div className="flex items-center gap-2 sm:col-span-5">
          <Input className="h-11 w-24" placeholder="Note" inputMode="decimal" value={f.grade} onChange={(e) => setF({ ...f, grade: e.target.value })} /><span className="font-bold">/</span>
          <Input className="h-11 w-20" inputMode="decimal" value={f.out_of} onChange={(e) => setF({ ...f, out_of: e.target.value })} /></div>}
      </form>
      {manual.length > 0 && <div className="mt-4 space-y-1">
        <div className="text-xs font-bold text-muted-foreground">Ajouts manuels</div>
        {manual.map((m) => <div key={m.id} className="flex min-h-11 items-center gap-2 text-sm"><span className="min-w-0 flex-1 truncate">{SCHOOL_KINDS[m.kind]?.icon} {m.title}</span>
          <button type="button" className="min-h-11 px-3 text-sm font-bold text-destructive" onClick={async () => { await supabase.from("school_items").delete().eq("id", m.id); onDone(); }}>Supprimer</button></div>)}
      </div>}
    </details>
  );
}
