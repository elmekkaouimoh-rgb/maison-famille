import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { normalizeUsername, usernameToEmail } from "./family";

const username = z.string().trim().min(2).max(40).transform(normalizeUsername).refine((v) => v.length >= 2, "Identifiant invalide");
const password = z.string().min(8, "8 caractères minimum").max(72);

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

/** Is the first-run setup still open (no administrator yet)? */
export const setupStatus = createServerFn({ method: "GET" }).handler(async () => {
  const a = await admin();
  const { count } = await a.from("user_roles").select("id", { count: "exact", head: true }).eq("role", "admin");
  return { needsSetup: (count ?? 0) === 0 };
});

/** One-time creation of Saïd's administrator account. Refuses once an admin exists. */
export const setupAdmin = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ username, password }).parse(d))
  .handler(async ({ data }) => {
    const a = await admin();
    const { count } = await a.from("user_roles").select("id", { count: "exact", head: true }).eq("role", "admin");
    if ((count ?? 0) > 0) throw new Error("L'administrateur existe déjà.");
    const { data: member } = await a.from("members").select("id").eq("family_role", "admin").order("sort").limit(1).single();
    if (!member) throw new Error("Profil administrateur introuvable.");
    const { data: created, error } = await a.auth.admin.createUser({ email: usernameToEmail(data.username), password: data.password, email_confirm: true });
    if (error || !created.user) throw new Error(error?.message ?? "Création impossible");
    await a.from("user_roles").insert({ user_id: created.user.id, role: "admin" });
    await a.from("members").update({ user_id: created.user.id, username: data.username }).eq("id", member.id);
    return { ok: true };
  });

async function requireAdmin(ctx: { supabase: any; userId: string }) {
  const { data } = await ctx.supabase.rpc("has_role", { _user_id: ctx.userId, _role: "admin" });
  if (!data) throw new Error("Action réservée à l'administrateur.");
}

export const createAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ memberId: z.string().uuid(), username, password, role: z.enum(["adulte", "ado", "enfant", "petit"]) }).parse(d))
  .handler(async ({ data, context }) => {
    await requireAdmin(context);
    const a = await admin();
    const { data: m } = await a.from("members").select("id,user_id").eq("id", data.memberId).single();
    if (!m) throw new Error("Membre introuvable");
    if (m.user_id) throw new Error("Ce membre a déjà un compte.");
    const { data: created, error } = await a.auth.admin.createUser({ email: usernameToEmail(data.username), password: data.password, email_confirm: true });
    if (error || !created.user) throw new Error(error?.message.includes("already") ? "Identifiant déjà utilisé" : (error?.message ?? "Erreur"));
    await a.from("user_roles").insert({ user_id: created.user.id, role: data.role });
    await a.from("members").update({ user_id: created.user.id, username: data.username, must_change_password: true, family_role: data.role, active: true }).eq("id", data.memberId);
    return { ok: true };
  });

async function linkedUser(a: any, memberId: string) {
  const { data: m } = await a.from("members").select("user_id").eq("id", memberId).single();
  if (!m?.user_id) throw new Error("Ce membre n'a pas de compte.");
  return m.user_id as string;
}

export const resetPassword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ memberId: z.string().uuid(), password }).parse(d))
  .handler(async ({ data, context }) => {
    await requireAdmin(context);
    const a = await admin();
    const uid = await linkedUser(a, data.memberId);
    const { error } = await a.auth.admin.updateUserById(uid, { password: data.password });
    if (error) throw new Error(error.message);
    await a.from("members").update({ must_change_password: true }).eq("id", data.memberId);
    return { ok: true };
  });

export const changeUsername = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ memberId: z.string().uuid(), username }).parse(d))
  .handler(async ({ data, context }) => {
    await requireAdmin(context);
    const a = await admin();
    const uid = await linkedUser(a, data.memberId);
    const { error } = await a.auth.admin.updateUserById(uid, { email: usernameToEmail(data.username), email_confirm: true });
    if (error) throw new Error(error.message);
    await a.from("members").update({ username: data.username }).eq("id", data.memberId);
    return { ok: true };
  });

export const setAccountActive = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ memberId: z.string().uuid(), active: z.boolean() }).parse(d))
  .handler(async ({ data, context }) => {
    await requireAdmin(context);
    const a = await admin();
    const uid = await linkedUser(a, data.memberId);
    if (uid === context.userId) throw new Error("Impossible de vous désactiver vous-même.");
    const { error } = await a.auth.admin.updateUserById(uid, { ban_duration: data.active ? "none" : "876000h" });
    if (error) throw new Error(error.message);
    await a.from("members").update({ active: data.active }).eq("id", data.memberId);
    return { ok: true };
  });

export const deleteAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ memberId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await requireAdmin(context);
    const a = await admin();
    const uid = await linkedUser(a, data.memberId);
    if (uid === context.userId) throw new Error("Impossible de supprimer votre propre compte.");
    const { error } = await a.auth.admin.deleteUser(uid);
    if (error) throw new Error(error.message);
    await a.from("members").update({ user_id: null, username: null, must_change_password: false }).eq("id", data.memberId);
    return { ok: true };
  });

export const changeRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ memberId: z.string().uuid(), role: z.enum(["adulte", "ado", "enfant", "petit"]) }).parse(d))
  .handler(async ({ data, context }) => {
    await requireAdmin(context);
    const a = await admin();
    const { data: m } = await a.from("members").select("user_id").eq("id", data.memberId).single();
    if (m?.user_id) {
      if (m.user_id === context.userId) throw new Error("Vous restez administrateur.");
      await a.from("user_roles").delete().eq("user_id", m.user_id);
      await a.from("user_roles").insert({ user_id: m.user_id, role: data.role });
    }
    await a.from("members").update({ family_role: data.role }).eq("id", data.memberId);
    return { ok: true };
  });

/** Signed-in member changes their own (temporary) password. */
export const changeMyPassword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ password }).parse(d))
  .handler(async ({ data, context }) => {
    const a = await admin();
    const { error } = await a.auth.admin.updateUserById(context.userId, { password: data.password });
    if (error) throw new Error(error.message);
    await a.from("members").update({ must_change_password: false }).eq("user_id", context.userId);
    return { ok: true };
  });
