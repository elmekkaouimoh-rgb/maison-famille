import { z } from "zod";

export const VEILLE_CATEGORIES = {
  devoir: { label: "Devoir", icon: "📚" },
  controle: { label: "Contrôle", icon: "📝" },
  note: { label: "Note", icon: "🎯" },
  message: { label: "Message", icon: "✉️" },
  rendez_vous: { label: "Rendez-vous", icon: "🤝" },
  changement_horaire: { label: "Changement d'horaire", icon: "⏰" },
  evenement: { label: "Événement scolaire", icon: "🏫" },
  absence: { label: "Absence", icon: "🚫" },
  retard: { label: "Retard", icon: "⏰" },
  observation: { label: "Observation", icon: "🗒️" },
  cours: { label: "Cours", icon: "🕘" },
  competence: { label: "Compétence", icon: "🧩" },
  bulletin: { label: "Bulletin", icon: "📄" },
  document: { label: "Document", icon: "📎" },
  moyenne: { label: "Moyenne", icon: "📊" },
} as const;
/** Categories the child may read by default; messages and appointments stay Papa-only. */
export const CHILD_DEFAULT_CATEGORIES: VeilleCategory[] = ["devoir", "controle", "note", "changement_horaire", "evenement", "absence", "retard", "observation", "cours", "competence", "bulletin", "document", "moyenne"];
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
  subject: opt(z.string().max(80)),
  period: opt(z.string().max(40)),
  coefficient: opt(z.number().nonnegative()),
  class_average: opt(z.number().finite()),
  grade_status: opt(z.enum(["note", "abs", "non_note"])),
  justified: opt(z.boolean()),
  document_url: opt(z.string().max(1000).regex(/^https:\/\//, "lien https attendu")),
  uncertainties: z.array(z.string().max(300)).max(20).nullish().transform((v) => v ?? []),
}).strict().superRefine((v, ctx) => {
  if (v.grade != null && v.out_of == null && v.grade_raw == null) ctx.addIssue({ code: "custom", message: "barème original requis pour une note" });
  if (v.grade_status === "note" && v.grade == null && v.grade_raw == null) ctx.addIssue({ code: "custom", message: "statut « note » sans valeur" });
  if (v.grade != null && v.category !== "note" && v.category !== "moyenne") ctx.addIssue({ code: "custom", message: "une valeur n'est permise que pour « note » ou « moyenne »" });
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

type Dated = { day: string | null; starts_at: string | null };
const dayOf = (i: Dated) => i.day ?? (i.starts_at ? i.starts_at.slice(0, 10) : null);
/** Groups homework into Aujourd'hui / Demain / Cette semaine / Plus tard / Sans date / Historique (past). */
export function groupHomework<T extends Dated>(items: T[], today: string) {
  const t = new Date(today + "T12:00:00");
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  const tomorrow = iso(new Date(t.getTime() + 864e5));
  const weekEnd = iso(new Date(t.getTime() + 7 * 864e5));
  const g: Record<"today" | "tomorrow" | "week" | "later" | "undated" | "history", T[]> = { today: [], tomorrow: [], week: [], later: [], undated: [], history: [] };
  for (const i of items) {
    const d = dayOf(i);
    if (!d) g.undated.push(i);
    else if (d < today) g.history.push(i);
    else if (d === today) g.today.push(i);
    else if (d === tomorrow) g.tomorrow.push(i);
    else if (d <= weekEnd) g.week.push(i);
    else g.later.push(i);
  }
  g.history.reverse();
  return g;
}
/** Grade text exactly as imported: Abs / Non noté are never turned into a number. */
export function gradeLabel(i: { grade: number | null; out_of: number | null; grade_raw: string | null; grade_status: string | null }) {
  if (i.grade_status === "abs") return "Abs";
  if (i.grade_status === "non_note") return "Non noté";
  if (i.grade != null && i.out_of == null && i.grade_raw) return i.grade_raw;
  if (i.grade != null) return i.out_of != null ? `${frNum(i.grade)}/${frNum(i.out_of)}` : frNum(i.grade);
  return i.grade_raw ?? "—";
}
/** Simple homework status; "non coché" is never shown as failed or not done. */
export function homeworkStatus(done: string) {
  return done === "fait" ? "Fait" : done === "non_fait" ? "Non fait" : done === "non_coche" ? "Pas encore coché" : null;
}
/** French decimal comma, no rounding. */
export const frNum = (n: number) => String(n).replace(".", ",");
