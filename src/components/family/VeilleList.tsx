import { useQuery } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useMe } from "@/hooks/use-me";
import { fmtDate, fmtTime } from "@/lib/family";
import { DONE_STATES, VEILLE_CATEGORIES, gradeLabel, groupHomework, homeworkStatus, type VeilleCategory } from "@/lib/veille";
import { cn } from "@/lib/utils";

export type VItem = any;
const cat = (c: string) => VEILLE_CATEGORIES[c as VeilleCategory];
export const readableDate = (i: VItem) => {
  if (i.starts_at) return format(parseISO(i.starts_at), "EEEE d MMMM · HH:mm", { locale: fr });
  if (i.day) return format(parseISO(i.day), "EEEE d MMMM", { locale: fr });
  return null;
};

export function useVeilleItems(memberId?: string) {
  return useQuery({
    queryKey: ["veille-items", memberId ?? "all"],
    queryFn: async () => {
      let q = supabase.from("veille_items").select("*, veille_sources(label)").order("day", { ascending: true, nullsFirst: false }).order("starts_at", { ascending: true, nullsFirst: false }).limit(1000);
      if (memberId) q = q.eq("member_id", memberId);
      const { data, error } = await q;
      if (error) throw error;
      return data as VItem[];
    },
  });
}

/** One calm update line for the whole module. */
export function UpdateLine({ items }: { items: VItem[] }) {
  const last = items.reduce<string | null>((m, i) => (!m || i.collected_at > m ? i.collected_at : m), null);
  return <p className="text-xs font-semibold text-muted-foreground">{last ? `Dernière mise à jour : ${fmtDate(last)} à ${fmtTime(last)} · import manuel, pas de synchronisation automatique` : "Pas encore importé"}</p>;
}

/** Papa-only collapsed metadata panel. Keeps every collected field, neutral grey text. */
export function CollectDetails({ items }: { items: VItem[] }) {
  const { data: me } = useMe();
  if (!me?.isAdmin || !items.length) return null;
  return (
    <details className="mt-4 rounded-xl bg-muted/50 p-3 text-xs text-muted-foreground">
      <summary className="cursor-pointer font-bold">Détails de la collecte ({items.length})</summary>
      <div className="mt-2 space-y-2">
        {items.map((i) => (
          <div key={i.id} className="border-t border-border pt-2">
            <div className="font-semibold">{cat(i.category)?.label} · {i.title}</div>
            <div>Provenance : {i.veille_sources?.label ?? "source autorisée"} · identifiant : {i.source_key}</div>
            <div>Collecté le {fmtDate(i.collected_at)} {fmtTime(i.collected_at)} · vu la première fois le {fmtDate(i.first_seen)} · dernière vue le {fmtDate(i.last_seen)}</div>
            <div>État : {DONE_STATES[i.done_state as keyof typeof DONE_STATES]}{i.source_status && ` · statut source : ${i.source_status}`}{i.grade_raw && ` · valeur brute : ${i.grade_raw}`} · visible par l'enfant : {i.child_visible ? "oui" : "non"}</div>
            {(i.possible_duplicate || i.uncertainties?.length > 0) && <div>Incertitudes : {[...new Set([...(i.possible_duplicate ? ["doublon possible"] : []), ...(i.uncertainties ?? [])])].join(" · ")}</div>}
          </div>
        ))}
      </div>
    </details>
  );
}

function Card({ i, children }: { i: VItem; children?: React.ReactNode }) {
  const d = readableDate(i);
  return (
    <div className="tile p-3 text-sm">
      <div className="flex items-start gap-2">
        <span className="text-xl leading-none">{cat(i.category)?.icon}</span>
        <div className="min-w-0 flex-1">
          {i.subject && <div className="text-xs font-extrabold uppercase tracking-wide text-primary">{i.subject}</div>}
          <div className="font-bold">{i.title}</div>
          {(d || i.location) && <div className="text-xs text-muted-foreground first-letter:uppercase">{d}{i.location && ` · ${i.location}`}</div>}
        </div>
        {children}
      </div>
      {i.description && (
        <details className="mt-2 text-sm"><summary className="cursor-pointer text-xs font-bold text-primary">Voir la consigne</summary><p className="mt-1 whitespace-pre-wrap">{i.description}</p></details>
      )}
    </div>
  );
}
const Pill = ({ children, tone }: { children: React.ReactNode; tone?: "ok" | "neutral" }) => <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-xs font-bold", tone === "ok" ? "bg-success/20" : "bg-muted")}>{children}</span>;

const TABS = [
  { k: "todo", l: "À faire", cats: ["devoir"] },
  { k: "tests", l: "Contrôles", cats: ["controle"] },
  { k: "notes", l: "Notes", cats: ["note", "moyenne"] },
  { k: "edt", l: "Emploi du temps", cats: ["cours", "changement_horaire"] },
  { k: "vie", l: "Vie scolaire", cats: ["absence", "retard", "observation"] },
  { k: "info", l: "Informations", cats: ["evenement", "message", "rendez_vous"] },
  { k: "docs", l: "Documents & bulletins", cats: ["document", "bulletin"] },
  { k: "comp", l: "Compétences", cats: ["competence"] },
] as const;

const Empty = () => <p className="rounded-xl bg-muted/50 p-4 text-center text-sm text-muted-foreground">Pas encore importé</p>;
const Group = ({ title, items, render }: { title: string; items: VItem[]; render: (i: VItem) => React.ReactNode }) =>
  items.length ? <div><h3 className="mb-2 mt-3 text-sm font-extrabold text-muted-foreground">{title}</h3><div className="grid gap-2 sm:grid-cols-2">{items.map(render)}</div></div> : null;

