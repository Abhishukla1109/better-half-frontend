// Shared concern-based styling utilities.
// Used by protocol, explore, and any future page that needs concern colour mapping.

export function getConcernCategoryStyle(label: string): { text: string; line: string } {
  const k = label.toLowerCase();
  if (k.includes("hair") || k.includes("beard")) return { text: "text-rose-600",   line: "bg-rose-500/20"   };
  if (k.includes("skin") || k.includes("acne"))  return { text: "text-amber-600",  line: "bg-amber-500/20"  };
  if (k.includes("weight"))                       return { text: "text-orange-600", line: "bg-orange-500/20" };
  if (k.includes("energy") || k.includes("gut")) return { text: "text-yellow-700", line: "bg-yellow-500/20" };
  if (k.includes("sleep") || k.includes("mind")) return { text: "text-indigo-600", line: "bg-indigo-500/20" };
  if (k.includes("hormone"))                      return { text: "text-teal-600",   line: "bg-teal-500/20"   };
  return { text: "text-on-surface", line: "bg-outline-variant/15" };
}

export function getConcernCardBg(concern: string): string {
  const k = concern.toLowerCase();
  if (k.includes("hair") || k.includes("beard")) return "bg-rose-500/8 border-rose-500/15";
  if (k.includes("skin") || k.includes("acne"))  return "bg-amber-500/8 border-amber-500/15";
  if (k.includes("weight"))                       return "bg-orange-500/8 border-orange-500/15";
  if (k.includes("energy") || k.includes("gut")) return "bg-emerald-500/8 border-emerald-500/15";
  if (k.includes("sleep") || k.includes("mind")) return "bg-indigo-500/8 border-indigo-500/15";
  if (k.includes("hormone"))                      return "bg-teal-500/8 border-teal-500/15";
  return "bg-surface-container-low border-outline-variant/10";
}

export function getConcernTagStyle(c: string): string {
  const k = c.toLowerCase();
  if (k.includes("hair") || k.includes("beard")) return "bg-rose-500/10 text-rose-700 border-rose-500/20";
  if (k.includes("skin") || k.includes("acne"))  return "bg-amber-500/10 text-amber-700 border-amber-500/20";
  if (k.includes("energy") || k.includes("gut")) return "bg-yellow-500/10 text-yellow-700 border-yellow-500/20";
  if (k.includes("weight"))                       return "bg-orange-500/10 text-orange-700 border-orange-500/20";
  if (k.includes("sleep") || k.includes("mind")) return "bg-indigo-500/10 text-indigo-700 border-indigo-500/20";
  if (k.includes("hormone"))                      return "bg-teal-500/10 text-teal-700 border-teal-500/20";
  return "bg-primary-container/10 text-primary-container border-primary-container/20";
}

export function getSupplementEmoji(name: string): string {
  const n = name.toLowerCase();
  if (n.includes("biotin") || n.includes("dht") || n.includes("keratin"))          return "💊";
  if (n.includes("ashwagandha") || n.includes("shilajit") || n.includes("adaptogen")) return "🌿";
  if (n.includes("whey") || n.includes("protein") || n.includes("bcaa"))           return "🥛";
  if (n.includes("creatine"))                                                        return "💪";
  if (n.includes("probiotic") || n.includes("gut") || n.includes("digestive"))     return "🦠";
  if (n.includes("iron") || n.includes("ferrous"))                                  return "🩸";
  if (n.includes("magnesium"))                                                       return "💤";
  if (n.includes("melatonin") || n.includes("theanine"))                            return "🌙";
  if (n.includes("coenzyme") || n.includes("coq10") || n.includes("q10"))          return "⚡";
  if (n.includes("l-carnitine") || n.includes("carnitine"))                         return "🔥";
  if (n.includes("vitamin") || n.includes("multivitamin") || n.includes("b12"))    return "✨";
  if (n.includes("collagen") || n.includes("glow") || n.includes("skin"))          return "✨";
  if (n.includes("omega") || n.includes("fish oil"))                                return "🐟";
  if (n.includes("zinc") || n.includes("selenium") || n.includes("chromium"))      return "🔬";
  if (n.includes("hair") || n.includes("serum") || n.includes("scalp"))            return "💆";
  return "💊";
}

export function getHabitStyle(tip: string, isVeg = false): { emoji: string; bg: string } {
  const t = tip.toLowerCase();
  if (t.includes("hair") || t.includes("scalp") || t.includes("hairstyle") || t.includes("dandruff"))
    return { emoji: "💆", bg: "bg-rose-500/12" };
  if (t.includes("skin") || t.includes("acne") || t.includes("moistur") || t.includes("sunscreen") || t.includes("face wash"))
    return { emoji: "🧴", bg: "bg-amber-500/12" };
  if (t.includes("sleep") || t.includes("bed") || t.includes("screen time"))
    return { emoji: "😴", bg: "bg-indigo-500/12" };
  if (t.includes("protein"))
    return { emoji: isVeg ? "🥚" : "💪", bg: "bg-emerald-500/12" };
  if (t.includes("water") || t.includes("rinse") || t.includes("cold shower") || t.includes("hydrat"))
    return { emoji: "💧", bg: "bg-sky-500/12" };
  if (t.includes("exercise") || t.includes("workout") || t.includes("walk") || t.includes("step") || t.includes("gym"))
    return { emoji: "🏃", bg: "bg-orange-500/12" };
  if (t.includes("stress") || t.includes("meditat") || t.includes("breath") || t.includes("mind"))
    return { emoji: "🧘", bg: "bg-violet-500/12" };
  if (t.includes("sun") || t.includes("vitamin d") || t.includes("morning light"))
    return { emoji: "☀️", bg: "bg-amber-500/12" };
  if (t.includes("sugar") || t.includes("dairy") || t.includes("junk") || t.includes("avoid") || t.includes("cut "))
    return { emoji: "✋", bg: "bg-red-500/10" };
  if (t.includes("eat") || t.includes("meal") || t.includes("diet") || t.includes("food") || t.includes("nutrient"))
    return { emoji: "🥗", bg: "bg-emerald-500/10" };
  return { emoji: "⚡", bg: "bg-surface-container-low" };
}
