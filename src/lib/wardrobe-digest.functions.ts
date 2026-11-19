import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { sizesAreStale, weekStart } from "./wardrobe";

/** Builds this week's wardrobe summary with AI. Saved as "en_attente" until the parent validates it. */
export const generateWardrobeDigest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sb = context.supabase;
    const { data: isManager } = await sb.rpc("is_manager");
    if (!isManager) throw new Error("Réservé au parent.");
    const [members, sizes, items] = await Promise.all([
      sb.from("members").select("id,first_name,birth_date,family_role").not("family_role", "in", "(admin,adulte)"),
      sb.from("clothing_sizes").select("*"),
      sb.from("clothing_items").select("member_id,title,category,size,season,priority,price,quantity").eq("kind", "besoin").eq("done", false),
    ]);
    const kids = (members.data ?? []).map((m) => {
      const s = (sizes.data ?? []).find((x) => x.member_id === m.id);
      return {
        prenom: m.first_name, naissance: m.birth_date,
        tailles: s ? { cm: s.height_cm, haut: s.top, bas: s.bottom, pointure: s.shoes, mesure_le: s.updated_at.slice(0, 10) } : null,
        tailles_a_actualiser: sizesAreStale(s?.updated_at),
        a_renouveler: (items.data ?? []).filter((i) => i.member_id === m.id),
      };
    });
    let summary = "";
    let recommendations: string[] = [];
    try {
      const { generateResponse } = await import("@lovable.dev/ai-gateway");
      const res = await generateResponse({
        model: "openai/gpt-6.1-terra",
        instructions: "Tu aides un papa à gérer la garde-robe de ses enfants. Réponds en français, uniquement en JSON: {\"summary\": \"résumé court (4-6 phrases) des tailles à actualiser et vêtements à renouveler\", \"recommendations\": [\"recommandation concrète\", ...max 6]}. Pas de stéréotypes de genre.",
        input: JSON.stringify({ date: new Date().toISOString().slice(0, 10), enfants: kids }),
      });
      let text = "";
      for (const o of res.output ?? []) {
        if (o.type !== "message") continue;
        for (const c of o.content) if (c.type === "output_text") text += c.text;
      }
      const json = JSON.parse(text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1));
      summary = String(json.summary ?? "");
      recommendations = Array.isArray(json.recommendations) ? json.recommendations.map(String).slice(0, 6) : [];
    } catch (e) {
      console.error("wardrobe digest AI failed", e);
      throw new Error("L'assistant IA est indisponible pour le moment. Réessayez plus tard.");
    }
    const { error } = await sb.from("wardrobe_digests").upsert(
      { week_start: weekStart(), summary, recommendations, status: "en_attente", validated_at: null },
      { onConflict: "week_start" },
    );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const reviewWardrobeDigest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid(), approve: z.boolean() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("wardrobe_digests")
      .update({ status: data.approve ? "validee" : "refusee", validated_at: new Date().toISOString() }).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
