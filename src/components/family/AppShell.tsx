import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState, type ReactNode } from "react";
import { CalendarDays, Gift, Home, ListChecks, LogOut, Users } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useMe } from "@/hooks/use-me";
import { changeMyPassword } from "@/lib/accounts.functions";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function AppShell({ children }: { children: ReactNode }) {
  const { data: me } = useMe();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const nav = [
    { to: "/dashboard", label: "Accueil", icon: Home },
    { to: "/calendrier", label: "Calendrier", icon: CalendarDays },
    { to: "/taches", label: "Tâches", icon: ListChecks },
    { to: "/recompenses", label: "Récompenses", icon: Gift },
    ...(me?.isAdmin ? [{ to: "/famille", label: "Famille", icon: Users }] : []),
  ] as const;

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="min-h-screen bg-background md:flex">
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r bg-sidebar p-4 md:flex">
        <div className="mb-8 flex items-center gap-2 px-2">
          <span className="text-3xl">🏡</span>
          <span className="font-display text-xl font-bold">Family OS</span>
        </div>
        <nav className="flex flex-1 flex-col gap-1">
          {nav.map((n) => (
            <Link key={n.to} to={n.to} className="flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-semibold text-muted-foreground transition hover:bg-sidebar-accent" activeProps={{ className: "bg-sidebar-accent text-sidebar-accent-foreground" }}>
              <n.icon className="size-5" /> {n.label}
            </Link>
          ))}
        </nav>
        {me?.member && (
          <div className="flex items-center gap-2 rounded-2xl bg-muted p-2">
            <span className="flex size-9 items-center justify-center rounded-full text-lg" style={{ background: me.member.color }}>{me.member.avatar}</span>
            <span className="flex-1 truncate text-sm font-bold">{me.member.first_name}</span>
            <Button size="icon" variant="ghost" onClick={signOut} aria-label="Se déconnecter"><LogOut className="size-4" /></Button>
          </div>
        )}
      </aside>
      <header className="flex items-center justify-between border-b bg-card px-4 py-3 md:hidden">
        <span className="font-display text-lg font-bold">🏡 Family OS</span>
        <Button size="icon" variant="ghost" onClick={signOut} aria-label="Se déconnecter"><LogOut className="size-4" /></Button>
      </header>
      <main className="flex-1 p-4 pb-28 md:p-8">{children}</main>
      <nav className="fixed inset-x-0 bottom-0 z-40 flex justify-around border-t bg-card px-2 py-2 md:hidden">
        {nav.map((n) => (
          <Link key={n.to} to={n.to} className="flex flex-col items-center gap-0.5 rounded-xl px-2 py-1 text-[11px] font-semibold text-muted-foreground" activeProps={{ className: "text-primary" }}>
            <n.icon className="size-5" /> {n.label}
          </Link>
        ))}
      </nav>
      {me?.member?.must_change_password && <ForcePassword />}
    </div>
  );
}

function ForcePassword() {
  const change = useServerFn(changeMyPassword);
  const qc = useQueryClient();
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  async function save() {
    if (pw !== pw2) {
      toast.error("Les mots de passe ne correspondent pas");
      return;
    }
    try {
      await change({ data: { password: pw } });
      toast.success("Mot de passe modifié");
      qc.invalidateQueries({ queryKey: ["me"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur");
    }
  }
  return (
    <Dialog open>
      <DialogContent className="[&>button]:hidden">
        <DialogHeader>
          <DialogTitle>Choisis ton mot de passe</DialogTitle>
          <DialogDescription>Ton mot de passe est provisoire. Choisis-en un nouveau (8 caractères minimum).</DialogDescription>
        </DialogHeader>
        <Input type="password" placeholder="Nouveau mot de passe" value={pw} onChange={(e) => setPw(e.target.value)} />
        <Input type="password" placeholder="Confirmer" value={pw2} onChange={(e) => setPw2(e.target.value)} />
        <Button onClick={save} disabled={pw.length < 8}>Enregistrer</Button>
      </DialogContent>
    </Dialog>
  );
}

export function Avatar({ m, size = 40 }: { m: { avatar: string; color: string; first_name: string } | undefined; size?: number }) {
  if (!m) return null;
  return (
    <span title={m.first_name} className="inline-flex shrink-0 items-center justify-center rounded-full ring-2 ring-card" style={{ background: m.color, width: size, height: size, fontSize: size * 0.5 }}>
      {m.avatar}
    </span>
  );
}
