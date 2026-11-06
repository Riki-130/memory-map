// Pin categories. `types` are Google Places types used to auto-pick a category;
// the first matching category wins, so more specific ones come first.
export const CATEGORIES = [
  { id: "restaurant", label: "飲食店", icon: "🍽️", types: ["restaurant", "food", "meal_takeaway", "bar", "bakery"] },
  { id: "cafe", label: "カフェ", icon: "☕", types: ["cafe", "coffee_shop"] },
  { id: "amusement", label: "遊園地・レジャー", icon: "🎢", types: ["amusement_park", "aquarium", "zoo", "bowling_alley", "movie_theater"] },
  { id: "museum", label: "美術館・博物館", icon: "🎨", types: ["museum", "art_gallery"] },
  { id: "shrine", label: "神社・寺", icon: "⛩️", types: ["place_of_worship", "hindu_temple", "church", "shinto_shrine", "buddhist_temple"] },
  { id: "nature", label: "公園・自然", icon: "🌳", types: ["park", "natural_feature", "campground", "beach", "hiking_area"] },
  { id: "lodging", label: "宿泊", icon: "🏨", types: ["lodging", "hotel"] },
  { id: "shopping", label: "ショッピング", icon: "🛍️", types: ["shopping_mall", "store", "department_store", "clothing_store"] },
  { id: "sightseeing", label: "観光地", icon: "🧳", types: ["tourist_attraction", "landmark", "historical_landmark", "observation_deck"] },
  { id: "other", label: "その他", icon: "📍", types: [] }
];

export const PIN_TYPES = {
  memory: { label: "思い出", color: "var(--teal)" },
  wishlist: { label: "行ってみたい", color: "var(--butter-strong)" }
};

export function categoryById(id) {
  return CATEGORIES.find((category) => category.id === id) || CATEGORIES.at(-1);
}

export function categoryFromPlaceTypes(types = []) {
  const set = new Set(types);
  return CATEGORIES.find((category) => category.types.some((type) => set.has(type))) || CATEGORIES.at(-1);
}

export const ICON_CHOICES = [
  ...new Set([
    ...CATEGORIES.map((category) => category.icon),
    "❤️", "⭐", "🍣", "🍜", "🍰", "🍺", "🏖️", "🗻", "🎡", "🎆", "🚗", "✈️", "🚃", "🏯", "♨️", "🎁"
  ])
];
