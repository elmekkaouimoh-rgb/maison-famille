import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { fmtDate, fmtTime } from "@/lib/family";
import { DONE_STATES, VEILLE_CATEGORIES } from "@/lib/veille";

/** Read-only list of collected school info. RLS decides what each account sees. */
export function VeilleList({ memberId, onlyDated, title }: { memberId?: string | undefined; onlyDated?: boolean; title: string }) {
  const { data = [] } = useQuery({
    queryKey: ["veille-items", memberId ?? "all", !!onlyDated],
    queryFn: async () => {
      let q = supabase.from("veille_items").select("*, veille_sources(label)").order("day", { ascending: true, nullsFirst: false }).limit(60);
      if (memberId) q = q.eq("member_id", memberId);
      if (onlyDated) q = q.or(`day.gte.${new Date().toISOString().slice(0, 10)},starts_at.gte.${new Date().toISOString()}`);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });
  if (!data.length) return null;
  return (
    <section className="card-modern p-5">
      <h2 className="mb-1 text-lg font-bold">🛰️ {title}</h2>
      <p className="mb-3 text-xs text-muted-foreground">Informations recopiées en lecture seule. Rien n'est envoyé ni modifié sur la source.</p>
      <div className="grid gap-2 sm:grid-cols-2">
        {data.map((i: any) => (
          <div key={i.id} className="tile p-3 text-sm">
            <div className="flex items-center gap-2 font-bold">
              <span>{VEILLE_CATEGORIES[i.category as keyof typeof VEILLE_CATEGORIES]?.icon}</span>
              <span className="flex-1">{i.title}</span>
              {i.category === "note" && i.grade != null && <span>{Number(i.grade)}{i.out_of != null ? `/${Number(i.out_of)}` : ""}</span>}
              {i.category === "note" && i.grade == null && i.grade_raw && <span>{i.grade_raw}</span>}
            </div>
            <div className="text-xs text-muted-foreground">
              {VEILLE_CATEGORIES[i.category as keyof typeof VEILLE_CATEGORIES]?.label}
              {i.day && ` · ${fmtDate(i.day)}`}{i.starts_at && ` · ${fmtDate(i.starts_at)} ${fmtTime(i.starts_at)}`}{i.location && ` · ${i.location}`}
              {i.category === "devoir" && ` · ${DONE_STATES[i.done_state as keyof typeof DONE_STATES]}`}
            </div>
            <div className="text-xs text-muted-foreground">Provenance : {i.veille_sources?.label ?? "source autorisée"} · collecté le {fmtDate(i.collected_at)} {fmtTime(i.collected_at)}</div>
            {(i.possible_duplicate || i.uncertainties?.length > 0) && <div className="mt-1 text-xs font-semibold text-destructive">⚠️ {[i.possible_duplicate && "doublon possible", ...(i.uncertainties ?? [])].filter(Boolean).filter((v: string, k: number, a: string[]) => a.indexOf(v) === k).join(" · ")}</div>}
          </div>
        ))}
      </div>
    </section>
  );
}
