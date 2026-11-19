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

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <h1 className="text-3xl font-bold">Récompenses</h1>
      {!me?.isManager && mine && <div className="rounded-3xl bg-star/30 p-5 text-2xl font-extrabold text-star-foreground">⭐ {mine.points} points</div>}
      <section className="card-modern p-5">
        <h2 className="mb-3 text-lg font-bold">🎁 Catalogue</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {rewards.map((r) => (
            <div key={r.id} className="flex items-center gap-3 rounded-2xl bg-muted p-4">
              <span className="text-3xl">{r.icon}</span>
              <div className="flex-1"><div className="font-bold">{r.title}</div><div className="text-sm font-semibold text-star-foreground">⭐ {r.cost}</div></div>
              {me?.isManager ? <button className="text-xs text-destructive" onClick={async () => { await supabase.from("rewards").delete().eq("id", r.id); refresh(); }}>Suppr.</button>
                : <Button size="sm" disabled={!mine || mine.points < r.cost} onClick={async () => { const { error } = await supabase.from("reward_claims").insert({ reward_id: r.id, member_id: mine!.id }); if (error) toast.error(error.message); else { toast.success("Demande envoyée 🎁"); refresh(); } }}>Demander</Button>}
            </div>
          ))}
        </div>
        {me?.isManager && (
          <div className="mt-4 flex flex-wrap gap-2">
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
            <div key={c.id} className="flex items-center gap-3 tile p-3">
              {byId[c.member_id] && <Avatar m={byId[c.member_id]} size={30} />}
              <span className="flex-1 font-semibold">{rById[c.reward_id]?.icon} {rById[c.reward_id]?.title} <span className="text-xs text-muted-foreground">· {fmtDate(c.created_at)}</span></span>
              {c.status === "demandee" && me?.isManager ? (
                <><Button size="sm" onClick={() => decide.mutate({ id: c.id, status: "approuvee" })}>Accorder</Button><Button size="sm" variant="outline" onClick={() => decide.mutate({ id: c.id, status: "refusee" })}>Refuser</Button></>
              ) : <span className="text-sm font-bold">{c.status === "demandee" ? "⏳ En attente" : c.status === "approuvee" ? "✅ Accordée" : "✖ Refusée"}</span>}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
