import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { sizesAreStale, visibleRecommendations, weekStart } from "@/lib/wardrobe";
import { generateWardrobeDigest, reviewWardrobeDigest } from "@/lib/wardrobe-digest.functions";
import { fmtDate } from "@/lib/family";

type Kid = { id: string; first_name: string; avatar: string };

export function WardrobeDigestCard({ kids }: { kids: Kid[] }) {
  const qc = useQueryClient();
  const gen = useServerFn(generateWardrobeDigest);
  const review = useServerFn(reviewWardrobeDigest);
  const [busy, setBusy] = useState(false);
  const { data } = useQuery({
    queryKey: ["wardrobe-digest"],
    queryFn: async () => {
      const [sizes, needs, digest] = await Promise.all([
        supabase.from("clothing_sizes").select("member_id,updated_at"),
        supabase.from("clothing_items").select("id").eq("kind", "besoin").eq("done", false),
        supabase.from("wardrobe_digests").select("*").eq("week_start", weekStart()).maybeSingle(),
      ]);
      return { sizes: sizes.data ?? [], needs: needs.data?.length ?? 0, digest: digest.data };
    },
  });
  const stale = kids.filter((k) => sizesAreStale(data?.sizes.find((s) => s.member_id === k.id)?.updated_at));
  const d = data?.digest;
  const recos = visibleRecommendations(d);

  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    try { await fn(); await qc.invalidateQueries({ queryKey: ["wardrobe-digest"] }); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Erreur"); }
    finally { setBusy(false); }
  };

  return (
    <section className="card-modern p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-bold">👕 Garde-robe de la semaine</h2>
        <Link to="/garde-robe" className="text-sm font-semibold text-primary">Ouvrir →</Link>
      </div>
      {stale.length > 0 && (
        <div role="alert" className="mb-3 rounded-2xl border border-accent bg-accent/30 p-3 text-sm font-semibold">
          ⏰ Tailles à mettre à jour (jamais mesurées ou plus de 6 mois) : {stale.map((k) => `${k.avatar} ${k.first_name}`).join(", ")}
        </div>
      )}
      <p className="mb-3 text-sm text-muted-foreground">{data?.needs ?? 0} vêtement(s) à renouveler.</p>
      {!d || d.status === "refusee" ? (
        <Button disabled={busy} onClick={() => run(() => gen())}>{busy ? "Analyse en cours…" : "✨ Préparer le résumé IA de la semaine"}</Button>
      ) : (
        <div className="space-y-3">
          <p className="text-xs font-semibold text-muted-foreground">Semaine du {fmtDate(d.week_start)} · {d.status === "validee" ? "✅ validé par vous" : "⏳ en attente de votre validation"}</p>
          <p className="text-sm">{d.summary}</p>
          {d.status === "en_attente" ? (
            <>
              <p className="text-xs text-muted-foreground">Les recommandations s'afficheront après votre validation.</p>
              <div className="flex gap-2">
                <Button disabled={busy} onClick={() => run(() => review({ data: { id: d.id, approve: true } }))}>Valider</Button>
                <Button variant="outline" disabled={busy} onClick={() => run(() => review({ data: { id: d.id, approve: false } }))}>Refuser</Button>
              </div>
            </>
          ) : (
            <ul className="list-disc space-y-1 pl-5 text-sm">{recos.map((r) => <li key={r}>{r}</li>)}</ul>
          )}
        </div>
      )}
    </section>
  );
}
