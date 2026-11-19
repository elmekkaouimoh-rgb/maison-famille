export const BUDGET_CATEGORIES = [
  { key: "courses", label: "Courses", icon: "🛒" },
  { key: "vetements", label: "Vêtements", icon: "👕" },
  { key: "ecole", label: "École", icon: "🏫" },
  { key: "sante", label: "Santé", icon: "🩺" },
  { key: "loisirs", label: "Loisirs", icon: "🎡" },
  { key: "factures", label: "Factures", icon: "🧾" },
  { key: "autre", label: "Autre", icon: "📦" },
];
const fmt = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" });
export const eur = (n: number) => fmt.format(n);
type Tx = { kind: string; category: string; amount: number; member_id: string | null };
export function summarize(tx: Tx[]) {
  let income = 0, expenses = 0;
  const byCategory: Record<string, number> = {};
  const byMember: Record<string, number> = {};
  for (const t of tx) {
    if (t.kind === "revenu") { income += t.amount; continue; }
    expenses += t.amount;
    byCategory[t.category] = (byCategory[t.category] ?? 0) + t.amount;
    if (t.member_id) byMember[t.member_id] = (byMember[t.member_id] ?? 0) + t.amount;
  }
  return { income, expenses, byCategory, byMember };
}
