import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { format, isSameDay } from "date-fns";
import { fr } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { membersQuery, useMe } from "@/hooks/use-me";
import { ChildSpace } from "@/components/family/ChildSpace";
import { Avatar } from "@/components/family/AppShell";
import { ageFrom, expandEvents, fmtDate, fmtTime, EVENT_CATEGORIES, INTERFACE_LABELS } from "@/lib/family";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { ArrowRight, CalendarDays } from "lucide-react";
import robot from "@/assets/papa-ia-robot.png";
import { WardrobeDigestCard } from "@/components/family/WardrobeDigestCard";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Tableau de bord — EL MEKKAOUI" }, { name: "description", content: "Vue d'ensemble de la famille." }] }),
  component: Dashboard,
});

function Dashboard() {
  const { data: me, isLoading } = useMe();
  if (isLoading) return <p className="text-muted-foreground">Chargement…</p>;
  if (!me?.member) return <p>Profil introuvable.</p>;
  if (!me.isManager) return <ChildSpace member={me.member} />;
  return <PapaDashboard name={me.member.first_name} />;
}

function PapaDashboard({ name }: { name: string }) {
  const { data: members = [] } = useQuery(membersQuery);
  const today = format(new Date(), "yyyy-MM-dd");
  const { data } = useQuery({
    queryKey: ["papa-dash"],
    queryFn: async () => {
      const [events, tasks, routines, checks, claims, hw] = await Promise.all([
        supabase.from("events").select("*"),
        supabase.from("tasks").select("*").neq("status", "validee"),
        supabase.from("routines").select("id,member_id"),
        supabase.from("routine_checks").select("routine_id,member_id").eq("day", today),
        supabase.from("reward_claims").select("id").eq("status", "demandee"),
        supabase.from("school_items").select("id").eq("kind", "devoir").eq("done", false),
      ]);
      return { events: events.data ?? [], tasks: tasks.data ?? [], routines: routines.data ?? [], checks: checks.data ?? [], claims: claims.data ?? [], hw: hw.data ?? [] };
    },
  });
  const now = new Date();
  const start = new Date(now.toDateString());
  const occ = expandEvents(data?.events ?? [], start, new Date(start.getTime() + 30 * 864e5));
  const todayEv = occ.filter((e) => isSameDay(e.occ, now));
  const upcoming = occ.filter((e) => !isSameDay(e.occ, now)).slice(0, 6);
  const pending = (data?.tasks ?? []).filter((t) => t.status === "en_attente");
  const kids = members.filter((m) => m.family_role !== "admin" && m.family_role !== "adulte");
  const byId = Object.fromEntries(members.map((m) => [m.id, m]));

  const birthdays = members
    .map((m) => {
      const b = new Date(m.birth_date);
      let next = new Date(now.getFullYear(), b.getMonth(), b.getDate());
      if (next < start) next = new Date(now.getFullYear() + 1, b.getMonth(), b.getDate());
      return { m, next, turns: next.getFullYear() - b.getFullYear() };
    })
    .sort((a, b) => a.next.getTime() - b.next.getTime())
    .slice(0, 3);

  const weather = useWeather();
  const summary = [
    { label: "Devoirs", value: data?.hw.length ?? 0, icon: "📚", cls: "bg-pastel-violet text-pastel-violet-fg", to: "/ecole" },
    { label: "Rendez-vous", value: todayEv.length, icon: "📅", cls: "bg-pastel-green text-pastel-green-fg", to: "/calendrier" },
    { label: "Missions", value: pending.length, icon: "✅", cls: "bg-pastel-orange text-pastel-orange-fg", to: "/taches" },
    { label: "Récompenses", value: data?.claims.length ?? 0, icon: "⭐", cls: "bg-pastel-pink text-pastel-pink-fg", to: "/recompenses" },
  ] as const;
  const tip = pending.length || data?.hw.length || todayEv.length
    ? `“${todayEv.length} rendez-vous aujourd'hui, ${pending.length} mission${pending.length > 1 ? "s" : ""} à valider et ${data?.hw.length ?? 0} devoir${(data?.hw.length ?? 0) > 1 ? "s" : ""} en cours.”`
    : "“Tout est à jour aujourd'hui. Profitez de votre famille !”";

  return (
    <div className="stagger mx-auto max-w-6xl space-y-4">
      <div className="grid grid-cols-[1fr_auto] gap-3">
        <section className="glass flex items-center gap-3 p-4">
          <span className="text-5xl sm:text-6xl">☀️</span>
          <div className="min-w-0">
            <h1 className="text-2xl font-bold sm:text-3xl">Bonjour {name} 👋</h1>
            <p className="text-sm font-semibold text-foreground/80">Une journée bien organisée pour toute la famille !</p>
          </div>
        </section>
        <section className="glass flex w-36 flex-col justify-center gap-2 p-3 sm:w-48">
          <div className="flex items-center gap-2"><CalendarDays className="size-7 shrink-0 text-brand-blue" /><div className="text-xs font-bold leading-tight sm:text-sm"><span className="capitalize">{format(now, "EEEE", { locale: fr })}</span><br /><span className="font-semibold">{format(now, "d MMMM yyyy", { locale: fr })}</span></div></div>
          <div className="h-px bg-border" />
          <div className="flex items-center gap-2"><span className="text-2xl">{weather?.icon ?? "🌤️"}</span><div className="text-xs leading-tight"><div className="text-base font-extrabold">{weather ? `${weather.t}°C` : "—"}</div><div className="font-semibold">{weather?.label ?? "Météo"}</div></div></div>
        </section>
      </div>

      <section className="glass flex gap-3 overflow-x-auto p-4 [scrollbar-width:none]">
        {members.map((m) => {
          const isAdmin = m.family_role === "admin";
          return (
            <Link key={m.id} to="/enfant/$id" params={{ id: m.id }} disabled={isAdmin} className="flex w-20 shrink-0 flex-col items-center text-center transition hover:scale-105">
              <div className="relative">
                {isAdmin && <span className="absolute -top-4 left-1/2 z-10 -translate-x-1/2 text-xl">👑</span>}
                <div className="rounded-full p-[3px]" style={{ background: `linear-gradient(135deg, ${m.color}, color-mix(in oklab, ${m.color} 40%, white))` }}>
                  <div className="rounded-full bg-card p-0.5"><Avatar m={m} size={isAdmin ? 72 : 64} /></div>
                </div>
                <span className="absolute bottom-1 right-1 size-3.5 rounded-full border-2 border-card bg-success" />
              </div>
              <div className="mt-1 text-sm font-bold">{m.first_name}</div>
              <div className="text-xs text-muted-foreground">{isAdmin ? "Papa" : `${ageFrom(m.birth_date)} ans`}</div>
            </Link>
          );
        })}
      </section>

      <section className="glass p-4">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="text-lg font-bold">📊 Résumé familial aujourd'hui</h2>
          <Link to="/taches" className="flex items-center gap-1 text-sm font-bold text-brand-blue">Voir le détail <ArrowRight className="size-4" /></Link>
        </div>
        <div className="grid grid-cols-4 gap-2">
          {summary.map((s) => (
            <Link key={s.label} to={s.to} className={`flex flex-col items-center rounded-2xl p-3 text-center transition hover:-translate-y-1 ${s.cls}`}>
              <span className="text-2xl">{s.icon}</span>
              <span className="text-2xl font-extrabold text-foreground">{s.value}</span>
              <span className="truncate text-[11px] font-bold sm:text-sm">{s.label}</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="relative overflow-hidden rounded-[1.75rem] bg-gradient-to-br from-pastel-violet via-secondary to-primary/40 p-4 shadow-soft">
        <div className="flex items-center gap-2">
          <img src={robot} alt="PAPA IA" width={816} height={816} className="-my-4 -ml-3 w-28 shrink-0 drop-shadow-xl sm:w-36" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2"><h2 className="text-2xl font-extrabold">PAPA IA</h2><span className="rounded-full bg-success px-2 py-0.5 text-xs font-bold text-primary-foreground">Connecté</span></div>
            <p className="text-sm font-semibold">Votre assistant familial intelligent</p>
            <div className="mt-2 flex items-center gap-2">
              <p className="glass flex-1 rounded-2xl p-2.5 text-xs font-semibold sm:text-sm">{tip}</p>
              <a href="#papa-ia" aria-label="Voir les conseils de PAPA IA" className="fab flex size-12 shrink-0 items-center justify-center rounded-full text-primary-foreground"><ArrowRight /></a>
            </div>
          </div>
        </div>
      </section>
      <div id="papa-ia" />
      <WardrobeDigestCard kids={kids} />

      <section>
        <h2 className="mb-3 text-xl font-bold">Les enfants</h2>
        <div className="stagger grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {kids.map((k) => {
            const r = (data?.routines ?? []).filter((x) => x.member_id === k.id).length;
            const c = (data?.checks ?? []).filter((x) => x.member_id === k.id).length;
            const t = (data?.tasks ?? []).filter((x) => x.member_id === k.id);
            const next = occ.find((e) => e.member_ids.includes(k.id));
            return (
              <div key={k.id} className="card-modern card-hover p-5">
                <div className="flex items-center gap-3">
                  <Avatar m={k} size={52} />
                  <div className="flex-1">
                    <div className="text-lg font-bold">{k.first_name}</div>
                    <div className="text-xs font-semibold text-muted-foreground">{ageFrom(k.birth_date)} ans · {INTERFACE_LABELS[k.interface]}</div>
                  </div>
                  <div className="rounded-xl bg-star/30 px-2 py-1 text-sm font-extrabold text-star-foreground">⭐ {k.points}</div>
                </div>
                <div className="mt-4 space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-muted-foreground">Prochaine activité</span><span className="font-semibold">{next ? `${next.title} · ${fmtDate(next.occ)}` : "—"}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Tâches en attente</span><span className="font-semibold">{t.length}{t.some((x) => x.status === "en_attente") ? " ⏳" : ""}</span></div>
                  <div><div className="mb-1 flex justify-between"><span className="text-muted-foreground">Routines du jour</span><span className="font-semibold">{c}/{r}</span></div><Progress value={r ? (c / r) * 100 : 0} className="h-2" /></div>
                </div>
                <Button asChild variant="secondary" className="mt-4 w-full rounded-2xl"><Link to="/enfant/$id" params={{ id: k.id }}>Ouvrir son espace</Link></Button>
              </div>
            );
          })}
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-3">
        <Panel title="📅 Aujourd'hui">
          {!todayEv.length && <Empty>Aucun rendez-vous aujourd'hui.</Empty>}
          {todayEv.map((e) => <EvRow key={e.id} e={e} byId={byId} />)}
        </Panel>
        <Panel title="🗓️ À venir" action={<Link to="/calendrier" className="text-sm font-bold text-primary">Calendrier →</Link>}>
          {upcoming.map((e) => <EvRow key={e.id + e.occ.toISOString()} e={e} byId={byId} />)}
        </Panel>
        <Panel title="✅ Tâches à valider" action={<Link to="/taches" className="text-sm font-bold text-primary">Tout voir →</Link>}>
          {!pending.length && <Empty>Rien à valider.</Empty>}
          {pending.map((t) => (
            <div key={t.id} className="flex items-center gap-2 tile p-3">
              <span className="text-xl">{t.icon}</span><span className="flex-1 font-semibold">{t.title}</span>
              {byId[t.member_id] && <Avatar m={byId[t.member_id]} size={28} />}
            </div>
          ))}
        </Panel>
      </div>

      <Panel title="🎂 Anniversaires à venir">
        <div className="grid gap-3 sm:grid-cols-3">
          {birthdays.map(({ m, next, turns }) => (
            <div key={m.id} className="flex items-center gap-3 tile p-3">
              <Avatar m={m} size={36} />
              <div><div className="font-bold">{m.first_name} — {turns} ans</div><div className="text-xs text-muted-foreground">{fmtDate(next)}</div></div>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}

const WMO: Record<number, [string, string]> = { 0: ["☀️", "Ensoleillé"], 1: ["🌤️", "Éclaircies"], 2: ["⛅", "Nuageux"], 3: ["☁️", "Couvert"], 45: ["🌫️", "Brouillard"], 61: ["🌧️", "Pluie"], 63: ["🌧️", "Pluie"], 80: ["🌦️", "Averses"], 71: ["🌨️", "Neige"], 95: ["⛈️", "Orage"] };
function useWeather() {
  const [w, setW] = useState<{ t: number; icon: string; label: string } | null>(null);
  useEffect(() => {
    fetch("https://api.open-meteo.com/v1/forecast?latitude=48.85&longitude=2.35&current=temperature_2m,weather_code&timezone=Europe/Paris")
      .then((r) => r.json())
      .then((j) => { const c = j.current; const k = WMO[c.weather_code] ?? WMO[Math.floor(c.weather_code / 10) * 10] ?? ["🌤️", "Variable"]; setW({ t: Math.round(c.temperature_2m), icon: k[0], label: k[1] }); })
      .catch(() => {});
  }, []);
  return w;
}

function Panel({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="glass p-5">
      <div className="mb-3 flex items-center justify-between"><h2 className="text-lg font-bold">{title}</h2>{action}</div>
      <div className="space-y-2">{children}</div>
    </section>
  );
}
function Empty({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-muted-foreground">{children}</p>;
}
function EvRow({ e, byId }: { e: { title: string; category: string; occ: Date; all_day: boolean; member_ids: string[] }; byId: Record<string, any> }) {
  return (
    <div className="flex items-center gap-3 tile p-3">
      <span className="text-xl">{EVENT_CATEGORIES[e.category]?.icon}</span>
      <div className="flex-1"><div className="font-semibold">{e.title}</div><div className="text-xs text-muted-foreground">{fmtDate(e.occ)}{!e.all_day && ` · ${fmtTime(e.occ)}`}</div></div>
      <div className="flex -space-x-2">{e.member_ids.slice(0, 4).map((id) => byId[id] && <Avatar key={id} m={byId[id]} size={24} />)}</div>
    </div>
  );
}
