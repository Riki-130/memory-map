// Categories are identified by their icon. Each map stores its own editable list
// (maps/{mapId}.categories = [{ icon, label }]); pins only store `icon`, so renaming a
// category instantly renames it on every pin that uses that icon.

// Defaults, also used to auto-pick an icon from Google Places types (first match wins).
export const DEFAULT_CATEGORIES = [
  { icon: "🍽️", label: "飲食店", types: ["restaurant", "food", "meal_takeaway", "bar", "bakery"] },
  { icon: "☕", label: "カフェ", types: ["cafe", "coffee_shop"] },
  { icon: "🎢", label: "遊園地・レジャー", types: ["amusement_park", "aquarium", "zoo", "bowling_alley", "movie_theater"] },
  { icon: "🎨", label: "美術館・博物館", types: ["museum", "art_gallery"] },
  { icon: "⛩️", label: "神社・寺", types: ["place_of_worship", "hindu_temple", "church", "shinto_shrine", "buddhist_temple"] },
  { icon: "🌳", label: "公園・自然", types: ["park", "natural_feature", "campground", "beach", "hiking_area"] },
  { icon: "🏨", label: "宿泊", types: ["lodging", "hotel"] },
  { icon: "🛍️", label: "ショッピング", types: ["shopping_mall", "store", "department_store", "clothing_store"] },
  { icon: "🧳", label: "観光地", types: ["tourist_attraction", "landmark", "historical_landmark", "observation_deck"] },
  { icon: "📍", label: "その他", types: [] }
];

export const FALLBACK_ICON = "📍";

// Icons offered when adding or changing a category in settings.
export const ICON_PALETTE = [
  "🍽️", "🍣", "🍜", "🍝", "🍕", "🍔", "🥩", "🍛", "🍱", "🥟", "🍰", "🍦", "🍩", "🥐", "☕", "🍵", "🍺", "🍷", "🍸", "🧋",
  "🧳", "🗼", "🏯", "🏰", "⛩️", "🛕", "🗻", "🌋", "🏝️", "🏖️", "🌊", "♨️", "🌸", "🍁", "🌳", "🌻", "🌅", "🌃", "🎆", "⛺",
  "🎢", "🎡", "🎠", "🎪", "🎨", "🖼️", "🎭", "🎬", "🎤", "🎮", "🎳", "⚽", "⛳", "🏂", "🏊", "🐠", "🐼", "🦒",
  "🏨", "🏠", "🛍️", "🎁", "💐", "💍", "📷", "🚗", "🚃", "🚢", "✈️", "🚲",
  "❤️", "💕", "⭐", "✨", "🎉", "🎂", "📍"
];

export const PIN_TYPES = {
  memory: { label: "思い出" },
  wishlist: { label: "行ってみたい" }
};

const LEGACY_ICON_BY_ID = {
  restaurant: "🍽️", cafe: "☕", amusement: "🎢", museum: "🎨", shrine: "⛩️",
  nature: "🌳", lodging: "🏨", shopping: "🛍️", sightseeing: "🧳", other: "📍"
};

export function mapCategories(map) {
  const stored = map?.categories;
  return Array.isArray(stored) && stored.length > 0
    ? stored
    : DEFAULT_CATEGORIES.map(({ icon, label }) => ({ icon, label }));
}

// Pins created before categories were icon-based may only have `category`.
export function pinIcon(pin) {
  return pin.icon || LEGACY_ICON_BY_ID[pin.category] || FALLBACK_ICON;
}

export function categoryLabel(icon, categories) {
  return categories.find((category) => category.icon === icon)?.label || "カテゴリなし";
}

export function iconFromPlaceTypes(types = [], categories) {
  const set = new Set(types);
  const match = DEFAULT_CATEGORIES.find((category) => category.types.some((type) => set.has(type)));
  const icon = match?.icon || FALLBACK_ICON;
  if (categories.some((category) => category.icon === icon)) return icon;
  return categories.some((category) => category.icon === FALLBACK_ICON) ? FALLBACK_ICON : categories.at(-1)?.icon || FALLBACK_ICON;
}
