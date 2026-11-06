const { onRequest } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const { initializeApp } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");

initializeApp();

const placesApiKey = defineSecret("PLACES_API_KEY");

// Browsers outside this list are rejected. Origin can be forged by non-browser
// clients, so the ID token check below is the real access control.
const ALLOWED_ORIGINS = [
  "https://riki-130.github.io",
  // Firebase Hosting preview channels used for testing on real devices.
  /^https:\/\/memory-map-rh130-2026103-eff07(--[a-z0-9-]+)?\.web\.app$/,
  /^http:\/\/localhost(:\d+)?$/,
  /^http:\/\/127\.0\.0\.1(:\d+)?$/
];

function isAllowedOrigin(origin) {
  return ALLOWED_ORIGINS.some((allowed) =>
    typeof allowed === "string" ? allowed === origin : allowed.test(origin)
  );
}

async function verifyUser(request) {
  const match = /^Bearer (.+)$/.exec(request.get("Authorization") || "");
  if (!match) {
    return null;
  }
  try {
    return await getAuth().verifyIdToken(match[1]);
  } catch (error) {
    console.warn("ID token verification failed", error.code || error.message);
    return null;
  }
}

exports.searchPlaces = onRequest(
  { region: "asia-northeast1", secrets: [placesApiKey], cors: ALLOWED_ORIGINS },
  async (request, response) => {
    if (!isAllowedOrigin(request.get("Origin") || "")) {
      response.status(403).json({ error: "Origin not allowed" });
      return;
    }

    if (request.method !== "POST") {
      response.status(405).json({ error: "POST only" });
      return;
    }

    const user = await verifyUser(request);
    if (!user) {
      response.status(401).json({ error: "Authentication required" });
      return;
    }

    const textQuery = String(request.body?.query || "").trim();
    if (!textQuery) {
      response.status(400).json({ error: "query is required" });
      return;
    }

    let upstream;
    let data;
    try {
      upstream = await fetch("https://places.googleapis.com/v1/places:searchText", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": placesApiKey.value(),
          "X-Goog-FieldMask": "places.id,places.displayName,places.formattedAddress,places.location,places.types"
        },
        body: JSON.stringify({
          textQuery,
          languageCode: "ja",
          regionCode: "JP",
          maxResultCount: 8
        }),
        signal: AbortSignal.timeout(10000)
      });
      data = await upstream.json();
    } catch (error) {
      console.error("Places API request failed", error);
      response.status(502).json({ error: "Places search failed" });
      return;
    }

    if (!upstream.ok) {
      console.error("Places API error", upstream.status, data);
      response.status(502).json({ error: "Places search failed" });
      return;
    }

    const places = (data.places || []).map((place) => ({
      id: place.id,
      name: place.displayName?.text || textQuery,
      address: place.formattedAddress || "",
      lat: place.location?.latitude,
      lng: place.location?.longitude,
      types: place.types || []
    })).filter((place) => Number.isFinite(place.lat) && Number.isFinite(place.lng));

    response.json({ places });
  }
);
