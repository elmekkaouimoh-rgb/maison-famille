import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { setupAdmin, setupStatus } from "@/lib/accounts.functions";
import { usernameToEmail } from "@/lib/family";

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Connexion — EL MEKKAOUI" },
      { name: "description", content: "Connectez-vous à l'espace privé de la famille." },
      { property: "og:title", content: "Connexion — EL MEKKAOUI" },
      { property: "og:description", content: "Espace familial privé." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const status = useServerFn(setupStatus);
  const setup = useServerFn(setupAdmin);
  const { data } = useQuery({ queryKey: ["setup"], queryFn: () => status() });
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const isSetup = data?.needsSetup;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (isSetup) await setup({ data: { username, password } });
      const { error } = await supabase.auth.signInWithPassword({ email: usernameToEmail(username), password });
      if (error) throw new Error("Identifiant ou mot de passe incorrect");
      navigate({ to: "/dashboard", replace: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="bg-hero flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-sm rounded-3xl bg-card p-8 shadow-soft">
        <div className="mb-6 text-center">
          <div className="text-5xl">🏡</div>
          <h1 className="mt-2 text-3xl font-bold text-foreground">EL MEKKAOUI</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {isSetup ? "Première ouverture : créez le compte de Saïd, administrateur principal." : "Connectez-vous avec votre identifiant."}
          </p>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="u">Identifiant</Label>
            <Input id="u" autoComplete="username" value={username} onChange={(e) => setUsername(e.target.value)} placeholder={isSetup ? "said" : "ex. maya"} required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="p">Mot de passe</Label>
            <Input id="p" type="password" autoComplete={isSetup ? "new-password" : "current-password"} value={password} onChange={(e) => setPassword(e.target.value)} minLength={isSetup ? 8 : undefined} required />
          </div>
          <Button type="submit" className="w-full rounded-2xl" size="lg" disabled={busy}>
            {busy ? "…" : isSetup ? "Créer mon compte administrateur" : "Se connecter"}
          </Button>
        </form>
        {!isSetup && <p className="mt-4 text-center text-xs text-muted-foreground">Mot de passe oublié ? Demandez à Papa de le réinitialiser.</p>}
      </div>
    </div>
  );
}
