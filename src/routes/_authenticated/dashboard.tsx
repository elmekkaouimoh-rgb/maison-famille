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

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Tableau de bord — Family OS" }, { name: "description", content: "Vue d'ensemble de la famille." }] }),
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
      const [events, tasks, routines, checks, claims] = await Promise.all([
        supabase.from("events").select("*"),
        supabase.from("tasks").select("*").neq("status", "validee"),
        supabase.from("routines").select("id,member_id"),
        supabase.from("routine_checks").select("routine_id,member_id").eq("day", today),
        supabase.from("reward_claims").select("id").eq("status", "demandee"),
      ]);
      return { events: events.data ?? [], tasks: tasks.data ?? [], routines: routines.data ?? [], checks: checks.data ?? [], claims: claims.data ?? [] };
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

  const stats = [
    { label: "Membres", value: members.length, icon: "👨‍👧‍👦" },
    { label: "Aujourd'hui", value: todayEv.length, icon: "📅" },
    { label: "À valider", value: pending.length, icon: "✅" },
    { label: "Récompenses demandées", value: data?.claims.length ?? 0, icon: "🎁" },
  ];

  return (
    <div className="stagger mx-auto max-w-6xl space-y-6">
      <section className="bg-hero relative overflow-hidden rounded-[2rem] p-6 shadow-soft">
        <p className="text-sm font-semibold capitalize text-muted-foreground">{format(now, "EEEE d MMMM yyyy", { locale: fr })}</p>
        <h1 className="text-4xl font-bold">Bonjour <span className="text-gradient">{name}</span> 👋</h1>
        <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
          {stats.map((s) => (
            <div key={s.label} className="card-modern card-hover p-4">
              <div className="text-2xl">{s.icon}</div>
              <div className="text-2xl font-extrabold">{s.value}</div>
              <div className="text-xs font-semibold text-muted-foreground">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

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

function Panel({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="card-modern p-5">
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
