import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { membersQuery, useMe } from "@/hooks/use-me";
import { fmtDate, fmtTime } from "@/lib/family";
import { VEILLE_CATEGORIES, type VeilleCategory } from "@/lib/veille";
import { importVeille } from "@/lib/veille.functions";
import { VeilleList } from "@/components/family/VeilleList";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/_authenticated/veille")({
  head: () => ({ meta: [{ title: "Veille familiale — EL MEKKAOUI" }, { name: "description", content: "Sources scolaires autorisées, import privé et dernière collecte." }] }),
  component: VeillePage,
});

const CATS = Object.keys(VEILLE_CATEGORIES) as VeilleCategory[];

function VeillePage() {
  const { data: me } = useMe();
  const qc = useQueryClient();
  const { data: members = [] } = useQuery(membersQuery);
  const { data: sources = [] } = useQuery({ queryKey: ["veille-sources"], enabled: !!me?.isAdmin, queryFn: async () => (await supabase.from("veille_sources").select("*").order("created_at")).data ?? [] });
  const { data: runs = [] } = useQuery({ queryKey: ["veille-runs"], enabled: !!me?.isAdmin, queryFn: async () => (await supabase.from("veille_runs").select("*").order("created_at", { ascending: false }).limit(10)).data ?? [] });
  const doImport = useServerFn(importVeille);
  const [sourceId, setSourceId] = useState<string>();
  const [text, setText] = useState("");
  const [preview, setPreview] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [nf, setNf] = useState({ label: "", url: "", member_id: "", consent: false });

  if (!me) return <p className="text-muted-foreground">Chargement…</p>;
  if (!me.isAdmin) return <p className="text-muted-foreground">Module réservé à Papa.</p>;
  const src = sources.find((s) => s.id === sourceId) ?? sources[0];
  const byId = Object.fromEntries(members.map((m) => [m.id, m]));
  const refresh = () => { qc.invalidateQueries({ queryKey: ["veille-sources"] }); qc.invalidateQueries({ queryKey: ["veille-runs"] }); qc.invalidateQueries({ queryKey: ["veille-items"] }); };

  function parse() {
    try { const j = JSON.parse(text); return Array.isArray(j) ? j : j.items; } catch { toast.error("JSON illisible"); return null; }
  }
  async function run(isPreview: boolean) {
    const items = parse(); if (!items || !src) return;
    setBusy(true);
    try {
      const r = await doImport({ data: { source_id: src.id, items, preview: isPreview } as any });
      setPreview(r);
      if (!isPreview) { toast.success("Import enregistré"); refresh(); }
    } catch (e: any) { toast.error(e.message); } finally { setBusy(false); }
  }
  async function addSource() {
    if (!nf.consent) { toast.error("Confirmez votre accord pour ce domaine"); return; }
    let host = ""; try { const u = new URL(nf.url); if (u.protocol !== "https:") throw 0; host = u.hostname; } catch { toast.error("Adresse https invalide"); return; }
    const { error } = await supabase.from("veille_sources").insert({ label: nf.label.trim() || host, url: nf.url.replace(/\/$/, ""), domain: host, member_id: nf.member_id, categories: CATS, child_categories: ["devoir", "controle", "note", "changement_horaire", "evenement"] });
    if (error) toast.error(error.message); else { setNf({ label: "", url: "", member_id: "", consent: false }); refresh(); }
  }
  async function patchSource(id: string, patch: { active?: boolean; categories?: string[]; child_categories?: string[] }) {
    const { error } = await supabase.from("veille_sources").update(patch).eq("id", id);
    if (error) toast.error(error.message); else refresh();
  }

  return (
    <div className="stagger mx-auto max-w-6xl space-y-6">
      <h1 className="text-3xl font-bold">🛰️ <span className="text-gradient">Veille familiale</span></h1>

      <section className="card-modern p-5">
        <h2 className="mb-2 text-lg font-bold">État de la collecte</h2>
        <p className="mb-3 rounded-xl bg-muted p-3 text-sm font-semibold">Synchronisation automatique non configurée — aucun collecteur n'est connecté. Les informations n'arrivent que lorsque vous les importez ; ce n'est pas du temps réel.</p>
        {sources.map((s) => {
          const last = runs.find((r) => r.source_id === s.id);
          const cov = (last?.coverage ?? {}) as Record<string, number>;
          return (
            <div key={s.id} className="tile mb-2 p-3 text-sm">
              <div className="font-bold">{s.label} · {byId[s.member_id]?.first_name}</div>
              <div className="text-muted-foreground">Dernière collecte : {last?.collected_at ? `${fmtDate(last.collected_at)} ${fmtTime(last.collected_at)}` : "jamais"}</div>
              <div className="mt-1 flex flex-wrap gap-1">{s.categories.map((c) => <span key={c} className="rounded-full bg-muted px-2 py-0.5 text-xs font-bold">{VEILLE_CATEGORIES[c as VeilleCategory]?.icon} {VEILLE_CATEGORIES[c as VeilleCategory]?.label} : {cov[c] ?? 0}</span>)}</div>
              {last && (last.errors as any[]).length > 0 && <div className="mt-1 text-xs text-destructive">Erreurs du dernier import : {(last.errors as any[]).map((e) => `${e.source_key ?? "?"} (${e.reason})`).join(" · ")}</div>}
            </div>
          );
        })}
      </section>

      <section className="card-modern p-5">
        <h2 className="mb-2 text-lg font-bold">Sources autorisées (lecture seule)</h2>
        <div className="space-y-2">
          {sources.map((s) => (
            <div key={s.id} className="tile p-3 text-sm">
              <div className="flex flex-wrap items-center gap-2"><span className="flex-1 font-bold">{s.label}</span><span className="text-xs text-muted-foreground">{s.url}</span>
                <Button size="sm" variant="outline" onClick={() => patchSource(s.id, { active: !s.active })}>{s.active ? "Suspendre" : "Réactiver"}</Button></div>
              <div className="mt-2 flex flex-wrap gap-1">{CATS.map((c) => {
                const on = s.categories.includes(c);
                return <button key={c} type="button" className={`rounded-full px-2 py-0.5 text-xs font-bold ${on ? "bg-primary text-primary-foreground" : "bg-muted"}`}
                  onClick={() => { const cats = on ? s.categories.filter((x) => x !== c) : [...s.categories, c]; patchSource(s.id, { categories: cats, child_categories: s.child_categories.filter((x) => cats.includes(x)) }); }}>{VEILLE_CATEGORIES[c].label}</button>;
              })}</div>
              <div className="mt-1 text-xs text-muted-foreground">Visible par {byId[s.member_id]?.first_name} : {s.child_categories.map((c) => VEILLE_CATEGORIES[c as VeilleCategory]?.label).join(", ") || "rien"}</div>
            </div>
          ))}
        </div>
        <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_1.5fr_10rem_auto]">
          <Input placeholder="Nom" value={nf.label} onChange={(e) => setNf({ ...nf, label: e.target.value })} />
          <Input placeholder="https://…" value={nf.url} onChange={(e) => setNf({ ...nf, url: e.target.value })} />
          <select className="rounded-md border bg-background px-2" value={nf.member_id} onChange={(e) => setNf({ ...nf, member_id: e.target.value })}>
            <option value="">Enfant…</option>{members.filter((m) => m.family_role !== "admin").map((m) => <option key={m.id} value={m.id}>{m.first_name}</option>)}
          </select>
          <Button onClick={addSource} disabled={!nf.member_id}>Autoriser</Button>
          <label className="flex items-center gap-2 text-xs sm:col-span-4"><input type="checkbox" checked={nf.consent} onChange={(e) => setNf({ ...nf, consent: e.target.checked })} /> J'autorise la lecture seule de ce domaine pour cet enfant.</label>
        </div>
      </section>

      <section className="card-modern p-5">
        <h2 className="mb-2 text-lg font-bold">Importer une collecte (JSON)</h2>
        {sources.length > 1 && <select className="mb-2 rounded-md border bg-background p-2" value={src?.id} onChange={(e) => setSourceId(e.target.value)}>{sources.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}</select>}
        {src && <p className="mb-2 text-xs text-muted-foreground">source_id : <code>{src.id}</code> · member_id : <code>{src.member_id}</code></p>}
        <input type="file" accept="application/json,.json" className="mb-2 block text-sm" onChange={async (e) => { const f = e.target.files?.[0]; if (f) setText(await f.text()); }} />
        <Textarea rows={8} placeholder='{"items": [ … ]}' value={text} onChange={(e) => { setText(e.target.value); setPreview(null); }} className="font-mono text-xs" />
        <div className="mt-2 flex gap-2">
          <Button variant="outline" disabled={busy || !text} onClick={() => run(true)}>Aperçu</Button>
          <Button disabled={busy || !preview || preview.invalid.length > 0 || preview.result?.rejected > 0 || preview.result?.applied} onClick={() => run(false)}>Importer</Button>
        </div>
        {preview && (
          <div className="mt-3 space-y-1 text-sm">
            <div className="font-bold">{preview.result?.applied ? "Enregistré" : "Aperçu"} : {preview.result?.created ?? 0} nouveau(x), {preview.result?.updated ?? 0} mis à jour, {preview.result?.unchanged ?? 0} identique(s), {preview.result?.duplicates ?? 0} doublon(s) possible(s), {(preview.result?.rejected ?? 0) + preview.invalid.length} refusé(s)</div>
            {preview.invalid.map((e: any) => <div key={e.index} className="text-destructive">Entrée n°{e.index + 1} : {e.reason}</div>)}
            {(preview.result?.items ?? []).map((i: any, k: number) => <div key={k} className={i.action === "refusé" ? "text-destructive" : ""}>• {i.title ?? i.source_key} — {i.action}{i.reason ? ` (${i.reason})` : ""}{i.possible_duplicate ? " · doublon possible" : ""}</div>)}
          </div>
        )}
      </section>

      <VeilleList title="Informations collectées" />
    </div>
  );
}
