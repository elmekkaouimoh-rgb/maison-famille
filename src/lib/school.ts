export const SCHOOL_KINDS: Record<string, { label: string; icon: string }> = {
  devoir: { label: "Devoir", icon: "📚" },
  controle: { label: "Contrôle", icon: "📝" },
  note: { label: "Note", icon: "🎯" },
  absence: { label: "Absence", icon: "🚫" },
  retard: { label: "Retard", icon: "⏰" },
  rdv: { label: "RDV enseignant", icon: "🤝" },
  fourniture: { label: "Fourniture", icon: "✏️" },
  vacances: { label: "Vacances scolaires", icon: "🏖️" },
};
type Item = { kind: string; grade: number | null; out_of: number | null; done: boolean; subject: string | null };
/** Average of all notes brought back to /20, homework completion %, average per subject. */
export function schoolProgress(items: Item[]) {
  const notes = items.filter((i) => i.kind === "note" && i.grade != null && (i.out_of ?? 20) > 0);
  const on20 = (i: Item) => (Number(i.grade) / Number(i.out_of ?? 20)) * 20;
  const average = notes.length ? Math.round((notes.reduce((s, i) => s + on20(i), 0) / notes.length) * 10) / 10 : null;
  const hw = items.filter((i) => i.kind === "devoir");
  const homeworkDone = hw.length ? Math.round((hw.filter((i) => i.done).length / hw.length) * 100) : null;
  const bySubject: Record<string, number[]> = {};
  for (const n of notes) (bySubject[n.subject || "Autre"] ??= []).push(on20(n));
  const subjects = Object.entries(bySubject).map(([subject, v]) => ({ subject, average: Math.round((v.reduce((a, b) => a + b, 0) / v.length) * 10) / 10 }));
  return { average, homeworkDone, subjects };
}
