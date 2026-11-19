import { describe, expect, it } from "vitest";
import { subjectTone, unifySchool } from "./school-unified";
describe("unified school view", () => {
  it("does not show a manual entry twice when the same item was imported", () => {
    const u = unifySchool([{ id: "m", kind: "devoir", subject: null, title: "Exercice 1", due_date: "2026-11-20", grade: null, out_of: null, done: false }],
      [{ id: "i", category: "devoir", title: "exercice 1", day: "2026-11-20", starts_at: null, done_state: "non_coche" }]);
    expect(u.map((e) => e.id)).toEqual(["i"]);
  });
  it("keeps distinct manual entries", () => {
    expect(unifySchool([{ id: "m", kind: "note", title: "A", due_date: null, grade: 12, out_of: 20, done: false }], []).length).toBe(1);
  });
  it("manual unchecked homework is unknown, not 'not done'", () => {
    expect(unifySchool([{ id: "m", kind: "devoir", title: "A", due_date: null, done: false }], [])[0]!.done_state).toBe("inconnu");
  });
  it("subject tone is stable", () => { expect(subjectTone("Maths")).toBe(subjectTone("maths")); });
});
import { mergeCourses, type SchoolEntry } from "./school-unified";
const mk = (o: Partial<SchoolEntry>): SchoolEntry => ({ id: "x", origin: "import", kind: "cours", subject: null, title: "T", description: null, day: "2026-11-20", starts_at: "2026-11-20T08:30:00+01:00", ends_at: "2026-11-20T09:25:00+01:00", location: "C103", grade: null, out_of: null, grade_raw: null, grade_status: null, period: null, coefficient: null, class_average: null, justified: null, document_url: null, done_state: "inconnu", ...o });
describe("course merge", () => {
  it("merges a course with a matching teacher-absent change, keeping both sources", () => {
    const r = mergeCourses([mk({ id: "c" }), mk({ id: "h", kind: "changement_horaire", title: "Espagnol : professeur absent" })]);
    expect(r).toHaveLength(1); expect(r[0]!.status).toBe("Professeur absent"); expect(r[0]!.merged!.map((e) => e.id)).toEqual(["c", "h"]);
  });
  it("does not merge when the room differs", () => {
    expect(mergeCourses([mk({ id: "c" }), mk({ id: "h", kind: "changement_horaire", title: "Cours annulé", location: "B1" })])).toHaveLength(2);
  });
  it("reads the course's own source status", () => {
    expect(mergeCourses([mk({ raw: { source_status: "Prof. absent" } })])[0]!.status).toBe("Professeur absent");
  });
});
