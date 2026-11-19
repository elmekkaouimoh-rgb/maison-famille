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
    expect(validateVeilleItems([{ ...base, category: "bulletin" }, { ...base, password: "x" }], S).errors).toHaveLength(2);
  });
  it("note requires original scale", () => {
    expect(validateVeilleItems([{ ...base, category: "note", grade: 15 }], S).errors).toHaveLength(1);
    expect(validateVeilleItems([{ ...base, category: "note", grade: 15, out_of: 20 }], S).valid).toHaveLength(1);
  });
  it("collected_at needs a timezone", () => {
    expect(validateVeilleItems([{ ...base, collected_at: "2026-11-19T18:00:00" }], S).errors).toHaveLength(1);
  });
});
