import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { addMonths, format } from "date-fns";
import { fr } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { membersQuery, useMe } from "@/hooks/use-me";
import { fmtDate } from "@/lib/family";
import { BUDGET_CATEGORIES, eur, summarize } from "@/lib/budget";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar } from "@/components/family/AppShell";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/budget")({
  head: () => ({ meta: [{ title: "Budget familial — EL MEKKAOUI" }, { name: "description", content: "Revenus, dépenses et suivi du budget." }] }),
  component: BudgetPage,
});

function BudgetPage() {
  const { data: me } = useMe();
  const qc = useQueryClient();
  const { data: members = [] } = useQuery(membersQuery);
  const [month, setMonth] = useState(new Date());
  const key = format(month, "yyyy-MM");
  const { data } = useQuery({
    queryKey: ["budget", key],
    enabled: !!me?.isManager,
    queryFn: async () => {
      const [tx, b] = await Promise.all([
        supabase.from("transactions").select("*").gte("day", `${key}-01`).lt("day", format(addMonths(month, 1), "yyyy-MM-01")).order("day", { ascending: false }),
        supabase.from("budgets").select("*").eq("month", key).maybeSingle(),
      ]);
      return { tx: tx.data ?? [], budget: Number(b.data?.amount ?? 0) };
    },
  });
  const [f, setF] = useState({ kind: "depense", category: "courses", label: "", amount: "", member_id: "famille" });
  if (!me?.isManager) return <p>Accès réservé aux adultes.</p>;
  const tx = data?.tx ?? [];
  const s = summarize(tx.map((t) => ({ ...t, amount: Number(t.amount) })));
  const budget = data?.budget ?? 0;
  const pct = budget ? Math.min(100, (s.expenses / budget) * 100) : 0;
  const maxCat = Math.max(1, ...Object.values(s.byCategory));
  const refresh = () => qc.invalidateQueries({ queryKey: ["budget"] });

  async function add(e: React.FormEvent) {
    e.preventDefault();
    const amount = Number(f.amount.replace(",", "."));
    if (!f.label.trim() || !(amount > 0)) { toast.error("Libellé et montant requis"); return; }
    const { error } = await supabase.from("transactions").insert({ kind: f.kind, category: f.kind === "revenu" ? "revenu" : f.category, label: f.label.trim().slice(0, 120), amount, day: format(new Date(), "yyyy-MM-dd"), member_id: f.member_id === "famille" ? null : f.member_id });
    if (error) toast.error(error.message); else { setF({ ...f, label: "", amount: "" }); refresh(); }
  }

  return (
    <div className="stagger mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="flex-1 text-3xl font-bold">Budget <span className="text-gradient">familial</span></h1>
        <Button size="icon" variant="outline" aria-label="Mois précédent" onClick={() => setMonth(addMonths(month, -1))}><ChevronLeft /></Button>
        <span className="min-w-32 text-center font-bold capitalize">{format(month, "MMMM yyyy", { locale: fr })}</span>
        <Button size="icon" variant="outline" aria-label="Mois suivant" onClick={() => setMonth(addMonths(month, 1))}><ChevronRight /></Button>
      </div>

      <div className="stagger grid gap-4 md:grid-cols-3">
        <Stat label="Revenus" value={eur(s.income)} tone="text-success" />
        <Stat label="Dépenses" value={eur(s.expenses)} tone="text-destructive" />
        <Stat label="Solde" value={eur(s.income - s.expenses)} tone={s.income - s.expenses >= 0 ? "text-success" : "text-destructive"} />
      </div>

      <section className="card-modern p-5">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <h2 className="flex-1 text-lg font-bold">🎯 Budget du mois</h2>
          <Input key={key + budget} className="w-36" type="number" min={0} defaultValue={budget || ""} placeholder="Montant €" aria-label="Budget mensuel"
            onBlur={async (e) => { const v = Number(e.target.value); if (v >= 0) { await supabase.from("budgets").upsert({ month: key, amount: v }); refresh(); } }} />
        </div>
        <div className="h-4 overflow-hidden rounded-full bg-muted"><div className={cn("h-full rounded-full transition-all duration-700", pct > 90 ? "bg-destructive" : "bg-primary")} style={{ width: `${pct}%` }} /></div>
        <p className="mt-2 text-sm font-semibold text-muted-foreground">{budget ? `${eur(s.expenses)} dépensés sur ${eur(budget)} — reste ${eur(Math.max(0, budget - s.expenses))}` : "Définissez un budget mensuel."}</p>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card-modern p-5">
          <h2 className="mb-4 text-lg font-bold">📊 Par catégorie</h2>
          <div className="space-y-3">
            {BUDGET_CATEGORIES.map((c) => (
              <div key={c.key}>
                <div className="mb-1 flex justify-between text-sm font-bold"><span>{c.icon} {c.label}</span><span>{eur(s.byCategory[c.key] ?? 0)}</span></div>
                <div className="h-2.5 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-accent transition-all duration-700" style={{ width: `${((s.byCategory[c.key] ?? 0) / maxCat) * 100}%` }} /></div>
              </div>
            ))}
          </div>
        </section>
        <section className="card-modern p-5">
          <h2 className="mb-4 text-lg font-bold">👧 Par enfant</h2>
          <div className="space-y-2">
            {members.filter((m) => m.family_role !== "admin").map((m) => (
              <div key={m.id} className="tile flex items-center gap-3 p-3"><Avatar m={m} size={32} /><span className="flex-1 font-semibold">{m.first_name}</span><span className="font-extrabold">{eur(s.byMember[m.id] ?? 0)}</span></div>
            ))}
          </div>
        </section>
      </div>

      <section className="card-modern p-5">
        <h2 className="mb-3 text-lg font-bold">➕ Nouvelle opération</h2>
        <form onSubmit={add} className="grid gap-2 sm:grid-cols-[8rem_10rem_1fr_7rem_10rem_auto]">
          <Select value={f.kind} onValueChange={(v) => setF({ ...f, kind: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="depense">Dépense</SelectItem><SelectItem value="revenu">Revenu</SelectItem></SelectContent></Select>
          <Select value={f.category} onValueChange={(v) => setF({ ...f, category: v })} disabled={f.kind === "revenu"}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{BUDGET_CATEGORIES.map((c) => <SelectItem key={c.key} value={c.key}>{c.icon} {c.label}</SelectItem>)}</SelectContent></Select>
          <Input placeholder="Libellé" value={f.label} onChange={(e) => setF({ ...f, label: e.target.value })} />
          <Input placeholder="€" inputMode="decimal" value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} />
          <Select value={f.member_id} onValueChange={(v) => setF({ ...f, member_id: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="famille">Toute la famille</SelectItem>{members.map((m) => <SelectItem key={m.id} value={m.id}>{m.avatar} {m.first_name}</SelectItem>)}</SelectContent></Select>
          <Button type="submit">Ajouter</Button>
        </form>
        <div className="mt-4 space-y-2">
          {tx.map((t) => (
            <div key={t.id} className="tile flex items-center gap-3 p-3 text-sm">
              <span className="text-xl">{t.kind === "revenu" ? "💶" : BUDGET_CATEGORIES.find((c) => c.key === t.category)?.icon}</span>
              <span className="flex-1 font-semibold">{t.label} <span className="text-xs text-muted-foreground">· {fmtDate(t.day)}</span></span>
              <span className={cn("font-extrabold", t.kind === "revenu" ? "text-success" : "")}>{t.kind === "revenu" ? "+" : "−"}{eur(Number(t.amount))}</span>
              <button className="text-xs text-destructive" onClick={async () => { await supabase.from("transactions").delete().eq("id", t.id); refresh(); }}>Suppr.</button>
            </div>
          ))}
          {!tx.length && <p className="text-sm text-muted-foreground">Aucune opération ce mois-ci.</p>}
        </div>
      </section>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone: string }) {
  return <div className="card-modern card-hover p-5"><div className="text-sm font-bold text-muted-foreground">{label}</div><div className={cn("mt-1 text-3xl font-extrabold", tone)}>{value}</div></div>;
}
