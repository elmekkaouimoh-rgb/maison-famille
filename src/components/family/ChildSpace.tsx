import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Member } from "@/hooks/use-me";
import { ageFrom, expandEvents, fmtDate, fmtTime, EVENT_CATEGORIES, TASK_STATUS } from "@/lib/family";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const VARIANTS: Record<string, { hello: string; tasks: string; big: boolean; huge: boolean; checkbox: boolean }> = {
  ado: { hello: "Salut", tasks: "Mes missions", big: false, huge: false, checkbox: true },
  adulte: { hello: "Bonjour", tasks: "Mes tâches", big: false, huge: false, checkbox: true },
  enfant: { hello: "Coucou", tasks: "Mes missions étoiles ⭐", big: true, huge: false, checkbox: false },
  aventure: { hello: "Prêt pour l'aventure,", tasks: "Mes quêtes du jour 🚀", big: true, huge: false, checkbox: false },
  petite: { hello: "Coucou", tasks: "Ce que je fais aujourd'hui", big: true, huge: true, checkbox: false },
  toutpetit: { hello: "Bonjour", tasks: "Avec Papa aujourd'hui", big: true, huge: true, checkbox: false },
};

export function ChildSpace({ member, asParent = false }: { member: Member; asParent?: boolean }) {
  const qc = useQueryClient();
  const v = VARIANTS[member.interface] ?? VARIANTS["enfant"]!;
  const today = format(new Date(), "yyyy-MM-dd");
  const key = ["child", member.id];

  const { data } = useQuery({
    queryKey: key,
    queryFn: async () => {
      const [routines, checks, tasks, rewards, events] = await Promise.all([
        supabase.from("routines").select("*").eq("member_id", member.id).order("sort"),
        supabase.from("routine_checks").select("*").eq("member_id", member.id).eq("day", today),
        supabase.from("tasks").select("*").eq("member_id", member.id).neq("status", "validee").order("created_at"),
        supabase.from("rewards").select("*").order("cost"),
        supabase.from("events").select("*").contains("member_ids", [member.id]),
      ]);
      return { routines: routines.data ?? [], checks: checks.data ?? [], tasks: tasks.data ?? [], rewards: rewards.data ?? [], events: events.data ?? [] };
    },
  });
  const { data: fresh } = useQuery({
    queryKey: ["member-points", member.id],
    queryFn: async () => (await supabase.from("members").select("points").eq("id", member.id).single()).data,
  });
  const points = fresh?.points ?? member.points;

  const toggle = useMutation({
    mutationFn: async (routineId: string) => {
      const existing = data?.checks.find((c) => c.routine_id === routineId);
      if (existing) await supabase.from("routine_checks").delete().eq("id", existing.id);
      else await supabase.from("routine_checks").insert({ routine_id: routineId, member_id: member.id, day: today });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
  });
  const finish = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("tasks").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      if (vars.status === "en_attente") toast.success("Bravo ! Papa va valider ⭐");
      qc.invalidateQueries({ queryKey: key });
    },
    onError: (e) => toast.error(e.message),
  });
  const claim = useMutation({
    mutationFn: async (rewardId: string) => {
      const { error } = await supabase.from("reward_claims").insert({ reward_id: rewardId, member_id: member.id });
      if (error) throw error;
    },
    onSuccess: () => toast.success("Demande envoyée à Papa 🎁"),
    onError: (e) => toast.error(e.message),
  });

  const now = new Date();
  const horizon = new Date(now.getTime() + 14 * 864e5);
  const upcoming = expandEvents(data?.events ?? [], new Date(now.toDateString()), horizon).slice(0, 4);
  const nextReward = data?.rewards.find((r) => r.cost > points) ?? data?.rewards.at(-1);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <section className="relative overflow-hidden rounded-3xl p-6 text-foreground shadow-soft" style={{ background: `color-mix(in oklab, ${member.color} 35%, var(--card))` }}>
        <div className="flex items-center gap-4">
          <span className={cn("flex items-center justify-center rounded-full bg-card", v.huge ? "size-24 text-6xl" : "size-16 text-4xl")}>{member.avatar}</span>
          <div className="flex-1">
            <h1 className={cn("font-bold", v.huge ? "text-4xl" : "text-3xl")}>{v.hello} {member.first_name} !</h1>
            <p className="text-sm font-semibold opacity-80">{asParent ? `${ageFrom(member.birth_date)} ans · ` : ""}{format(now, "EEEE d MMMM", { locale: fr })}</p>
          </div>
          <div className="rounded-2xl bg-card px-4 py-2 text-center">
            <div className="text-2xl font-extrabold text-star-foreground">⭐ {points}</div>
            <div className="text-xs font-semibold text-muted-foreground">points</div>
          </div>
        </div>
        {nextReward && (
          <div className="mt-4">
            <div className="mb-1 flex justify-between text-xs font-bold"><span>Prochaine récompense : {nextReward.icon} {nextReward.title}</span><span>{Math.min(points, nextReward.cost)}/{nextReward.cost}</span></div>
            <Progress value={Math.min(100, (points / nextReward.cost) * 100)} className="h-3 bg-card" />
          </div>
        )}
      </section>

      {(["matin", "soir"] as const).map((period) => {
        const items = (data?.routines ?? []).filter((r) => r.period === period);
        if (!items.length) return null;
        const done = items.filter((r) => data?.checks.some((c) => c.routine_id === r.id)).length;
        return (
          <section key={period} className="rounded-3xl bg-card p-5 shadow-soft">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-xl font-bold">{period === "matin" ? "☀️ Routine du matin" : "🌙 Routine du soir"}</h2>
              <span className="text-sm font-bold text-muted-foreground">{done}/{items.length}</span>
            </div>
            <Progress value={(done / items.length) * 100} className="mb-4 h-2" />
            <div className={cn("grid gap-3", v.big ? "grid-cols-2 sm:grid-cols-3" : "grid-cols-1")}>
              {items.map((r) => {
                const checked = data?.checks.some((c) => c.routine_id === r.id);
                return v.checkbox ? (
                  <label key={r.id} className="flex cursor-pointer items-center gap-3 rounded-2xl border p-3">
                    <input type="checkbox" checked={!!checked} onChange={() => toggle.mutate(r.id)} className="size-5 accent-primary" />
                    <span className={cn("font-semibold", checked && "text-muted-foreground line-through")}>{r.icon} {r.title}</span>
                  </label>
                ) : (
                  <button key={r.id} onClick={() => toggle.mutate(r.id)} className={cn("flex flex-col items-center gap-2 rounded-3xl border-4 p-4 transition", checked ? "border-success bg-success/15" : "border-border bg-muted")}>
                    <span className={v.huge ? "text-6xl" : "text-4xl"}>{r.icon}</span>
                    {!(member.interface === "toutpetit") && <span className="text-center text-sm font-bold">{r.title}</span>}
                    <span className="text-2xl">{checked ? "⭐" : "☆"}</span>
                  </button>
                );
              })}
            </div>
          </section>
        );
      })}

      <section className="rounded-3xl bg-card p-5 shadow-soft">
        <h2 className="mb-3 text-xl font-bold">{v.tasks}</h2>
        {!data?.tasks.length && <p className="text-muted-foreground">Rien pour l'instant. 🎉</p>}
        <div className={cn("grid gap-3", v.big ? "sm:grid-cols-2" : "")}>
          {data?.tasks.map((t) => (
            <div key={t.id} className="flex items-center gap-3 rounded-2xl border p-3">
              <span className={v.huge ? "text-5xl" : "text-3xl"}>{t.icon}</span>
              <div className="flex-1">
                <div className="font-bold">{t.title}</div>
                <div className="text-xs font-semibold text-muted-foreground">⭐ {t.points} pts · {TASK_STATUS[t.status]}</div>
              </div>
              {t.status === "a_faire" && <Button size="sm" variant="secondary" onClick={() => finish.mutate({ id: t.id, status: "en_cours" })}>Je commence</Button>}
              {(t.status === "en_cours" || t.status === "a_faire") && <Button size="sm" onClick={() => finish.mutate({ id: t.id, status: "en_attente" })}>J'ai fini !</Button>}
              {t.status === "en_attente" && <span className="text-2xl">⏳</span>}
            </div>
          ))}
        </div>
      </section>

      <div className="grid gap-6 md:grid-cols-2">
        <section className="rounded-3xl bg-card p-5 shadow-soft">
          <h2 className="mb-3 text-xl font-bold">📅 Bientôt</h2>
          {!upcoming.length && <p className="text-muted-foreground">Rien de prévu.</p>}
          <ul className="space-y-2">
            {upcoming.map((e) => (
              <li key={e.id + e.occ.toISOString()} className="flex items-center gap-3 rounded-2xl bg-muted p-3">
                <span className="text-2xl">{EVENT_CATEGORIES[e.category]?.icon ?? "📌"}</span>
                <div><div className="font-bold">{e.title}</div><div className="text-xs text-muted-foreground">{fmtDate(e.occ)}{!e.all_day && ` · ${fmtTime(e.occ)}`}</div></div>
              </li>
            ))}
          </ul>
        </section>
        {member.interface !== "toutpetit" && (
          <section className="rounded-3xl bg-card p-5 shadow-soft">
            <h2 className="mb-3 text-xl font-bold">🎁 Mes récompenses</h2>
            <ul className="space-y-2">
              {data?.rewards.map((r) => (
                <li key={r.id} className="flex items-center gap-3 rounded-2xl bg-muted p-3">
                  <span className="text-2xl">{r.icon}</span>
                  <span className="flex-1 font-bold">{r.title}</span>
                  <Button size="sm" variant="outline" disabled={points < r.cost || asParent} onClick={() => claim.mutate(r.id)}>⭐ {r.cost}</Button>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  );
}
