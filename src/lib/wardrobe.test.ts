import { describe, expect, it } from "vitest";
import { shoppingBudget, sizesAreStale } from "./wardrobe";

describe("garde-robe", () => {
  it("budget = prix × quantité des besoins non achetés", () => {
    expect(shoppingBudget([
      { kind: "besoin", price: 20, quantity: 2, done: false },
      { kind: "besoin", price: 50, quantity: 1, done: true },
      { kind: "transmettre", price: 10, quantity: 1, done: false },
    ])).toBe(40);
  });
  it("tailles à remesurer après 6 mois", () => {
    const today = new Date("2026-11-19");
    expect(sizesAreStale("2026-04-01", today)).toBe(true);
    expect(sizesAreStale("2026-08-01", today)).toBe(false);
  });
});