export function SchoolVeille({ memberId }: { memberId: string }) {
  const { data: items = [] } = useVeilleItems(memberId);
  const [tab, setTab] = useState<(typeof TABS)[number]["k"]>("todo");
  const today = new Date().toISOString().slice(0, 10);
  const t = TABS.find((x) => x.k === tab)!;
  const list = items.filter((i) => (t.cats as readonly string[]).includes(i.category));

  const hw = (i: VItem) => { const s = homeworkStatus(i.done_state); return <Card key={i.id} i={i}>{s && <Pill tone={s === "Fait" ? "ok" : "neutral"}>{s}</Pill>}</Card>; };
  const note = (i: VItem) => (
    <Card key={i.id} i={i}>
      <div className="text-right">
        <div className="text-lg font-extrabold">{gradeLabel(i)}</div>
        <div className="text-xs text-muted-foreground">{[i.period, i.coefficient != null && `coef. ${i.coefficient}`, i.class_average != null && `classe ${i.class_average}`].filter(Boolean).join(" · ")}</div>
      </div>
    </Card>
  );
  const vie = (i: VItem) => <Card key={i.id} i={i}>{i.justified != null && <Pill tone={i.justified ? "ok" : "neutral"}>{i.justified ? "Justifiée" : "Non justifiée"}</Pill>}</Card>;
  const doc = (i: VItem) => <Card key={i.id} i={i}>{i.document_url && <a className="shrink-0 text-xs font-bold text-primary underline" href={i.document_url} target="_blank" rel="noreferrer noopener">Ouvrir</a>}</Card>;
  const comp = (i: VItem) => <Card key={i.id} i={i}>{(i.grade_raw || i.source_status) && <Pill>{i.grade_raw ?? i.source_status}</Pill>}</Card>;
  const plain = (i: VItem) => <Card key={i.id} i={i} />;

  let body: React.ReactNode;
  if (!list.length) body = <Empty />;
  else if (tab === "todo" || tab === "tests") {
    const g = groupHomework(list, today);
    const r = tab === "todo" ? hw : plain;
    body = <>
      <Group title="Aujourd'hui" items={g.today} render={r} /><Group title="Demain" items={g.tomorrow} render={r} />
      <Group title="Cette semaine" items={g.week} render={r} /><Group title="Plus tard" items={g.later} render={r} />
      <Group title="Sans date" items={g.undated} render={r} />
      {g.history.length > 0 && <details className="mt-3"><summary className="cursor-pointer text-sm font-extrabold text-muted-foreground">Historique ({g.history.length})</summary><div className="mt-2 grid gap-2 sm:grid-cols-2">{g.history.map(r)}</div></details>}
    </>;
  } else if (tab === "notes") {
    const avgs = list.filter((i) => i.category === "moyenne"), notes = list.filter((i) => i.category === "note");
    body = <><Group title="Moyennes importées" items={avgs} render={note} /><Group title="Notes" items={[...notes].reverse()} render={note} /></>;
  } else if (tab === "edt") {
    const days = [...new Set(list.map((i) => i.day ?? i.starts_at?.slice(0, 10) ?? ""))];
    body = days.map((d) => <Group key={d} title={d ? format(parseISO(d), "EEEE d MMMM", { locale: fr }) : "Sans date"} items={list.filter((i) => (i.day ?? i.starts_at?.slice(0, 10) ?? "") === d)} render={plain} />);
  } else if (tab === "vie") body = <Group title="Vie scolaire" items={[...list].reverse()} render={vie} />;
  else if (tab === "docs") body = <Group title="Documents & bulletins" items={[...list].reverse()} render={doc} />;
  else if (tab === "comp") body = <Group title="Compétences" items={list} render={comp} />;
  else body = <Group title="Informations" items={list} render={plain} />;

  return (
    <section className="card-modern p-4 sm:p-5">
      <h2 className="text-lg font-bold">🎒 Vie au collège</h2>
      <UpdateLine items={items} />
      <div className="-mx-1 mt-3 flex gap-2 overflow-x-auto px-1 pb-1">
        {TABS.map((x) => {
          const n = items.filter((i) => (x.cats as readonly string[]).includes(i.category)).length;
          return <button key={x.k} type="button" onClick={() => setTab(x.k)} className={cn("shrink-0 rounded-full px-3 py-1.5 text-sm font-bold transition", tab === x.k ? "fab" : "bg-muted text-muted-foreground")}>{x.l}{n > 0 && ` · ${n}`}</button>;
        })}
      </div>
      <div className="mt-2">{body}</div>
      <CollectDetails items={list} />
    </section>
  );
}

/** Calendar: upcoming dated school items, no repeated technical text. */
export function VeilleList({ title }: { title: string; onlyDated?: boolean }) {
  const { data: items = [] } = useVeilleItems();
  const today = new Date().toISOString().slice(0, 10);
  const up = items.filter((i) => (i.day ?? i.starts_at?.slice(0, 10) ?? "") >= today && i.category !== "cours").slice(0, 30);
  if (!up.length) return null;
  return (
    <section className="card-modern p-4 sm:p-5">
      <h2 className="text-lg font-bold">🗓️ {title}</h2>
      <UpdateLine items={items} />
      <div className="mt-3 grid gap-2 sm:grid-cols-2">{up.map((i) => <Card key={i.id} i={i}><Pill>{cat(i.category)?.label}</Pill></Card>)}</div>
      <CollectDetails items={up} />
    </section>
  );
}
