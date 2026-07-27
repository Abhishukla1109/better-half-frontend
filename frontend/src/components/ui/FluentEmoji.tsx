"use client";

// Maps emoji character → Fluent Emoji folder name (microsoft/fluentui-emoji)
const FLUENT_MAP: Record<string, string> = {
  "💊": "Pill",
  "🌿": "Herb",
  "🥛": "Glass of Milk",
  "💪": "Flexed Biceps",
  "🩸": "Drop of Blood",
  "🌙": "Crescent Moon",
  "⚡": "High Voltage",
  "🔥": "Fire",
  "✨": "Sparkles",
  "🔬": "Microscope",
  "🧴": "Lotion Bottle",
  "😴": "Sleeping Face",
  "💧": "Droplet",
  "🧘": "Person in Lotus Position",
  "☀️": "Sun",
  "✋": "Raised Hand",
  "🥗": "Green Salad",
  "💇": "Person Getting Haircut",
  "🏋️": "Person Lifting Weights",
  "🧬": "Dna",
  "🌱": "Seedling",
  "🤱": "Breast-Feeding",
  "🔴": "Red Circle",
  "❄️": "Snowflake",
  "🌅": "Sunrise",
  "🌳": "Deciduous Tree",
  "🛌": "Person in Bed",
  "📵": "No Mobile Phones",
  "📖": "Open Book",
  "🧠": "Brain",
  "🥜": "Peanuts",
  "🚫": "Prohibited",
  "🌞": "Sun with Face",
  "🍌": "Banana",
  "💤": "Zzz",
  "🍎": "Red Apple",
  "🚿": "Shower",
  "🦴": "Bone",
  "🛡️": "Shield",
  "🩺": "Stethoscope",
  "🎯": "Bullseye",
  "🏆": "Trophy",
  "🌸": "Cherry Blossom",
  "👶": "Baby",
  "🌟": "Glowing Star",
  "🏃": "Person Running",
  "💆": "Person Getting Massage",
  "🧔": "Person Beard",
  "🌾": "Sheaf of Rice",
  "🍃": "Leaf Fluttering in Wind",
  "🎉": "Party Popper",
  "⭐": "Star",
  "❤️": "Red Heart",
  "💦": "Sweat Droplets",
  "📏": "Straight Ruler",
  "🧒": "Child",
  "🥚": "Egg",
  "🍋": "Lemon",
  "🐟": "Fish",
  "🥩": "Cut of Meat",
  "🥦": "Broccoli",
  "🎒": "Backpack",
};

function buildUrl(name: string): string {
  const file = name.toLowerCase().replace(/ /g, "_");
  return `https://cdn.jsdelivr.net/gh/microsoft/fluentui-emoji@main/assets/${encodeURIComponent(name)}/Flat/${file}_flat.svg`;
}

export default function FluentEmoji({
  emoji,
  size = 20,
  className = "",
}: {
  emoji: string;
  size?: number;
  className?: string;
}) {
  const name = FLUENT_MAP[emoji];
  if (!name) return <span className={className}>{emoji}</span>;

  return (
    <img
      src={buildUrl(name)}
      alt={emoji}
      width={size}
      height={size}
      className={`inline-block shrink-0 ${className}`}
      onError={(e) => {
        const span = document.createElement("span");
        span.textContent = emoji;
        e.currentTarget.replaceWith(span);
      }}
    />
  );
}
