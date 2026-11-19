import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { membersQuery, useMe } from "@/hooks/use-me";
import { Avatar } from "@/components/family/AppShell";
import { ageFrom, fmtDate } from "@/lib/family";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/sante")({
  head: () => ({ meta: [{ title: "Santé — EL MEKKAOUI" }, { name: "description", content: "Fiches médicales privées des enfants." }] }),
  component: HealthPage,
});

const KINDS = [
  { key: "medecin", label: "Médecins", icon: "👩‍⚕️", ph: "Dr Martin — pédiatre, 01 23 45 67 89" },
  { key: "allergie", label: "Allergies", icon: "⚠️", ph: "Arachides" },
  { key: "vaccin", label: "Vaccinations", icon: "💉", ph: "ROR — 2e dose" },
  { key: "traitement", label: "Traitements", icon: "💊", ph: "Ventoline si besoin" },
  { key: "urgence", label: "Contacts d'urgence", icon: "📞", ph: "Tante Samia — 06 12 34 56 78" },
  { key: "rdv", label: "Rendez-vous médicaux", icon: "🗓️", ph: "Dentiste" },
];

function HealthPage() {
  const { data: me } = useMe();
  const qc = useQueryClient();
  const { data: members = [] } = useQuery(membersQuery);
  const kids = members.filter((m) => m.family_role !== "admin");
  const [sel, setSel] = useState<string | null>(null);
  const current = kids.find((k) => k.id === sel) ?? kids[0];
  const { data: recs = [] } = useQuery({
    queryKey: ["health", current?.id],
    enabled: !!current && !!me?.isManager,
    queryFn: async () => (await supabase.from("health_records").select("*").eq("member_id", current!.id).order("created_at")).data ?? [],
  });
  const [draft, setDraft] = useState<Record<string, { title: string; day: string }>>({});
  if (!me?.isManager) return <p>Accès réservé aux adultes.</p>;
  if (!current) return null;

  async function add(kind: string) {
    const d = draft[kind];
    if (!d?.title.trim()) return;
    const { error } = await supabase.from("health_records").insert({ member_id: current!.id, kind, title: d.title.trim().slice(0, 200), day: d.day || null });
    if (error) toast.error(error.message);
    else { setDraft({ ...draft, [kind]: { title: "", day: "" } }); qc.invalidateQueries({ queryKey: ["health"] }); }
  }

  return (
    <div className="stagger mx-auto max-w-6xl space-y-6">
      <h1 className="text-3xl font-bold">Fiches <span className="text-gradient">santé</span> 🔒</h1>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {kids.map((k) => (
          <button key={k.id} onClick={() => setSel(k.id)} className={cn("card-modern flex shrink-0 items-center gap-2 px-4 py-2 font-bold transition", current.id === k.id ? "ring-2 ring-primary" : "opacity-70 hover:opacity-100")}>
            <Avatar m={k} size={30} /> {k.first_name}
          </button>
        ))}
      </div>
      <p className="text-sm font-semibold text-muted-foreground">{current.first_name} · {ageFrom(current.birth_date)} ans · né(e) le {fmtDate(current.birth_date)}</p>
      <div className="stagger grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {KINDS.map((k) => (
          <section key={k.key} className={cn("card-modern card-hover p-5", k.key === "allergie" && recs.some((r) => r.kind === "allergie") && "ring-2 ring-destructive/40")}>
            <h2 className="mb-3 text-lg font-bold">{k.icon} {k.label}</h2>
            <ul className="mb-3 space-y-2">
              {recs.filter((r) => r.kind === k.key).map((r) => (
                <li key={r.id} className="tile flex items-start gap-2 p-2.5 text-sm">
                  <span className="flex-1 font-semibold">{r.title}{r.day && <span className="block text-xs text-muted-foreground">{fmtDate(r.day)}</span>}</span>
                  <button className="text-xs text-destructive" onClick={async () => { await supabase.from("health_records").delete().eq("id", r.id); qc.invalidateQueries({ queryKey: ["health"] }); }}>✕</button>
                </li>
              ))}
            </ul>
            <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); add(k.key); }}>
              <Input placeholder={k.ph} value={draft[k.key]?.title ?? ""} onChange={(e) => setDraft({ ...draft, [k.key]: { title: e.target.value, day: draft[k.key]?.day ?? "" } })} />
              {(k.key === "vaccin" || k.key === "rdv") && <Input type="date" className="w-36" aria-label="Date" value={draft[k.key]?.day ?? ""} onChange={(e) => setDraft({ ...draft, [k.key]: { title: draft[k.key]?.title ?? "", day: e.target.value } })} />}
              <Button type="submit" size="sm">+</Button>
            </form>
          </section>
        ))}
      </div>
    </div>
  );
}
