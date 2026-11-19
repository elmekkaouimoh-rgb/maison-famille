import { differenceInYears, format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";

export const EMAIL_DOMAIN = "familyos.app";
export function normalizeUsername(u: string) {
  return u.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9._-]/g, "");
}
export function usernameToEmail(u: string) {
  return `${normalizeUsername(u)}@${EMAIL_DOMAIN}`;
}

/** Age in full years, Europe/Paris calendar day. */
export function ageFrom(birth: string, today: Date = new Date()) {
  return differenceInYears(today, parseISO(birth));
}
export function fmtDate(d: string | Date) {
  return format(typeof d === "string" ? parseISO(d) : d, "dd/MM/yyyy", { locale: fr });
}
export function fmtTime(d: string | Date) {
  return format(typeof d === "string" ? parseISO(d) : d, "HH:mm", { locale: fr });
}

/** Interface automatically suggested from age. */
export function interfaceForAge(age: number) {
  if (age >= 18) return "adulte";
  if (age >= 12) return "ado";
  if (age >= 8) return "enfant";
  if (age >= 5) return "aventure";
  if (age >= 4) return "petite";
  return "toutpetit";
}
/** Can this member log in on their own? Toddlers are piloted by the parent. */
export function canLogInAlone(age: number) {
  return age >= 5;
}

export const ROLE_LABELS: Record<string, string> = {
  admin: "Administrateur principal",
  adulte: "Adulte autorisé",
  ado: "Adolescent",
  enfant: "Enfant",
  petit: "Petit enfant (géré par le parent)",
};
export const INTERFACE_LABELS: Record<string, string> = {
  admin: "Papa",
  adulte: "Adulte",
  ado: "Adolescente",
  enfant: "Enfant ludique",
  aventure: "Aventure & défis",
  petite: "Petite enfant (images)",
  toutpetit: "Tout-petit",
};
export const TASK_STATUS: Record<string, string> = {
  a_faire: "À faire",
  en_cours: "En cours",
  terminee: "Terminée",
  en_attente: "En attente de validation",
  validee: "Validée",
};
export const EVENT_CATEGORIES: Record<string, { label: string; icon: string }> = {
  rdv: { label: "Rendez-vous", icon: "📌" },
  ecole: { label: "École", icon: "🏫" },
  sport: { label: "Sport", icon: "⚽" },
  sortie: { label: "Sortie", icon: "🎡" },
  vacances: { label: "Vacances", icon: "🏖️" },
  anniversaire: { label: "Anniversaire", icon: "🎂" },
  medical: { label: "Médical", icon: "🩺" },
};
export const TASK_TEMPLATES = [
  { title: "Ranger sa chambre", icon: "🧹", minAge: 5, points: 20 },
  { title: "Ranger ses jouets", icon: "🧸", minAge: 2, points: 5 },
  { title: "Faire son lit", icon: "🛏️", minAge: 6, points: 10 },
  { title: "Préparer son sac", icon: "🎒", minAge: 6, points: 10 },
  { title: "Mettre la table", icon: "🍴", minAge: 5, points: 10 },
  { title: "Débarrasser la table", icon: "🍽️", minAge: 6, points: 10 },
  { title: "Ranger ses vêtements", icon: "👕", minAge: 4, points: 10 },
  { title: "Aider à la maison", icon: "🏠", minAge: 8, points: 15 },
];
export function templatesForAge(age: number) {
  return TASK_TEMPLATES.filter((t) => age >= t.minAge);
}

type Ev = { start_at: string; recurrence: string };
/** Expand recurring events into occurrences inside [from, to]. */
export function expandEvents<T extends Ev>(events: T[], from: Date, to: Date): (T & { occ: Date })[] {
  const out: (T & { occ: Date })[] = [];
  for (const e of events) {
    let d = parseISO(e.start_at);
    let guard = 0;
    while (d <= to && guard < 800) {
      if (d >= from) out.push({ ...e, occ: new Date(d) });
      guard++;
      const n = new Date(d);
      if (e.recurrence === "quotidienne") n.setDate(n.getDate() + 1);
      else if (e.recurrence === "hebdomadaire") n.setDate(n.getDate() + 7);
      else if (e.recurrence === "mensuelle") n.setMonth(n.getMonth() + 1);
      else if (e.recurrence === "annuelle") n.setFullYear(n.getFullYear() + 1);
      else break;
      d = n;
    }
  }
  return out.sort((a, b) => a.occ.getTime() - b.occ.getTime());
}
