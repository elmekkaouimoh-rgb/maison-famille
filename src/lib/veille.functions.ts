import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { veilleImportSchema, validateVeilleItems } from "./veille";

/** Private import: admin session only. preview=true runs the same checks without writing. All-or-nothing, never deletes. */
export const importVeille = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => {
    const o = d as { preview?: unknown };
    const parsed = veilleImportSchema.parse({ source_id: (d as any)?.source_id, items: (d as any)?.items });
    return { ...parsed, preview: o?.preview !== false };
  })
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (!isAdmin) throw new Error("Import réservé à l'administrateur.");
    const { valid, errors } = validateVeilleItems(data.items, data.source_id);
    if (errors.length && !data.preview) throw new Error(`Import refusé : ${errors.length} entrée(s) invalide(s). Corrigez puis réessayez (rien n'a été enregistré).`);
    const run = (apply: boolean) => context.supabase.rpc("veille_import", { _source: data.source_id, _items: valid as any, _apply: apply });
    const pre = await run(false);
    if (pre.error) throw new Error(pre.error.message);
    if (data.preview) return { result: pre.data as any, invalid: errors };
    if ((pre.data as any)?.rejected > 0) throw new Error("Import refusé : certaines entrées visent un autre enfant, une autre source ou un type non autorisé (rien n'a été enregistré).");
    const { data: res, error } = await run(true);
    if (error) throw new Error(error.message);
    return { result: res as any, invalid: errors };
  });
