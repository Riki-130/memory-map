const { onRequest } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");

const placesApiKey = defineSecret("PLACES_API_KEY");

exports.searchPlaces = onRequest(
  { region: "asia-northeast1", secrets: [placesApiKey], cors: true },
  async (request, response) => {
    if (request.method !== "POST") {
      response.status(405).json({ error: "POST only" });
      return;
    }

    const textQuery = String(request.body?.query || "").trim();
    if (!textQuery) {
      response.status(400).json({ error: "query is required" });
      return;
    }

    const upstream = await fetch("https://places.googleapis.com/v1/places:searchText", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": placesApiKey.value(),
        "X-Goog-FieldMask": "places.id,places.displayName,places.formattedAddress,places.location"
      },
      body: JSON.stringify({
        textQuery,
        languageCode: "ja",
        regionCode: "JP",
        maxResultCount: 8
      })
    });

    const data = await upstream.json();
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
      lng: place.location?.longitude
    })).filter((place) => Number.isFinite(place.lat) && Number.isFinite(place.lng));

    response.json({ places });
  }
);
