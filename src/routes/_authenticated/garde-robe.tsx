import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { membersQuery, useMe } from "@/hooks/use-me";
import { Avatar } from "@/components/family/AppShell";
import { ageFrom, fmtDate } from "@/lib/family";
import { shoppingBudget, sizesAreStale } from "@/lib/wardrobe";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/garde-robe")({
  head: () => ({ meta: [{ title: "Garde-robe & tailles — Family OS" }, { name: "description", content: "Tailles des enfants, vêtements à renouveler et affaires à transmettre." }] }),
  component: WardrobePage,
});

const SIZE_FIELDS = [
  { key: "height_cm", label: "Taille (cm)", icon: "📏" },
  { key: "top", label: "Hauts", icon: "👕" },
  { key: "bottom", label: "Bas", icon: "👖" },
  { key: "shoes", label: "Pointure", icon: "👟" },
  { key: "pajamas", label: "Pyjamas", icon: "🌙" },
] as const;
const CATS = ["Hauts", "Bas", "Chaussures", "Manteaux", "Pyjamas", "Sous-vêtements", "Accessoires"];
const SEASONS = ["Toutes", "Été", "Hiver", "Mi-saison", "Rentrée"];
const PRIO = [{ k: "urgent", l: "🔴 Urgent" }, { k: "normal", l: "🟡 Prochaine saison" }, { k: "option", l: "⚪ Optionnel" }];
const CONDS = ["Comme neuf", "Très bon état", "Bon état", "Usé"];
const SEASON_CHECK = ["Laver et trier les vêtements trop petits", "Ranger dans des cartons étiquetés par taille", "Sortir les affaires de la saison", "Essayer les chaussures de chacun", "Donner ou vendre ce qui ne sert plus"];

