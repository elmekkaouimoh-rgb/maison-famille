import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ChildSpace } from "@/components/family/ChildSpace";

export const Route = createFileRoute("/_authenticated/enfant/$id")({
  head: () => ({ meta: [{ title: "Espace enfant — Family OS" }, { name: "description", content: "Espace personnel d'un enfant." }] }),
  component: ChildPage,
});

function ChildPage() {
  const { id } = Route.useParams();
  const { data: m, isLoading } = useQuery({
    queryKey: ["member", id],
    queryFn: async () => (await supabase.from("members").select("*").eq("id", id).maybeSingle()).data,
  });
  if (isLoading) return <p className="text-muted-foreground">Chargement…</p>;
  if (!m) return <p>Accès non autorisé.</p>;
  return (
    <div className="space-y-4">
      <Link to="/dashboard" className="text-sm font-bold text-primary">← Retour</Link>
      <ChildSpace member={m} asParent />
    </div>
  );
}
