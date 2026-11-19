import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { membersQuery, useMe } from "@/hooks/use-me";
import { Avatar } from "@/components/family/AppShell";
import { fmtDate } from "@/lib/family";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/recompenses")({
  head: () => ({ meta: [{ title: "Récompenses — Family OS" }, { name: "description", content: "Points, étoiles et récompenses." }] }),
  component: RewardsPage,
});

function RewardsPage() {
  const { data: me } = useMe();
  const qc = useQueryClient();
  const { data: members = [] } = useQuery(membersQuery);
  const { data: rewards = [] } = useQuery({ queryKey: ["rewards"], queryFn: async () => (await supabase.from("rewards").select("*").order("cost")).data ?? [] });
  const { data: claims = [] } = useQuery({ queryKey: ["claims"], queryFn: async () => (await supabase.from("reward_claims").select("*").order("created_at", { ascending: false })).data ?? [] });
  const byId = Object.fromEntries(members.map((m) => [m.id, m]));
  const rById = Object.fromEntries(rewards.map((r) => [r.id, r]));
  const [n, setN] = useState({ title: "", icon: "🎁", cost: 50 });
  const refresh = () => ["rewards", "claims", "members", "me"].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
  const add = useMutation({
    mutationFn: async () => { if (!n.title.trim()) throw new Error("Titre requis"); const { error } = await supabase.from("rewards").insert({ ...n, title: n.title.trim() }); if (error) throw error; },
    onSuccess: () => { setN({ title: "", icon: "🎁", cost: 50 }); refresh(); }, onError: (e) => toast.error(e.message),
  });
  const decide = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => { const { error } = await supabase.from("reward_claims").update({ status }).eq("id", id); if (error) throw error; },
    onSuccess: refresh, onError: (e) => toast.error(e.message),
  });
  const mine = me?.member;
  const [tab, setTab] = useState("tous");
  const pts = mine?.points ?? 0;
  const level = Math.floor(pts / 100) + 1;
  const kids = members.filter((m) => m.family_role !== "admin" && m.family_role !== "adulte");
  const pending = claims.filter((c) => c.status === "demandee").length;
  const shown = rewards.filter((r) => tab === "tous" || (tab === "ok" ? r.cost <= pts : r.cost > pts));

  return (
    <div className="stagger mx-auto max-w-5xl space-y-6">
      <div className="flex items-center gap-3">
        <h1 className="flex-1 text-3xl font-extrabold">Récompenses</h1>
        {!me?.isManager && <span className="rounded-full bg-card px-4 py-2 font-extrabold shadow-soft">⭐ {pts}</span>}
      </div>

      <section className="relative overflow-hidden rounded-[2rem] p-6 shadow-soft" style={{ background: "linear-gradient(135deg, color-mix(in oklab, var(--primary) 45%, var(--card)), color-mix(in oklab, var(--accent) 35%, var(--card)))" }}>
        <div className="relative z-10 max-w-[65%]">
          {me?.isManager ? <>
            <p className="text-sm font-bold opacity-80">Demandes en attente</p>
            <div className="text-5xl font-extrabold">{pending} <span className="text-3xl">🎁</span></div>
            <p className="mt-1 text-sm font-semibold opacity-80">{rewards.length} récompense(s) au catalogue</p>
          </> : <>
            <p className="text-sm font-bold opacity-80">Tu as</p>
            <div className="text-6xl font-extrabold leading-none">{pts} <span className="text-4xl">⭐</span></div>
            <p className="mt-1 font-bold opacity-80">Étoiles</p>
          </>}
        </div>
        <div aria-hidden className="float-slow absolute -right-2 top-1/2 -translate-y-1/2 text-[7rem] drop-shadow-xl sm:right-6 sm:text-[9rem]">🎁</div>
        <div aria-hidden className="absolute right-28 top-4 text-2xl">✨</div>
      </section>

      {!me?.isManager && mine && (
        <section className="card-modern flex items-center gap-4 p-5">
          <div className="min-w-0 flex-1">
            <div className="text-sm font-extrabold text-primary">Niveau {level}</div>
            <div className="font-bold">{level < 3 ? "Petit explorateur" : level < 6 ? "Super champion" : "Légende de la maison"}</div>
            <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-gradient-to-r from-primary to-accent transition-all" style={{ width: `${pts % 100}%` }} /></div>
            <div className="mt-1 text-xs font-semibold text-muted-foreground">{pts % 100} / 100 vers le niveau {level + 1}</div>
          </div>
          <span className="text-5xl">🏆</span>
        </section>
      )}
      {me?.isManager && kids.length > 0 && (
        <section className="flex gap-3 overflow-x-auto pb-1">
          {kids.map((k) => <div key={k.id} className="card-modern flex shrink-0 items-center gap-2 px-4 py-3"><Avatar m={k} size={34} /><div><div className="text-sm font-bold">{k.first_name}</div><div className="text-xs font-extrabold text-star-foreground">⭐ {k.points}</div></div></div>)}
        </section>
      )}

      <section className="space-y-4">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {[["tous", "Toutes"], ["ok", "Je peux l'avoir"], ["bientot", "Bientôt"]].filter(([k]) => !me?.isManager || k === "tous").map(([k, l]) => (
            <button key={k} onClick={() => setTab(k!)} className={cn("shrink-0 rounded-full px-4 py-1.5 text-sm font-bold transition", tab === k ? "bg-primary text-primary-foreground shadow-soft" : "card-modern")}>{l}</button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {shown.map((r) => {
            const can = !!mine && pts >= r.cost;
            return (
              <div key={r.id} className="card-modern card-hover flex flex-col items-center p-4 text-center">
                <div className="mb-2 flex size-20 items-center justify-center rounded-3xl bg-muted text-5xl">{r.icon}</div>
                <div className="line-clamp-2 min-h-10 text-sm font-bold">{r.title}</div>
                <div className="mt-1 font-extrabold text-star-foreground">⭐ {r.cost}</div>
                {me?.isManager ? <button className="mt-2 text-xs font-bold text-destructive" onClick={async () => { await supabase.from("rewards").delete().eq("id", r.id); refresh(); }}>Supprimer</button>
                  : <>
                    {!can && <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted"><div className="h-full bg-star" style={{ width: `${Math.min(100, (pts / r.cost) * 100)}%` }} /></div>}
                    <Button size="sm" className="mt-2 w-full rounded-full" disabled={!can} onClick={async () => { const { error } = await supabase.from("reward_claims").insert({ reward_id: r.id, member_id: mine!.id }); if (error) toast.error(error.message); else { toast.success("Demande envoyée 🎁"); refresh(); } }}>{can ? "Demander" : `Encore ${r.cost - pts}`}</Button>
                  </>}
              </div>
            );
          })}
        </div>
        {!shown.length && <p className="text-sm text-muted-foreground">Aucune récompense ici.</p>}
        {me?.isManager && (
          <div className="card-modern flex flex-wrap gap-2 p-4">
            <Input className="w-16" value={n.icon} maxLength={4} onChange={(e) => setN({ ...n, icon: e.target.value })} />
            <Input className="min-w-40 flex-1" placeholder="Nouvelle récompense" maxLength={80} value={n.title} onChange={(e) => setN({ ...n, title: e.target.value })} />
            <Input className="w-24" type="number" min={1} value={n.cost} onChange={(e) => setN({ ...n, cost: Number(e.target.value) })} />
            <Button onClick={() => add.mutate()}>Ajouter</Button>
          </div>
        )}
      </section>

      <section className="card-modern p-5">
        <h2 className="mb-3 text-lg font-bold">📜 {me?.isManager ? "Demandes & historique" : "Mon historique"}</h2>
        {!claims.length && <p className="text-sm text-muted-foreground">Aucune demande.</p>}
        <div className="space-y-2">
          {claims.map((c) => (
            <div key={c.id} className="tile flex flex-wrap items-center gap-3 p-3">
              {byId[c.member_id] && <Avatar m={byId[c.member_id]} size={30} />}
              <span className="min-w-0 flex-1 font-semibold">{rById[c.reward_id]?.icon} {rById[c.reward_id]?.title} <span className="text-xs text-muted-foreground">· {fmtDate(c.created_at)}</span></span>
              {c.status === "demandee" && me?.isManager ? (
                <div className="flex gap-2"><Button size="sm" onClick={() => decide.mutate({ id: c.id, status: "approuvee" })}>Accorder</Button><Button size="sm" variant="outline" onClick={() => decide.mutate({ id: c.id, status: "refusee" })}>Refuser</Button></div>
              ) : <span className="text-sm font-bold">{c.status === "demandee" ? "⏳ En attente" : c.status === "approuvee" ? "✅ Accordée" : "✖ Refusée"}</span>}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
