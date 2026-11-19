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
