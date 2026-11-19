import { describe, expect, it } from "vitest";
import { validateVeilleItems } from "./veille";
const S = "00000000-0000-4000-8000-000000000001", M = "00000000-0000-4000-8000-000000000002";
const base = { member_id: M, source_id: S, source_key: "k1", category: "devoir", title: "Exercice", collected_at: "2026-11-19T18:00:00+01:00" };
describe("veille validation", () => {
  it("absent fields become null, never invented dates", () => {
    const { valid } = validateVeilleItems([base], S);
    expect(valid[0]!.day).toBeNull(); expect(valid[0]!.starts_at).toBeNull(); expect(valid[0]!.done_state).toBe("inconnu");
  });
  it("keeps 'non coché' distinct from 'non fait'", () => {
    expect(validateVeilleItems([{ ...base, done_state: "non_coche" }], S).valid[0]!.done_state).toBe("non_coche");
  });
  it("refuses another source", () => {
    expect(validateVeilleItems([{ ...base, source_id: M }], S).errors).toHaveLength(1);
  });
  it("refuses unknown type and unknown fields", () => {
    expect(validateVeilleItems([{ ...base, category: "type_inconnu" }, { ...base, password: "x" }], S).errors).toHaveLength(2);
  });
  it("note requires original scale", () => {
    expect(validateVeilleItems([{ ...base, category: "note", grade: 15 }], S).errors).toHaveLength(1);
    expect(validateVeilleItems([{ ...base, category: "note", grade: 15, out_of: 20 }], S).valid).toHaveLength(1);
  });
  it("collected_at needs a timezone", () => {
    expect(validateVeilleItems([{ ...base, collected_at: "2026-11-19T18:00:00" }], S).errors).toHaveLength(1);
  });
});
import { groupHomework, gradeLabel, homeworkStatus } from "./veille";
describe("veille school display", () => {
  it("groups homework by day", () => {
    const g = groupHomework([{ day: "2026-11-19", starts_at: null }, { day: "2026-11-20", starts_at: null }, { day: "2026-11-24", starts_at: null }, { day: "2026-11-10", starts_at: null }, { day: null, starts_at: null }], "2026-11-19");
    expect([g.today.length, g.tomorrow.length, g.week.length, g.history.length, g.undated.length]).toEqual([1, 1, 1, 1, 1]);
  });
  it("Abs and Non noté are never a zero", () => {
    expect(gradeLabel({ grade: null, out_of: 20, grade_raw: null, grade_status: "abs" })).toBe("Abs");
    expect(gradeLabel({ grade: null, out_of: 20, grade_raw: null, grade_status: "non_note" })).toBe("Non noté");
    expect(gradeLabel({ grade: 14.5, out_of: 20, grade_raw: null, grade_status: "note" })).toBe("14.5/20");
  });
  it("unchecked homework is not 'not done'", () => {
    expect(homeworkStatus("non_coche")).toBe("Pas encore coché");
    expect(homeworkStatus("inconnu")).toBeNull();
  });
  it("accepts new categories with original scale", () => {
    const S = "00000000-0000-4000-8000-000000000001";
    const r = validateVeilleItems([{ member_id: S, source_id: S, source_key: "a", category: "absence", title: "x", collected_at: "2026-11-19T18:00:00+01:00", justified: false }], S);
    expect(r.errors).toHaveLength(0);
  });
});
