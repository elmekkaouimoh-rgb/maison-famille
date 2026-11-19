import { z } from "zod";

export const VEILLE_CATEGORIES = {
  devoir: { label: "Devoir", icon: "📚" },
  controle: { label: "Contrôle", icon: "📝" },
  note: { label: "Note", icon: "🎯" },
  message: { label: "Message", icon: "✉️" },
  rendez_vous: { label: "Rendez-vous", icon: "🤝" },
  changement_horaire: { label: "Changement d'horaire", icon: "⏰" },
  evenement: { label: "Événement scolaire", icon: "🏫" },
} as const;
export type VeilleCategory = keyof typeof VEILLE_CATEGORIES;
export const DONE_STATES = { fait: "Fait (indiqué par la source)", non_fait: "Non fait (confirmé)", non_coche: "Non coché sur la source", inconnu: "Inconnu" } as const;

const opt = (s: z.ZodTypeAny) => s.nullish().transform((v) => (v ?? null));
const isoTz = z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:\d{2})$/, "date/heure ISO avec fuseau attendue");

export const veilleItemSchema = z.object({
  member_id: z.string().uuid(),
  source_id: z.string().uuid(),
  source_key: z.string().trim().min(1).max(200),
  category: z.enum(Object.keys(VEILLE_CATEGORIES) as [VeilleCategory, ...VeilleCategory[]]),
  title: z.string().trim().min(1).max(300),
  description: opt(z.string().max(5000)),
  day: opt(z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "date AAAA-MM-JJ attendue")),
  starts_at: opt(isoTz),
  ends_at: opt(isoTz),
  location: opt(z.string().max(200)),
  grade: opt(z.number().finite()),
  out_of: opt(z.number().positive()),
  grade_raw: opt(z.string().max(50)),
  source_status: opt(z.string().max(100)),
  done_state: z.enum(["fait", "non_fait", "non_coche", "inconnu"]).nullish().transform((v) => v ?? "inconnu"),
  collected_at: isoTz,
  uncertainties: z.array(z.string().max(300)).max(20).nullish().transform((v) => v ?? []),
}).strict().superRefine((v, ctx) => {
  if (v.grade != null && v.out_of == null && v.grade_raw == null) ctx.addIssue({ code: "custom", message: "barème original requis pour une note" });
  if (v.grade != null && v.category !== "note") ctx.addIssue({ code: "custom", message: "une note n'est permise que pour le type « note »" });
});

export const veilleImportSchema = z.object({
  source_id: z.string().uuid(),
  items: z.array(z.unknown()).min(1).max(500),
}).strict();

/** Validates every entry; returns valid ones and per-index errors. Never fills missing fields with invented values. */
export function validateVeilleItems(items: unknown[], sourceId: string) {
  const valid: z.infer<typeof veilleItemSchema>[] = [];
  const errors: { index: number; reason: string }[] = [];
  items.forEach((raw, index) => {
    const r = veilleItemSchema.safeParse(raw);
    if (!r.success) errors.push({ index, reason: r.error.issues.map((i) => `${i.path.join(".") || "entrée"} : ${i.message}`).join(" ; ") });
    else if (r.data.source_id !== sourceId) errors.push({ index, reason: "source différente de la source choisie" });
    else valid.push(r.data);
  });
  return { valid, errors };
}
