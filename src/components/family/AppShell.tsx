import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState, type ReactNode } from "react";
import { Menu, Plus, Smile, Shirt, CalendarDays, Camera, GraduationCap, MessageCircle, Gift, HeartPulse, Home, ListChecks, LogOut, Users, UtensilsCrossed, Wallet, Radar } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useMe } from "@/hooks/use-me";
import { changeMyPassword } from "@/lib/accounts.functions";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { NotificationBell } from "@/components/family/NotificationBell";
import logo from "@/assets/logo-house.png";

export function AppShell({ children }: { children: ReactNode }) {
  const { data: me } = useMe();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const path = useRouterState({ select: (st) => st.location.pathname });
  const nav = [
    { to: "/dashboard", label: "Accueil", icon: Home },
    { to: "/calendrier", label: "Calendrier", icon: CalendarDays },
    { to: "/taches", label: "Tâches", icon: ListChecks },
    { to: "/recompenses", label: "Récompenses", icon: Gift },
    { to: "/messages", label: "Messages", icon: MessageCircle },
    { to: "/ecole", label: "École", icon: GraduationCap },
    { to: "/repas", label: "Repas", icon: UtensilsCrossed },
    { to: "/souvenirs", label: "Souvenirs", icon: Camera },
    { to: "/garde-robe", label: "Garde-robe", icon: Shirt },
    ...(me?.isManager ? [{ to: "/budget", label: "Budget", icon: Wallet }, { to: "/sante", label: "Santé", icon: HeartPulse }] : []),
    ...(me?.isAdmin ? [{ to: "/famille", label: "Famille", icon: Users }, { to: "/veille", label: "Veille", icon: Radar }] : []),
  ] as const;
  const bottom = [
    { to: "/dashboard", label: "Accueil", icon: Home },
    { to: "/calendrier", label: "Calendrier", icon: CalendarDays },
    { to: "/taches", label: "Missions", icon: ListChecks },
    { to: me?.isManager ? "/famille" : "/recompenses", label: me?.isManager ? "Enfants" : "Récompenses", icon: me?.isManager ? Smile : Gift },
    { to: "/messages", label: "Messages", icon: MessageCircle },
  ] as const;
  const [open, setOpen] = useState(false);

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="relative min-h-screen md:flex">
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-0 overflow-hidden">
        <div className="float-slow absolute -left-32 -top-32 size-[28rem] rounded-full bg-primary/20 blur-3xl" />
        <div className="float-slow absolute -right-24 top-1/3 size-[24rem] rounded-full bg-accent/25 blur-3xl [animation-delay:-3s]" />
        <div className="float-slow absolute bottom-0 left-1/3 size-[22rem] rounded-full bg-star/25 blur-3xl [animation-delay:-6s]" />
      </div>
      <aside className="sticky top-0 z-10 hidden h-screen w-64 shrink-0 flex-col p-4 md:flex">
        <div className="card-modern flex h-full flex-col p-4">
        <div className="mb-8 flex items-center gap-2 px-2">
          <img src={logo} alt="" width={40} height={40} className="size-10" />
          <span className="brand-title flex-1 whitespace-nowrap font-display text-base font-bold leading-tight">EL MEKKAOUI</span>
          <NotificationBell />
        </div>
        <nav className="flex flex-1 flex-col gap-1">
          {nav.map((n) => (
            <Link key={n.to} to={n.to} className="flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-bold text-muted-foreground transition-all hover:translate-x-1 hover:bg-sidebar-accent" activeProps={{ className: "!bg-primary !text-primary-foreground shadow-soft" }}>
              <n.icon className="size-5" /> {n.label}
            </Link>
          ))}
        </nav>
        {me?.member && (
          <div className="flex items-center gap-2 rounded-2xl bg-muted p-2">
            <Avatar m={me.member} size={36} />
            <span className="flex-1 truncate text-sm font-bold">{me.member.first_name}</span>
            <Button size="icon" variant="ghost" onClick={signOut} aria-label="Se déconnecter"><LogOut className="size-4" /></Button>
          </div>
        )}
        </div>
      </aside>
      <header className="sticky top-0 z-30 flex items-center gap-2 bg-background/40 px-3 pb-2 pt-3 backdrop-blur-xl md:hidden">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild><Button size="icon" variant="ghost" aria-label="Ouvrir le menu"><Menu className="size-5" /></Button></SheetTrigger>
          <SheetContent side="left" className="w-72 overflow-y-auto">
            <SheetHeader><SheetTitle className="font-display">EL MEKKAOUI</SheetTitle></SheetHeader>
            <nav className="mt-4 grid grid-cols-2 gap-2">
              {nav.map((n) => (
                <Link key={n.to} to={n.to} onClick={() => setOpen(false)} className="tile flex flex-col items-center gap-1 p-3 text-xs font-bold text-muted-foreground transition hover:scale-[1.03]" activeProps={{ className: "!bg-primary !text-primary-foreground" }}>
                  <n.icon className="size-6" /> {n.label}
                </Link>
              ))}
            </nav>
          </SheetContent>
        </Sheet>
        <img src={logo} alt="" width={48} height={48} className="size-12 shrink-0" />
        <div className="min-w-0 flex-1">
          <div className="brand-title truncate font-display text-2xl font-bold leading-none">EL MEKKAOUI</div>
          <div className="truncate text-xs font-semibold text-foreground/80">Notre famille, notre univers ❤️</div>
        </div>
        <NotificationBell />
        <button onClick={signOut} aria-label="Se déconnecter" className="shrink-0 rounded-full bg-gradient-to-br from-primary to-pastel-pink-fg p-0.5">
          {me?.member ? <Avatar m={me.member} size={40} /> : <LogOut className="size-4" />}
        </button>
      </header>
      <main className="relative z-10 min-w-0 flex-1 p-4 pb-36 md:p-8"><div key={path} className="rise">{children}</div></main>
      <nav className="glass fixed inset-x-2 bottom-2 z-40 grid grid-cols-5 px-1 pb-2 pt-3 md:hidden">
        {bottom.map((n, i) => (
          <Link key={n.to + i} to={n.to} className="group relative flex min-w-0 flex-col items-center gap-1 px-1 text-[11px] font-bold text-foreground/80 transition" activeProps={{ className: "!text-brand-blue [&>span.bar]:opacity-100" }}>
            <n.icon className="size-6" /> <span className="truncate">{n.label}</span>
            <span className="bar absolute -bottom-2 h-1 w-10 rounded-full bg-brand-blue opacity-0" />
          </Link>
        ))}
      </nav>
      <button onClick={() => setOpen(true)} aria-label="Ouvrir tous les modules" className="fab fixed bottom-[4.6rem] left-1/2 z-50 flex size-14 -translate-x-1/2 items-center justify-center rounded-full text-primary-foreground transition active:scale-95 md:hidden">
        <Plus className="size-7" strokeWidth={2.6} />
      </button>
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

export function Avatar({ m, size = 40 }: { m: { avatar: string; color: string; first_name: string; photo_url?: string | undefined } | undefined; size?: number }) {
  if (!m) return null;
  if (m.photo_url) return <img src={m.photo_url} alt={m.first_name} title={m.first_name} className="inline-block shrink-0 rounded-full object-cover ring-2 ring-card" style={{ width: size, height: size }} />;
  return (
    <span title={m.first_name} className="inline-flex shrink-0 items-center justify-center rounded-full ring-2 ring-card" style={{ background: m.color, width: size, height: size, fontSize: size * 0.5 }}>
      {m.avatar}
    </span>
  );
}
