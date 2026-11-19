import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { addDays, format, startOfWeek } from "date-fns";
import { fr } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useMe } from "@/hooks/use-me";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { guessCategory, SHOP_CATEGORIES } from "@/lib/meals";

export const Route = createFileRoute("/_authenticated/repas")({
  head: () => ({ meta: [{ title: "Repas & courses — Family OS" }, { name: "description", content: "Menu de la semaine et liste de courses." }] }),
  component: MealsPage,
});

const SLOTS = [
  { key: "petit_dej", label: "Petit-déj", icon: "🥐" },
  { key: "dejeuner", label: "Déjeuner", icon: "🍝" },
  { key: "gouter", label: "Goûter", icon: "🍪" },
  { key: "diner", label: "Dîner", icon: "🍲" },
];

function MealsPage() {
  const { data: me } = useMe();
  const qc = useQueryClient();
  const [week, setWeek] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const days = Array.from({ length: 7 }, (_, i) => addDays(week, i));
  const from = format(days[0]!, "yyyy-MM-dd");
  const to = format(days[6]!, "yyyy-MM-dd");
  const { data: meals = [] } = useQuery({ queryKey: ["meals", from], queryFn: async () => (await supabase.from("meals").select("*").gte("day", from).lte("day", to)).data ?? [] });
  const { data: items = [] } = useQuery({ queryKey: ["shopping"], queryFn: async () => (await supabase.from("shopping_items").select("*").order("created_at")).data ?? [] });
  const [edit, setEdit] = useState<{ day: string; slot: string; title: string; ingredients: string } | null>(null);
  const [newItem, setNewItem] = useState("");
  const [dayIdx, setDayIdx] = useState(() => (new Date().getDay() + 6) % 7);
  const refresh = () => { qc.invalidateQueries({ queryKey: ["meals"] }); qc.invalidateQueries({ queryKey: ["shopping"] }); };

  async function saveMeal() {
    if (!edit) return;
    const ingredients = edit.ingredients.split(/[\n,]/).map((x) => x.trim()).filter(Boolean).slice(0, 40);
    const { error } = edit.title.trim()
      ? await supabase.from("meals").upsert({ day: edit.day, slot: edit.slot, title: edit.title.trim().slice(0, 120), ingredients }, { onConflict: "day,slot" })
      : await supabase.from("meals").delete().eq("day", edit.day).eq("slot", edit.slot);
    if (error) toast.error(error.message); else { setEdit(null); refresh(); }
  }
  async function addItem(name: string) {
    const n = name.trim().slice(0, 80);
    if (!n) return;
    await supabase.from("shopping_items").insert({ name: n, category: guessCategory(n) });
  }
  async function generateList() {
    const existing = new Set(items.filter((i) => !i.done).map((i) => i.name.toLowerCase()));
    const all = [...new Set(meals.flatMap((m) => m.ingredients.map((x) => x.trim())))].filter((x) => x && !existing.has(x.toLowerCase()));
    if (!all.length) { toast.info("Aucun nouvel ingrédient à ajouter"); return; }
    await supabase.from("shopping_items").insert(all.map((n) => ({ name: n, category: guessCategory(n) })));
    toast.success(`${all.length} ingrédient(s) ajouté(s) à la liste`);
    refresh();
  }

  return (
    <div className="stagger mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="w-full text-3xl font-bold sm:w-auto sm:flex-1">Repas & <span className="text-gradient">courses</span></h1>
        <Button size="icon" variant="outline" aria-label="Semaine précédente" onClick={() => setWeek(addDays(week, -7))}><ChevronLeft /></Button>
        <span className="flex-1 text-center text-sm font-bold sm:flex-none">Semaine du {format(week, "dd/MM/yyyy")}</span>
        <Button size="icon" variant="outline" aria-label="Semaine suivante" onClick={() => setWeek(addDays(week, 7))}><ChevronRight /></Button>
      </div>

      <section className="space-y-3 md:hidden">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {days.map((d, i) => { const on = i === dayIdx; return (
            <button key={d.toISOString()} onClick={() => setDayIdx(i)} className={cn("flex w-14 shrink-0 flex-col items-center rounded-2xl py-2 font-extrabold transition", on ? "bg-primary text-primary-foreground shadow-soft" : "card-modern")}>
              <span className="text-[11px] capitalize">{format(d, "EEE", { locale: fr })}</span><span className="text-lg">{format(d, "dd")}</span>
            </button>); })}
        </div>
        {SLOTS.map((s) => {
          const day = format(days[dayIdx]!, "yyyy-MM-dd");
          const m = meals.find((x) => x.day === day && x.slot === s.key);
          return (
            <button key={s.key} disabled={!me?.isManager} onClick={() => setEdit({ day, slot: s.key, title: m?.title ?? "", ingredients: m?.ingredients.join(", ") ?? "" })} className="card-modern flex w-full items-center gap-3 p-4 text-left">
              <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-muted text-2xl">{s.icon}</span>
              <span className="min-w-0 flex-1">
                <span className="block text-xs font-bold text-muted-foreground">{s.label}</span>
                <span className={cn("block truncate font-bold", !m && "text-muted-foreground")}>{m ? m.title : me?.isManager ? "Ajouter un plat +" : "—"}</span>
                {m && m.ingredients.length > 0 && <span className="block truncate text-xs text-muted-foreground">{m.ingredients.join(", ")}</span>}
              </span>
            </button>
          );
        })}
      </section>

      <section className="card-modern hidden overflow-x-auto p-4 md:block">
        <div className="grid min-w-[760px] grid-cols-[6rem_repeat(7,minmax(0,1fr))] gap-2">
          <div />
          {days.map((d) => <div key={d.toISOString()} className={cn("rounded-2xl py-2 text-center text-xs font-extrabold capitalize", format(d, "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd") && "bg-primary text-primary-foreground")}>{format(d, "EEE dd/MM", { locale: fr })}</div>)}
          {SLOTS.map((s) => (
            <div key={s.key} className="contents">
              <div className="flex items-center gap-1 text-xs font-bold text-muted-foreground">{s.icon} {s.label}</div>
              {days.map((d) => {
                const day = format(d, "yyyy-MM-dd");
                const m = meals.find((x) => x.day === day && x.slot === s.key);
                return (
                  <button key={day + s.key} disabled={!me?.isManager} onClick={() => setEdit({ day, slot: s.key, title: m?.title ?? "", ingredients: m?.ingredients.join(", ") ?? "" })}
                    className={cn("tile min-h-16 p-2 text-left text-xs font-semibold transition hover:-translate-y-0.5", !m && "border border-dashed border-border bg-transparent text-muted-foreground")}>
                    {m ? m.title : me?.isManager ? "+" : "—"}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </section>

      <section className="card-modern p-5">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <h2 className="w-full text-xl font-bold sm:w-auto sm:flex-1">🛒 Liste de courses <span className="text-sm text-muted-foreground">({items.filter((i) => !i.done).length})</span></h2>
          {me?.isManager && <Button variant="secondary" onClick={generateList}><Sparkles /> Depuis le menu</Button>}
          {me?.isManager && <Button variant="ghost" onClick={async () => { await supabase.from("shopping_items").delete().eq("done", true); refresh(); }}>Vider les cochés</Button>}
        </div>
        <form className="sticky top-16 z-10 mb-4 flex gap-2 md:static" onSubmit={async (e) => { e.preventDefault(); await addItem(newItem); setNewItem(""); refresh(); }}>
          <Input placeholder="Ajouter un article (ex. lait, pommes…)" value={newItem} onChange={(e) => setNewItem(e.target.value)} />
          <Button type="submit">Ajouter</Button>
        </form>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {SHOP_CATEGORIES.map((c) => {
            const list = items.filter((i) => i.category === c.name);
            if (!list.length) return null;
            return (
              <div key={c.name} className="tile p-4">
                <div className="mb-2 font-extrabold">{c.icon} {c.name}</div>
                {list.map((i) => (
                  <label key={i.id} className="flex cursor-pointer items-center gap-3 py-2 text-sm font-semibold">
                    <input type="checkbox" className="size-5 accent-primary" checked={i.done} onChange={async () => { await supabase.from("shopping_items").update({ done: !i.done }).eq("id", i.id); refresh(); }} />
                    <span className={cn(i.done && "text-muted-foreground line-through")}>{i.name}</span>
                  </label>
                ))}
              </div>
            );
          })}
        </div>
        {!items.length && <p className="text-sm text-muted-foreground">La liste est vide.</p>}
      </section>

      <Dialog open={!!edit} onOpenChange={(o) => !o && setEdit(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{edit && `${SLOTS.find((s) => s.key === edit.slot)?.label} · ${format(new Date(edit.day), "dd/MM/yyyy")}`}</DialogTitle></DialogHeader>
          {edit && <>
            <div><Label>Plat / recette</Label><Input value={edit.title} maxLength={120} onChange={(e) => setEdit({ ...edit, title: e.target.value })} placeholder="Laisser vide pour supprimer" /></div>
            <div><Label>Ingrédients (séparés par des virgules)</Label><Textarea value={edit.ingredients} onChange={(e) => setEdit({ ...edit, ingredients: e.target.value })} placeholder="pâtes, tomates, basilic" /></div>
            <Button onClick={saveMeal}>Enregistrer</Button>
          </>}
        </DialogContent>
      </Dialog>
    </div>
  );
}
