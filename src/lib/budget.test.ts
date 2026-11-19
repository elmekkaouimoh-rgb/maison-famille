import { describe, expect, it } from "vitest";
import { summarize } from "./budget";
describe("budget", () => {
  it("income is not counted as an expense", () => {
    const s = summarize([{ kind: "revenu", category: "revenu", amount: 2000, member_id: null }, { kind: "depense", category: "ecole", amount: 45.5, member_id: "maya" }]);
    expect(s.expenses).toBe(45.5);
    expect(s.income).toBe(2000);
    expect(s.byMember["maya"]).toBe(45.5);
  });
});
