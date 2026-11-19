import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { addDays, addMonths, endOfMonth, endOfWeek, format, isSameDay, isSameMonth, startOfMonth, startOfWeek } from "date-fns";
import { fr } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { membersQuery, useMe } from "@/hooks/use-me";
import { Avatar } from "@/components/family/AppShell";
import { VeilleList } from "@/components/family/VeilleList";
import { expandEvents, fmtTime, EVENT_CATEGORIES } from "@/lib/family";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/calendrier")({
  head: () => ({ meta: [{ title: "Calendrier familial — EL MEKKAOUI" }, { name: "description", content: "Rendez-vous, école, activités et anniversaires." }] }),
  component: CalendarPage,
});

type View = "mois" | "semaine" | "jour";

function CalendarPage() {
  const { data: me } = useMe();
  const { data: members = [] } = useQuery(membersQuery);
  const { data: events = [] } = useQuery({ queryKey: ["events"], queryFn: async () => (await supabase.from("events").select("*")).data ?? [] });
  const [view, setView] = useState<View>("semaine");
  const [cursor, setCursor] = useState(new Date());
  const [selected, setSelected] = useState(new Date());
  const byId = Object.fromEntries(members.map((m) => [m.id, m]));

  const range: [Date, Date] =
    view === "mois"
      ? [startOfWeek(startOfMonth(cursor), { weekStartsOn: 1 }), endOfWeek(endOfMonth(cursor), { weekStartsOn: 1 })]
      : view === "semaine"
        ? [startOfWeek(cursor, { weekStartsOn: 1 }), endOfWeek(cursor, { weekStartsOn: 1 })]
        : [new Date(cursor.toDateString()), new Date(new Date(cursor.toDateString()).getTime() + 864e5 - 1)];
  const occ = expandEvents(events, range[0], range[1]);
  const days: Date[] = [];
  for (let d = range[0]; d <= range[1]; d = addDays(d, 1)) days.push(d);
  const move = (n: number) => setCursor(view === "mois" ? addMonths(cursor, n) : addDays(cursor, view === "semaine" ? 7 * n : n));
  const title = view === "mois" ? format(cursor, "MMMM yyyy", { locale: fr }) : view === "semaine" ? `Semaine du ${format(range[0], "dd/MM/yyyy")}` : format(cursor, "EEEE dd/MM/yyyy", { locale: fr });
  const dayList = occ.filter((e) => isSameDay(e.occ, view === "mois" ? selected : cursor));

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex-1"><h1 className="text-2xl font-bold">Calendrier Familial</h1><p className="text-sm font-semibold capitalize text-muted-foreground">{title}</p></div>
        <Tabs value={view} onValueChange={(v) => setView(v as View)}>
          <TabsList><TabsTrigger value="jour">Jour</TabsTrigger><TabsTrigger value="semaine">Semaine</TabsTrigger><TabsTrigger value="mois">Mois</TabsTrigger></TabsList>
        </Tabs>
        <div className="flex gap-1">
          <Button size="icon" variant="outline" onClick={() => move(-1)} aria-label="Précédent"><ChevronLeft /></Button>
          <Button variant="outline" onClick={() => { setCursor(new Date()); setSelected(new Date()); }}>Aujourd'hui</Button>
          <Button size="icon" variant="outline" onClick={() => move(1)} aria-label="Suivant"><ChevronRight /></Button>
        </div>
        {me?.isManager && <NewEvent members={members} />}
      </div>

      {view === "mois" && (
        <div className="glass p-3">
          <div className="grid grid-cols-7 text-center text-xs font-bold text-muted-foreground">
            {["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"].map((d) => <div key={d} className="py-2">{d}</div>)}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {days.map((d) => {
              const evs = occ.filter((e) => isSameDay(e.occ, d));
              const who = [...new Set(evs.flatMap((e) => e.member_ids))];
              return (
                <button key={d.toISOString()} onClick={() => setSelected(d)} className={cn("flex min-h-20 flex-col items-center gap-1 rounded-2xl p-1.5 transition hover:bg-muted", !isSameMonth(d, cursor) && "opacity-40", isSameDay(d, selected) && "bg-secondary ring-2 ring-primary")}>
                  <span className={cn("flex size-9 items-center justify-center rounded-full bg-card text-sm font-bold shadow-sm transition", isSameDay(d, new Date()) && "bg-foreground text-background")}>{format(d, "d")}</span>
                  <div className="flex flex-wrap justify-center -space-x-1.5">
                    {who.slice(0, 4).map((id) => byId[id] && <Avatar key={id} m={byId[id]} size={20} />)}
                  </div>
                  {evs.length > 0 && <span className="hidden text-[10px] font-semibold text-muted-foreground sm:block">{evs.length} évén.</span>}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {view === "semaine" && (
        <>
          <div className="grid grid-cols-7 gap-1.5">
            {days.map((d) => {
              const evs = occ.filter((e) => isSameDay(e.occ, d));
              const sel = isSameDay(d, selected);
              return (
                <button key={d.toISOString()} onClick={() => setSelected(d)} className={cn("glass flex flex-col items-center rounded-2xl py-2 transition", sel && "fab scale-105 text-primary-foreground")}>
                  <span className="text-xs font-bold capitalize">{format(d, "EEE", { locale: fr }).replace(".", "")}</span>
                  <span className="text-xl font-extrabold">{format(d, "d")}</span>
                  <span className="flex h-2 gap-0.5">{evs.slice(0, 3).map((e, i) => <span key={i} className="size-1.5 rounded-full" style={{ background: sel ? "var(--primary-foreground)" : byId[e.member_ids[0] ?? ""]?.color ?? "var(--primary)" }} />)}</span>
                </button>
              );
            })}
          </div>
          <div className="space-y-3">
            {!occ.filter((e) => isSameDay(e.occ, selected)).length && <p className="glass p-4 text-sm text-muted-foreground">Aucun événement ce jour-là.</p>}
            {occ.filter((e) => isSameDay(e.occ, selected)).map((e) => {
              const m = byId[e.member_ids[0] ?? ""];
              const c = m?.color ?? "var(--primary)";
              return (
                <div key={e.id + e.occ.toISOString()} className="glass flex items-center gap-3 overflow-hidden p-0" style={{ background: `linear-gradient(90deg, color-mix(in oklab, ${c} 22%, var(--card)), var(--card) 45%)` }}>
                  <div className="w-16 shrink-0 py-4 pl-4 text-sm font-bold leading-tight">{e.all_day ? "Journée" : fmtTime(e.occ)}</div>
                  <span className="text-3xl">{EVENT_CATEGORIES[e.category]?.icon}</span>
                  <div className="min-w-0 flex-1 py-3">
                    <div className="truncate font-bold">{e.title}{m ? ` – ${m.first_name}` : ""}</div>
                    <span className="mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-bold" style={{ background: `color-mix(in oklab, ${c} 25%, transparent)` }}>{EVENT_CATEGORIES[e.category]?.label}</span>
                  </div>
                  {m && <div className="mr-4 rounded-full p-[3px]" style={{ background: c }}><Avatar m={m} size={44} /></div>}
                </div>
              );
            })}
          </div>
        </>
      )}

      {view !== "semaine" && <section className="glass p-5">
        <h2 className="mb-3 text-lg font-bold capitalize">{format(view === "mois" ? selected : cursor, "EEEE dd/MM/yyyy", { locale: fr })}</h2>
        {(!dayList.length ? <p className="text-sm text-muted-foreground">Aucun événement.</p> : <div className="grid gap-2 sm:grid-cols-2">{dayList.map((e) => <EventCard key={e.id + e.occ.toISOString()} e={e} byId={byId} canDelete={me?.isManager} />)}</div>)}
      </section>}

      <VeilleList onlyDated title="Échéances scolaires (veille)" />
    </div>
  );
}

function EventCard({ e, byId, canDelete }: { e: any; byId: Record<string, any>; canDelete?: boolean | undefined }) {
  const qc = useQueryClient();
  const color = byId[e.member_ids[0] ?? ""]?.color ?? "var(--primary)";
  return (
    <div className="rounded-2xl border-l-4 bg-muted p-3" style={{ borderColor: color }}>
      <div className="flex items-start gap-2">
        <span>{EVENT_CATEGORIES[e.category]?.icon}</span>
        <div className="flex-1">
          <div className="text-sm font-bold">{e.title}</div>
          <div className="text-xs text-muted-foreground">{e.all_day ? "Toute la journée" : fmtTime(e.occ)}{e.recurrence !== "aucune" && ` · ${e.recurrence}`}</div>
        </div>
        {canDelete && <button className="text-xs text-destructive" onClick={async () => { await supabase.from("events").delete().eq("id", e.id); qc.invalidateQueries({ queryKey: ["events"] }); }}>Suppr.</button>}
      </div>
      <div className="mt-2 flex -space-x-1.5">{e.member_ids.map((id: string) => byId[id] && <Avatar key={id} m={byId[id]} size={22} />)}</div>
    </div>
  );
}

function NewEvent({ members }: { members: { id: string; first_name: string; avatar: string; color: string }[] }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ title: "", category: "rdv", date: format(new Date(), "yyyy-MM-dd"), time: "09:00", all_day: false, recurrence: "aucune", member_ids: [] as string[] });
  const save = useMutation({
    mutationFn: async () => {
      if (!f.title.trim() || !f.member_ids.length) throw new Error("Titre et participants requis");
      const start = new Date(`${f.date}T${f.all_day ? "00:00" : f.time}:00`);
      const { error } = await supabase.from("events").insert({ title: f.title.trim(), category: f.category, start_at: start.toISOString(), all_day: f.all_day, recurrence: f.recurrence, member_ids: f.member_ids });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Événement ajouté"); setOpen(false); qc.invalidateQueries({ queryKey: ["events"] }); },
    onError: (e) => toast.error(e.message),
  });
  const all = f.member_ids.length === members.length;
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button><Plus /> Événement</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Nouvel événement</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Titre</Label><Input value={f.title} maxLength={120} onChange={(e) => setF({ ...f, title: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-2">
            <div><Label>Type</Label>
              <Select value={f.category} onValueChange={(v) => setF({ ...f, category: v })}><SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{Object.entries(EVENT_CATEGORIES).map(([k, c]) => <SelectItem key={k} value={k}>{c.icon} {c.label}</SelectItem>)}</SelectContent></Select></div>
            <div><Label>Répétition</Label>
              <Select value={f.recurrence} onValueChange={(v) => setF({ ...f, recurrence: v })}><SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{["aucune", "quotidienne", "hebdomadaire", "mensuelle", "annuelle"].map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent></Select></div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div><Label>Date</Label><Input type="date" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} /></div>
            <div><Label>Heure</Label><Input type="time" value={f.time} disabled={f.all_day} onChange={(e) => setF({ ...f, time: e.target.value })} /></div>
          </div>
          <label className="flex items-center gap-2 text-sm font-semibold"><Switch checked={f.all_day} onCheckedChange={(v) => setF({ ...f, all_day: v })} /> Toute la journée</label>
          <div>
            <div className="mb-1 flex items-center justify-between"><Label>Pour qui ?</Label><button className="text-xs font-bold text-primary" onClick={() => setF({ ...f, member_ids: all ? [] : members.map((m) => m.id) })}>{all ? "Aucun" : "Toute la famille"}</button></div>
            <div className="flex flex-wrap gap-2">
              {members.map((m) => {
                const on = f.member_ids.includes(m.id);
                return <button key={m.id} type="button" onClick={() => setF({ ...f, member_ids: on ? f.member_ids.filter((x) => x !== m.id) : [...f.member_ids, m.id] })} className={cn("flex items-center gap-1.5 rounded-full border px-2 py-1 text-sm font-semibold", on ? "border-primary bg-secondary" : "opacity-60")}><Avatar m={m} size={22} />{m.first_name}</button>;
              })}
            </div>
          </div>
          <Button className="w-full" onClick={() => save.mutate()} disabled={save.isPending}>Ajouter</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
