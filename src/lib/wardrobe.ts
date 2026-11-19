export type ClothingLike = { kind: string; price: number | null; quantity: number; done: boolean };

/** Budget estimé des vêtements à acheter encore non achetés. */
export function shoppingBudget(items: ClothingLike[]) {
  return items.filter((i) => i.kind === "besoin" && !i.done).reduce((s, i) => s + (Number(i.price) || 0) * (i.quantity || 1), 0);
}

/** Tailles à remesurer après 6 mois. */
export function sizesAreStale(updatedAt: string | null | undefined, today: Date = new Date()) {
  if (!updatedAt) return true;
  const d = new Date(updatedAt);
  const limit = new Date(today);
  limit.setMonth(limit.getMonth() - 6);
  return d < limit;
}
