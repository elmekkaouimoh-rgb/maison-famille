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

/** Monday (yyyy-MM-dd) of the week containing `d`. */
export function weekStart(d: Date = new Date()) {
  const x = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = (x.getUTCDay() + 6) % 7;
  x.setUTCDate(x.getUTCDate() - day);
  return x.toISOString().slice(0, 10);
}

/** Recommendations are only shown once the parent has validated the digest. */
export function visibleRecommendations(d: { status: string; recommendations: unknown } | null | undefined): string[] {
  if (!d || d.status !== "validee" || !Array.isArray(d.recommendations)) return [];
  return d.recommendations.map(String);
}
