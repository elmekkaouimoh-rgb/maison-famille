import { describe, expect, it } from "vitest";
import { guessCategory } from "./meals";
describe("shopping categories", () => {
  it("milk goes to fresh products", () => expect(guessCategory("Lait demi-écrémé")).toBe("Produits frais"));
  it("diapers go to hygiene", () => expect(guessCategory("Couches taille 4")).toBe("Hygiène & maison"));
  it("unknown items default to Épicerie", () => expect(guessCategory("truc")).toBe("Épicerie"));
});
