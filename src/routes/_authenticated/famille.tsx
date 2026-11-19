import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { membersQuery, useMe, type Member } from "@/hooks/use-me";
import { Avatar } from "@/components/family/AppShell";
import { changeRole, changeUsername, createAccount, deleteAccount, resetPassword, setAccountActive } from "@/lib/accounts.functions";
import { ageFrom, canLogInAlone, fmtDate, interfaceForAge, INTERFACE_LABELS, ROLE_LABELS } from "@/lib/family";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/famille")({
  head: () => ({ meta: [{ title: "Famille & comptes — Family OS" }, { name: "description", content: "Gestion des membres et des comptes." }] }),
  component: FamilyPage,
});

const ROLES = ["adulte", "ado", "enfant", "petit"] as const;
const COLORS = ["#5b8fd6", "#9b7fe0", "#f08a7e", "#4fb3a0", "#f2b84b", "#7fc6e8", "#e58fb8", "#8bc34a"];

function FamilyPage() {
  const { data: me } = useMe();
  const { data: members = [] } = useQuery(membersQuery);
  if (!me?.isAdmin) return <p>Accès réservé à l'administrateur.</p>;
  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <div className="flex items-center gap-3">
        <h1 className="flex-1 text-3xl font-bold">Famille & comptes</h1>
        <AddMember count={members.length} />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {members.map((m) => <MemberCard key={m.id} m={m} isSelf={m.user_id === me.userId} />)}
      </div>
    </div>
  );
}

