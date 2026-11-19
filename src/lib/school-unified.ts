/** One school entry, whether typed by Papa or imported. */
export type SchoolEntry = {
  id: string; origin: "manuel" | "import"; kind: string; subject: string | null; title: string; description: string | null;
  day: string | null; starts_at: string | null; ends_at: string | null; location: string | null;
  grade: number | null; out_of: number | null; grade_raw: string | null; grade_status: string | null;
  period: string | null; coefficient: number | null; class_average: number | null; justified: boolean | null;
  document_url: string | null; done_state: string; raw?: any;
};
const MANUAL_KIND: Record<string, string> = { devoir: "devoir", controle: "controle", note: "note", absence: "absence", retard: "retard", rdv: "rendez_vous", fourniture: "evenement", vacances: "evenement" };

export function fromManual(i: any): SchoolEntry {
  return { id: i.id, origin: "manuel", kind: MANUAL_KIND[i.kind] ?? "evenement", subject: i.subject, title: i.title, description: null,
    day: i.due_date, starts_at: null, ends_at: null, location: null, grade: i.grade == null ? null : Number(i.grade), out_of: i.out_of == null ? null : Number(i.out_of),
    grade_raw: null, grade_status: i.kind === "note" && i.grade != null ? "note" : null, period: null, coefficient: null, class_average: null, justified: null,
    document_url: null, done_state: i.kind === "devoir" || i.kind === "controle" ? (i.done ? "fait" : "inconnu") : "inconnu", raw: i };
}
export function fromImport(i: any): SchoolEntry {
  return { id: i.id, origin: "import", kind: i.category, subject: i.subject ?? null, title: i.title, description: i.description ?? null,
    day: i.day, starts_at: i.starts_at, ends_at: i.ends_at, location: i.location, grade: i.grade == null ? null : Number(i.grade), out_of: i.out_of == null ? null : Number(i.out_of),
    grade_raw: i.grade_raw, grade_status: i.grade_status ?? null, period: i.period ?? null, coefficient: i.coefficient == null ? null : Number(i.coefficient),
    class_average: i.class_average == null ? null : Number(i.class_average), justified: i.justified ?? null, document_url: i.document_url ?? null, done_state: i.done_state, raw: i };
}
export const entryDay = (e: { day: string | null; starts_at: string | null }) => e.day ?? (e.starts_at ? e.starts_at.slice(0, 10) : null);
const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, " ").trim();
/** Merge manual + imported entries; an imported entry wins over a manual one with the same kind, day and title. */
export function unifySchool(manual: any[], imported: any[]): SchoolEntry[] {
  const imp = imported.map(fromImport);
  const keys = new Set(imp.map((e) => `${e.kind}|${entryDay(e)}|${norm(e.title)}`));
  const man = manual.map(fromManual).filter((e) => !keys.has(`${e.kind}|${entryDay(e)}|${norm(e.title)}`));
  return [...imp, ...man].sort((a, b) => (entryDay(a) ?? "9999").localeCompare(entryDay(b) ?? "9999") || (a.starts_at ?? "").localeCompare(b.starts_at ?? ""));
}
const TONES = ["blue", "violet", "green", "orange", "pink"] as const;
/** Stable pastel tone per subject. */
export function subjectTone(subject: string | null) {
  if (!subject) return TONES[0];
  let h = 0; for (const c of norm(subject)) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return TONES[h % TONES.length]!;
}