function WardrobePage() {
  const { data: me } = useMe();
  const qc = useQueryClient();
  const { data: members = [] } = useQuery(membersQuery);
  const kids = members.filter((m) => m.family_role !== "admin");
  const [sel, setSel] = useState<string | null>(null);
  const current = kids.find((k) => k.id === sel) ?? (me?.isManager ? kids[0] : kids.find((k) => k.id === me?.member?.id));
  const { data: sizes } = useQuery({
    queryKey: ["sizes", current?.id], enabled: !!current,
    queryFn: async () => (await supabase.from("clothing_sizes").select("*").eq("member_id", current!.id).maybeSingle()).data,
  });
  const { data: items = [] } = useQuery({
    queryKey: ["clothes"],
    queryFn: async () => (await supabase.from("clothing_items").select("*").order("created_at", { ascending: false })).data ?? [],
  });
  const [form, setForm] = useState<Record<string, string>>({});
  useEffect(() => { setForm(Object.fromEntries(SIZE_FIELDS.map((f) => [f.key, String(sizes?.[f.key] ?? "")]))); }, [sizes, current?.id]);
  const [need, setNeed] = useState({ title: "", category: "Hauts", season: "Toutes", priority: "normal", price: "", quantity: "1" });
  const [give, setGive] = useState({ title: "", size: "", condition: "Très bon état", location: "", to: "" });
  const [checks, setChecks] = useState<number[]>([]);
  if (!current) return <p>Aucun enfant.</p>;
  const mgr = !!me?.isManager;
  const refresh = () => qc.invalidateQueries({ queryKey: ["clothes"] });
  const needs = items.filter((i) => i.kind === "besoin" && i.member_id === current.id);
  const gifts = items.filter((i) => i.kind === "transmettre" && (i.member_id === current.id || i.to_member_id === current.id));
  const allNeeds = items.filter((i) => i.kind === "besoin");
  const name = (id: string | null) => members.find((m) => m.id === id)?.first_name ?? "—";

  async function saveSizes() {
    const v = (k: string) => form[k]?.trim() || null;
    const { error } = await supabase.from("clothing_sizes").upsert({ member_id: current!.id, height_cm: v("height_cm") ? Number(v("height_cm")) : null, top: v("top"), bottom: v("bottom"), shoes: v("shoes"), pajamas: v("pajamas"), updated_at: new Date().toISOString() });
    if (error) toast.error(error.message); else { toast.success("Tailles enregistrées"); qc.invalidateQueries({ queryKey: ["sizes"] }); }
  }
  async function addNeed() {
    if (!need.title.trim()) return;
    const { error } = await supabase.from("clothing_items").insert({ kind: "besoin", member_id: current!.id, title: need.title.trim().slice(0, 120), category: need.category, season: need.season, priority: need.priority, price: need.price ? Number(need.price) : null, quantity: Math.max(1, Number(need.quantity) || 1), size: sizes?.[need.category === "Chaussures" ? "shoes" : need.category === "Bas" ? "bottom" : "top"] ?? null });
    if (error) toast.error(error.message); else { setNeed({ ...need, title: "", price: "" }); refresh(); }
  }
  async function addGive() {
    if (!give.title.trim()) return;
    const { error } = await supabase.from("clothing_items").insert({ kind: "transmettre", member_id: current!.id, to_member_id: give.to || null, title: give.title.trim().slice(0, 120), size: give.size || null, condition: give.condition, location: give.location || null });
    if (error) toast.error(error.message); else { setGive({ ...give, title: "", size: "" }); refresh(); }
  }
  const toggle = async (id: string, done: boolean) => { await supabase.from("clothing_items").update({ done }).eq("id", id); refresh(); };
  const del = async (id: string) => { await supabase.from("clothing_items").delete().eq("id", id); refresh(); };
  const stale = sizesAreStale(sizes?.updated_at);

  return (
    <div className="stagger mx-auto max-w-6xl space-y-6">
      <h1 className="text-3xl font-bold">Garde-robe & <span className="text-gradient">tailles</span> 👕</h1>
      {mgr && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {kids.map((k) => (
            <button key={k.id} onClick={() => setSel(k.id)} className={cn("card-modern flex shrink-0 items-center gap-2 px-4 py-2 font-bold transition", current.id === k.id ? "ring-2 ring-primary" : "opacity-70 hover:opacity-100")}>
              <Avatar m={k} size={30} /> {k.first_name}
            </button>
          ))}
        </div>
      )}
      {mgr && (
        <div className="grid grid-cols-3 gap-2 sm:gap-4">
          <div className="card-modern p-3 sm:p-4"><p className="text-[11px] font-bold leading-tight text-muted-foreground sm:text-xs">Budget réassort (famille)</p><p className="text-lg font-bold sm:text-2xl">{shoppingBudget(allNeeds).toLocaleString("fr-FR", { style: "currency", currency: "EUR" })}</p></div>
          <div className="card-modern p-3 sm:p-4"><p className="text-[11px] font-bold leading-tight text-muted-foreground sm:text-xs">Achats urgents</p><p className="text-lg font-bold sm:text-2xl">{allNeeds.filter((i) => !i.done && i.priority === "urgent").length}</p></div>
          <div className="card-modern p-3 sm:p-4"><p className="text-[11px] font-bold leading-tight text-muted-foreground sm:text-xs">Affaires à transmettre</p><p className="text-lg font-bold sm:text-2xl">{items.filter((i) => i.kind === "transmettre" && !i.done).length}</p></div>
        </div>
      )}
      <div className="grid gap-4 lg:grid-cols-3">
        <section className={cn("card-modern card-hover p-5", stale && "ring-2 ring-star/60")}>
          <h2 className="mb-1 text-lg font-bold">📐 Tailles de {current.first_name}</h2>
          <p className="mb-3 text-xs font-semibold text-muted-foreground">{ageFrom(current.birth_date)} ans · {sizes?.updated_at ? `mesuré le ${fmtDate(sizes.updated_at.slice(0, 10))}` : "jamais mesuré"}</p>
          {stale && <div role="alert" className="mb-3 rounded-2xl border border-accent bg-accent/30 p-3 text-sm font-semibold">⏰ {sizes?.updated_at ? `Les tailles de ${current.first_name} n'ont pas été mises à jour depuis plus de 6 mois.` : `Les tailles de ${current.first_name} n'ont encore jamais été enregistrées.`} Pensez à les mesurer.</div>}
          <div className="space-y-2">
            {SIZE_FIELDS.map((f) => (
              <label key={f.key} className="tile flex items-center gap-2 p-2 text-sm font-semibold">
                <span className="w-28 shrink-0">{f.icon} {f.label}</span>
                <Input disabled={!mgr} value={form[f.key] ?? ""} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })} placeholder={f.key === "shoes" ? "31" : f.key === "height_cm" ? "128" : "8 ans"} />
              </label>
            ))}
          </div>
          {mgr && <Button className="mt-3 w-full" onClick={saveSizes}>Enregistrer les tailles</Button>}
        </section>

        <section className="card-modern card-hover p-5 lg:col-span-2">
          <h2 className="mb-3 text-lg font-bold">🛍️ À renouveler</h2>
          <ul className="mb-3 space-y-2">
            {needs.length === 0 && <li className="text-sm text-muted-foreground">Rien à acheter pour l'instant.</li>}
            {needs.map((i) => (
              <li key={i.id} className={cn("tile flex items-center gap-3 p-2.5 text-sm", i.done && "opacity-50")}>
                <input type="checkbox" className="size-4 accent-primary" checked={i.done} disabled={!mgr} onChange={(e) => toggle(i.id, e.target.checked)} aria-label="Acheté" />
                <span className="min-w-0 flex-1 font-semibold"><span className={cn(i.done && "line-through")}>{i.quantity > 1 && `${i.quantity}× `}{i.title}</span>
                  <span className="block text-xs text-muted-foreground">{i.category}{i.size && ` · taille ${i.size}`} · {i.season} · {PRIO.find((p) => p.k === i.priority)?.l}</span></span>
                {i.price != null && <span className="shrink-0 font-bold">{Number(i.price).toLocaleString("fr-FR", { style: "currency", currency: "EUR" })}</span>}
                {mgr && <button className="text-xs text-destructive" onClick={() => del(i.id)} aria-label="Supprimer">✕</button>}
              </li>
            ))}
          </ul>
          {mgr && (
            <form className="grid gap-2 sm:grid-cols-3" onSubmit={(e) => { e.preventDefault(); addNeed(); }}>
              <Input className="sm:col-span-3" placeholder="Manteau d'hiver" value={need.title} onChange={(e) => setNeed({ ...need, title: e.target.value })} />
              <select className="rounded-md border bg-background px-2 text-sm" value={need.category} onChange={(e) => setNeed({ ...need, category: e.target.value })}>{CATS.map((c) => <option key={c}>{c}</option>)}</select>
              <select className="rounded-md border bg-background px-2 text-sm" value={need.season} onChange={(e) => setNeed({ ...need, season: e.target.value })}>{SEASONS.map((c) => <option key={c}>{c}</option>)}</select>
              <select className="rounded-md border bg-background px-2 text-sm" value={need.priority} onChange={(e) => setNeed({ ...need, priority: e.target.value })}>{PRIO.map((p) => <option key={p.k} value={p.k}>{p.l}</option>)}</select>
              <div className="flex gap-2"><Input type="number" min="0" placeholder="€" value={need.price} onChange={(e) => setNeed({ ...need, price: e.target.value })} /><Button type="submit">+</Button></div>
            </form>
          )}
        </section>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <section className="card-modern card-hover p-5 lg:col-span-2">
          <h2 className="mb-3 text-lg font-bold">🔁 À transmettre entre enfants</h2>
          <ul className="mb-3 space-y-2">
            {gifts.length === 0 && <li className="text-sm text-muted-foreground">Aucune affaire en attente.</li>}
            {gifts.map((i) => (
              <li key={i.id} className={cn("tile flex items-center gap-3 p-2.5 text-sm", i.done && "opacity-50")}>
                <input type="checkbox" className="size-4 accent-primary" checked={i.done} disabled={!mgr} onChange={(e) => toggle(i.id, e.target.checked)} aria-label="Transmis" />
                <span className="min-w-0 flex-1 font-semibold">{i.title}{i.size && ` (${i.size})`}
                  <span className="block text-xs text-muted-foreground">{name(i.member_id)} ➜ {name(i.to_member_id)} · {i.condition}{i.location && ` · 📦 ${i.location}`}</span></span>
                {mgr && <button className="text-xs text-destructive" onClick={() => del(i.id)} aria-label="Supprimer">✕</button>}
              </li>
            ))}
          </ul>
          {mgr && (
            <form className="grid gap-2 sm:grid-cols-3" onSubmit={(e) => { e.preventDefault(); addGive(); }}>
              <Input className="sm:col-span-3" placeholder="Doudoune bleue" value={give.title} onChange={(e) => setGive({ ...give, title: e.target.value })} />
              <Input placeholder="Taille" value={give.size} onChange={(e) => setGive({ ...give, size: e.target.value })} />
              <select className="rounded-md border bg-background px-2 text-sm" value={give.to} onChange={(e) => setGive({ ...give, to: e.target.value })} aria-label="Pour qui">
                <option value="">Pour…</option>{kids.filter((k) => k.id !== current.id).map((k) => <option key={k.id} value={k.id}>{k.first_name}</option>)}
              </select>
              <select className="rounded-md border bg-background px-2 text-sm" value={give.condition} onChange={(e) => setGive({ ...give, condition: e.target.value })}>{CONDS.map((c) => <option key={c}>{c}</option>)}</select>
              <div className="flex gap-2"><Input placeholder="Carton…" value={give.location} onChange={(e) => setGive({ ...give, location: e.target.value })} /><Button type="submit">+</Button></div>
            </form>
          )}
        </section>
        <section className="card-modern card-hover p-5">
          <h2 className="mb-3 text-lg font-bold">🍂 Grand tri de saison</h2>
          <ul className="space-y-2">
            {SEASON_CHECK.map((t, i) => (
              <li key={t}><label className="tile flex items-center gap-2 p-2.5 text-sm font-semibold">
                <input type="checkbox" className="size-4 accent-primary" checked={checks.includes(i)} onChange={() => setChecks(checks.includes(i) ? checks.filter((x) => x !== i) : [...checks, i])} />
                <span className={cn(checks.includes(i) && "line-through opacity-60")}>{t}</span></label></li>
            ))}
          </ul>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted"><div className="h-full bg-primary transition-all" style={{ width: `${(checks.length / SEASON_CHECK.length) * 100}%` }} /></div>
        </section>
      </div>
    </div>
  );
}