function MemberCard({ m, isSelf }: { m: Member; isSelf: boolean }) {
  const qc = useQueryClient();
  const fns = { create: useServerFn(createAccount), reset: useServerFn(resetPassword), rename: useServerFn(changeUsername), active: useServerFn(setAccountActive), del: useServerFn(deleteAccount), role: useServerFn(changeRole) };
  const age = ageFrom(m.birth_date);
  const refresh = () => qc.invalidateQueries({ queryKey: ["members"] });
  async function run(p: Promise<unknown>, ok: string) {
    try { await p; toast.success(ok); refresh(); } catch (e) { toast.error(e instanceof Error ? e.message : "Erreur"); }
  }
  async function patch(v: Partial<Member>) {
    const { error } = await supabase.from("members").update(v).eq("id", m.id);
    if (error) toast.error(error.message); else refresh();
  }
  return (
    <div className="rounded-3xl bg-card p-5 shadow-soft">
      <div className="flex items-center gap-3">
        <Avatar m={m} size={52} />
        <div className="flex-1">
          <div className="text-lg font-bold">{m.first_name} <span className="text-sm font-semibold text-muted-foreground">· {age} ans</span></div>
          <div className="text-xs text-muted-foreground">Né(e) le {fmtDate(m.birth_date)} · {ROLE_LABELS[m.family_role]}</div>
        </div>
        {m.user_id ? <Badge variant={m.active ? "secondary" : "destructive"}>{m.active ? `@${m.username}` : "Désactivé"}</Badge> : <Badge variant="outline">Sans compte</Badge>}
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <div><Label className="text-xs">Interface</Label>
          <Select value={m.interface} onValueChange={(v) => patch({ interface: v })} disabled={isSelf}><SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{Object.entries(INTERFACE_LABELS).filter(([k]) => k !== "admin").map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}</SelectContent></Select></div>
        <div><Label className="text-xs">Rôle</Label>
          <Select value={m.family_role} onValueChange={(v) => run(fns.role({ data: { memberId: m.id, role: v as (typeof ROLES)[number] } }), "Rôle modifié")} disabled={isSelf}><SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{isSelf && <SelectItem value="admin">{ROLE_LABELS["admin"]}</SelectItem>}{ROLES.map((r) => <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>)}</SelectContent></Select></div>
      </div>
      <div className="mt-3 flex items-center gap-2">
        <Input className="w-16" defaultValue={m.avatar} maxLength={4} onBlur={(e) => e.target.value && e.target.value !== m.avatar && patch({ avatar: e.target.value })} aria-label="Avatar" />
        <div className="flex flex-wrap gap-1">{COLORS.map((c) => <button key={c} onClick={() => patch({ color: c })} aria-label={`Couleur ${c}`} className="size-6 rounded-full ring-offset-2 ring-offset-card" style={{ background: c, boxShadow: m.color === c ? "0 0 0 2px var(--foreground)" : undefined }} />)}</div>
      </div>
      {interfaceForAge(age) !== m.interface && !isSelf && <p className="mt-2 text-xs text-muted-foreground">Suggestion selon l'âge : {INTERFACE_LABELS[interfaceForAge(age)]}</p>}
      {!isSelf && (
        <div className="mt-4 flex flex-wrap gap-2">
          {!m.user_id ? (
            <AccountDialog title="Créer un compte" withUsername defaultUser={m.first_name} hint={!canLogInAlone(age) ? "Tout-petit : son espace peut rester piloté par Papa sans compte." : undefined}
              onSubmit={(u, p) => run(fns.create({ data: { memberId: m.id, username: u, password: p, role: m.family_role === "admin" ? "adulte" : (m.family_role as (typeof ROLES)[number]) } }), "Compte créé")} />
          ) : (
            <>
              <AccountDialog title="Réinitialiser le mot de passe" onSubmit={(_u, p) => run(fns.reset({ data: { memberId: m.id, password: p } }), "Mot de passe provisoire défini")} />
              <AccountDialog title="Modifier l'identifiant" withUsername noPassword defaultUser={m.username ?? ""} onSubmit={(u) => run(fns.rename({ data: { memberId: m.id, username: u } }), "Identifiant modifié")} />
              <Button size="sm" variant="outline" onClick={() => run(fns.active({ data: { memberId: m.id, active: !m.active } }), m.active ? "Compte désactivé" : "Compte réactivé")}>{m.active ? "Désactiver" : "Réactiver"}</Button>
              <Button size="sm" variant="destructive" onClick={() => confirm(`Supprimer le compte de ${m.first_name} ? Son profil et ses données restent.`) && run(fns.del({ data: { memberId: m.id } }), "Compte supprimé")}>Supprimer le compte</Button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function AccountDialog({ title, withUsername, noPassword, defaultUser = "", hint, onSubmit }: { title: string; withUsername?: boolean; noPassword?: boolean; defaultUser?: string; hint?: string | undefined; onSubmit: (u: string, p: string) => Promise<void> }) {
  const [open, setOpen] = useState(false);
  const [u, setU] = useState(defaultUser);
  const [p, setP] = useState("");
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button size="sm" variant="secondary">{title}</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>{title}</DialogTitle></DialogHeader>
        {hint && <p className="text-sm text-muted-foreground">{hint}</p>}
        {withUsername && <div><Label>Identifiant</Label><Input value={u} onChange={(e) => setU(e.target.value)} /></div>}
        {!noPassword && <div><Label>Mot de passe provisoire (8 car. min.)</Label><Input type="text" autoComplete="off" value={p} onChange={(e) => setP(e.target.value)} /><p className="mt-1 text-xs text-muted-foreground">Il devra être changé à la première connexion.</p></div>}
        <Button disabled={(!noPassword && p.length < 8) || (withUsername && u.trim().length < 2)} onClick={async () => { await onSubmit(u, p); setOpen(false); setP(""); }}>Valider</Button>
      </DialogContent>
    </Dialog>
  );
}

function AddMember({ count }: { count: number }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ first_name: "", birth_date: "", sex: "autre", family_role: "enfant" as (typeof ROLES)[number], avatar: "🙂" });
  async function save() {
    if (!f.first_name.trim() || !f.birth_date) {
      toast.error("Prénom et date de naissance requis");
      return;
    }
    const age = ageFrom(f.birth_date);
    const { error } = await supabase.from("members").insert({ ...f, first_name: f.first_name.trim(), interface: interfaceForAge(age), color: COLORS[count % COLORS.length] ?? "#5b8fd6", sort: count });
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Membre ajouté");
    setOpen(false);
    qc.invalidateQueries({ queryKey: ["members"] });
  }
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button><Plus /> Ajouter un membre</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Nouveau membre</DialogTitle></DialogHeader>
        <div className="grid grid-cols-[4rem_1fr] gap-2"><div><Label>Avatar</Label><Input value={f.avatar} maxLength={4} onChange={(e) => setF({ ...f, avatar: e.target.value })} /></div><div><Label>Prénom</Label><Input value={f.first_name} maxLength={60} onChange={(e) => setF({ ...f, first_name: e.target.value })} /></div></div>
        <div className="grid grid-cols-2 gap-2">
          <div><Label>Date de naissance</Label><Input type="date" value={f.birth_date} onChange={(e) => setF({ ...f, birth_date: e.target.value })} /></div>
          <div><Label>Sexe</Label><Select value={f.sex} onValueChange={(v) => setF({ ...f, sex: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="fille">Fille / Femme</SelectItem><SelectItem value="garcon">Garçon / Homme</SelectItem><SelectItem value="autre">Non précisé</SelectItem></SelectContent></Select></div>
        </div>
        <div><Label>Rôle</Label><Select value={f.family_role} onValueChange={(v) => setF({ ...f, family_role: v as (typeof ROLES)[number] })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{ROLES.map((r) => <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>)}</SelectContent></Select></div>
        <Button onClick={save}>Ajouter</Button>
      </DialogContent>
    </Dialog>
  );
}
