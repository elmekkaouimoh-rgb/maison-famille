export const SHOP_CATEGORIES = [
  { name: "Fruits & légumes", icon: "🥕", words: ["pomme", "banane", "tomate", "carotte", "salade", "oignon", "ail", "courgette", "poivron", "citron", "orange", "fraise", "pomme de terre", "patate", "basilic", "persil", "concombre", "avocat", "brocoli", "épinard"] },
  { name: "Produits frais", icon: "🧀", words: ["lait", "yaourt", "fromage", "beurre", "crème", "oeuf", "œuf", "jambon", "mozzarella", "emmental"] },
  { name: "Viandes & poissons", icon: "🍗", words: ["poulet", "boeuf", "bœuf", "steak", "viande", "poisson", "saumon", "thon", "dinde", "agneau", "merguez", "crevette"] },
  { name: "Boulangerie", icon: "🥖", words: ["pain", "baguette", "brioche", "croissant", "biscotte"] },
  { name: "Épicerie", icon: "🥫", words: ["pâte", "riz", "farine", "sucre", "sel", "huile", "céréale", "chocolat", "biscuit", "confiture", "miel", "semoule", "lentille", "sauce", "épice"] },
  { name: "Boissons", icon: "🧃", words: ["eau", "jus", "sirop", "café", "thé"] },
  { name: "Hygiène & maison", icon: "🧴", words: ["savon", "shampo", "dentifrice", "couche", "lessive", "papier", "éponge", "liquide vaisselle", "lingette"] },
];
/** Put a shopping item in its aisle from keywords; unknown items go to Épicerie. */
export function guessCategory(name: string) {
  const n = ` ${name.toLowerCase().replace(/[^\p{L}\s]/gu, " ")}`;
  return SHOP_CATEGORIES.find((c) => c.words.some((w) => n.includes(` ${w}`)))?.name ?? "Épicerie";
}
