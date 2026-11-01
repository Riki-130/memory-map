const map = L.map("map").setView([35.681236, 139.767125], 13);

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 19,
  attribution: "&copy; OpenStreetMap contributors"
}).addTo(map);

const PIN_STORAGE_KEY = "memory-map:pins";

function loadPins() {
  try {
    const storedPins = JSON.parse(localStorage.getItem(PIN_STORAGE_KEY) || "[]");
    return Array.isArray(storedPins) ? storedPins : [];
  } catch (error) {
    console.warn("Saved pins could not be read.", error);
    return [];
  }
}

function savePins(pins) {
  try {
    localStorage.setItem(PIN_STORAGE_KEY, JSON.stringify(pins));
  } catch (error) {
    console.warn("Pins could not be saved.", error);
  }
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function normalizeJapaneseAddress(value) {
  const kanjiDigits = {
    零: "0",
    〇: "0",
    一: "1",
    二: "2",
    三: "3",
    四: "4",
    五: "5",
    六: "6",
    七: "7",
    八: "8",
    九: "9"
  };

  let normalized = value.normalize("NFKC").trim();

  normalized = normalized
    .replace(/[〒\s]/g, "")
    .replace(/−/g, "-");

  normalized = normalized.replace(
    /([一二三四五六七八九十]+)(丁目)/g,
    (match, number) => {
      let result = 0;

      if (number.includes("十")) {
        const parts = number.split("十");
        result += parts[0] === "" ? 10 : Number(kanjiDigits[parts[0]]) * 10;
        if (parts[1]) {
          [...parts[1]].forEach((character) => {
            result += Number(kanjiDigits[character] || 0);
          });
        }
      } else {
        [...number].forEach((character) => {
          result += Number(kanjiDigits[character] || 0);
        });
      }

      return `${result}丁目`;
    }
  );

  normalized = normalized.replace(/([一二三四五六七八九十]+)(番|号)/g,
    (match, number, suffix) => {
      let result = 0;

      [...number].forEach((character) => {
        result += Number(kanjiDigits[character] || 0);
      });

      return `${result}${suffix}`;
    });

  return normalized;
}

function makeSearchQueries(value) {
  const normalized = normalizeJapaneseAddress(value);
  const queries = [
    value.trim(),
    normalized,
    normalized.replace(/丁目/g, "-").replace(/番/g, "-").replace(/号/g, ""),
    normalized.replace(/^東京都/, ""),
    normalized.replace(/^大阪府/, ""),
    normalized.replace(/^京都府/, ""),
    normalized.replace(/^北海道/, ""),
    normalized.replace(/^[^都道府県]*(都|道|府|県)/, "")
  ];

  return [...new Set(queries.filter(Boolean))];
}

let clickPinCount = 0;
let savedPins = loadPins();
let activeList = "memory";
let markerById = new Map();

function renderPinList() {
  const container = document.querySelector("#pin-list");
  if (!container) return;

  container.replaceChildren();
  const visiblePins = savedPins.filter((pin) => (pin.type || "memory") === activeList);

  if (visiblePins.length === 0) {
    const empty = document.createElement("p");
    empty.className = "pin-list-empty";
    empty.textContent = activeList === "memory"
      ? "まだ思い出のピンがありません。"
      : "行ってみたい場所を追加するとここに表示されます。";
    container.append(empty);
    return;
  }

  visiblePins.forEach((pin) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "pin-list-item";
    button.textContent = pin.title;
    button.addEventListener("click", () => {
      map.setView([pin.lat, pin.lng], 16);
      markerById.get(pin.id)?.openPopup();
      closeAppMenu();
    });
    container.append(button);
  });
}

function openAppMenu() {
  document.querySelector("#app-menu")?.classList.add("open");
  document.querySelector("#menu-backdrop")?.classList.add("visible");
  document.querySelector("#app-menu")?.setAttribute("aria-hidden", "false");
  document.querySelector("#menu-open")?.setAttribute("aria-expanded", "true");
}

function closeAppMenu() {
  document.querySelector("#app-menu")?.classList.remove("open");
  document.querySelector("#menu-backdrop")?.classList.remove("visible");
  document.querySelector("#app-menu")?.setAttribute("aria-hidden", "true");
  document.querySelector("#menu-open")?.setAttribute("aria-expanded", "false");
}

function addRemovablePin(lat, lng, title, zoomAfterMove = false, pinId = null) {
  const marker = L.marker([Number(lat), Number(lng)]).addTo(map);
  const id = pinId || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  markerById.set(id, marker);

  marker.bindPopup(`
    <strong>${escapeHtml(title)}</strong><br>
    <button class="delete-pin" type="button">このピンを削除</button>
  `);

  marker.on("popupopen", (event) => {
    const button = event.popup.getElement().querySelector(".delete-pin");

    button?.addEventListener("click", () => {
      map.removeLayer(marker);
      markerById.delete(id);
      savedPins = savedPins.filter((pin) => pin.id !== id);
      savePins(savedPins);
      renderPinList();
    });
  });

  if (zoomAfterMove) {
    map.setView([Number(lat), Number(lng)], 16);
  }

  if (!pinId) {
    savedPins.push({ id, lat: Number(lat), lng: Number(lng), title, type: "memory" });
    savePins(savedPins);
    renderPinList();
    marker.openPopup();
  }
}

savedPins.forEach((pin) => {
  addRemovablePin(pin.lat, pin.lng, pin.title, false, pin.id);
});
renderPinList();

document.querySelector("#menu-open")?.addEventListener("click", openAppMenu);
document.querySelector("#menu-close")?.addEventListener("click", closeAppMenu);
document.querySelector("#menu-backdrop")?.addEventListener("click", closeAppMenu);
document.querySelectorAll(".menu-tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    activeList = tab.dataset.list;
    document.querySelectorAll(".menu-tab").forEach((item) => {
      item.classList.toggle("active", item === tab);
    });
    renderPinList();
  });
});

map.on("click", (event) => {
  clickPinCount += 1;
  addRemovablePin(
    event.latlng.lat,
    event.latlng.lng,
    `追加地点 ${clickPinCount}`
  );
});

async function searchWithGsi(query) {
  const url =
    "https://msearch.gsi.go.jp/address-search/AddressSearch?q=" +
    encodeURIComponent(query);

  const response = await fetch(url);

  if (!response.ok) {
    return [];
  }

  return response.json();
}

async function searchWithNominatim(query) {
  const parameters = new URLSearchParams({
    q: query,
    format: "jsonv2",
    limit: "5",
    countrycodes: "jp",
    addressdetails: "1",
    accept_language: "ja"
  });

  const response = await fetch(
    `https://nominatim.openstreetmap.org/search?${parameters}`,
    {
      headers: {
        Accept: "application/json"
      }
    }
  );

  if (!response.ok) {
    return [];
  }

  return response.json();
}

async function searchWithPhoton(query) {
  const parameters = new URLSearchParams({ q: query, limit: "8" });
  const response = await fetch(`https://photon.komoot.io/api/?${parameters}`);

  if (!response.ok) {
    return [];
  }

  return response.json();
}

function isAddressLike(query) {
  const normalized = normalizeJapaneseAddress(query);
  const hasPrefecture = /(?:東京都|北海道|京都府|大阪府|(?:[一-龥]{2,3}県))/.test(normalized);
  const hasMunicipality = /(?:都|道|府|県).*(?:市|区|町|村)/.test(normalized);
  const hasJapaneseHouseNumber = /(?:丁目|番地|番[0-9０-９]+号?|[0-9０-９]+[-－ー][0-9０-９]+)/.test(normalized);
  const hasBareMunicipalityAddress = /(?:市|区|町|村).*(?:[0-9]+[-－ー]|丁目|番地)/.test(normalized);

  return hasJapaneseHouseNumber || hasPrefecture || hasMunicipality || hasBareMunicipalityAddress;
}

function chooseBestPoiResult(results, query) {
  const compactQuery = normalizeJapaneseAddress(query).replace(/[\s\-－ー]/g, "");
  return [...results].sort((a, b) => {
    const aName = (a.properties?.name || "").replace(/[\s\-－ー]/g, "");
    const bName = (b.properties?.name || "").replace(/[\s\-－ー]/g, "");
    const aExact = aName === compactQuery ? 0 : 1;
    const bExact = bName === compactQuery ? 0 : 1;
    return aExact - bExact;
  });
}

async function searchPlaces(query) {
  const url = window.MEMORY_MAP_CONFIG?.placesSearchUrl;
  if (!url) {
    return [];
  }

  const cacheKey = `places-search:${query}`;
  try {
    const cached = sessionStorage.getItem(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }
  } catch (error) {
    console.warn("Search cache could not be read.", error);
  }

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query })
  });

  if (!response.ok) {
    throw new Error(`Places search failed: ${response.status}`);
  }

  const data = await response.json();
  const places = data.places || [];
  try {
    sessionStorage.setItem(cacheKey, JSON.stringify(places));
  } catch (error) {
    console.warn("Search cache could not be written.", error);
  }
  return places;
}

function showPlaceCandidates(places, query) {
  const container = document.querySelector("#search-candidates");
  container.replaceChildren();

  places.forEach((place) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "search-candidate";

    const name = document.createElement("strong");
    name.textContent = place.name;
    const address = document.createElement("span");
    address.textContent = place.address || `Place ID: ${place.id}`;
    button.append(name, address);

    button.addEventListener("click", () => {
      container.classList.remove("visible");
      const title = `${place.name}\n${place.address}`;
      addRemovablePin(place.lat, place.lng, title, true);
      document.querySelector("#address-input").value = place.name;
    });

    container.append(button);
  });

  container.classList.toggle("visible", places.length > 0);
}

document.querySelector("#address-search").addEventListener("submit", async (event) => {
  event.preventDefault();

  const input = document.querySelector("#address-input");
  const searchButton = event.currentTarget.querySelector("button");
  const query = input.value.trim();

  if (!query) {
    return;
  }

  searchButton.disabled = true;
  searchButton.textContent = "検索中...";

  try {
    let found = null;

    const places = await searchPlaces(query);
    if (places.length > 0) {
      showPlaceCandidates(places, query);
      return;
    }

    document.querySelector("#search-candidates").classList.remove("visible");

    if (isAddressLike(query)) {
      for (const candidate of makeSearchQueries(query)) {
        const gsiResults = await searchWithGsi(candidate);

        if (gsiResults.length > 0) {
          found = {
            lat: gsiResults[0].geometry.coordinates[1],
            lon: gsiResults[0].geometry.coordinates[0],
            title: gsiResults[0].properties.title
          };
          break;
        }
      }
    }

    if (!found) {
      try {
        const photonData = await searchWithPhoton(query);
        const photonResults = chooseBestPoiResult(photonData.features || [], query);

        if (photonResults.length > 0) {
          found = {
            lat: photonResults[0].geometry.coordinates[1],
            lon: photonResults[0].geometry.coordinates[0],
            title: photonResults[0].properties.name || query
          };
        }
      } catch (error) {
        console.warn("Photon search failed; trying Nominatim.", error);
      }
    }

    if (!found) {
      const nominatimResults = await searchWithNominatim(query);

      if (nominatimResults.length > 0) {
        found = {
          lat: nominatimResults[0].lat,
          lon: nominatimResults[0].lon,
          title: nominatimResults[0].display_name
        };
      }
    }

    if (!found && !isAddressLike(query)) {
      for (const candidate of makeSearchQueries(query)) {
        const gsiResults = await searchWithGsi(candidate);

        if (gsiResults.length > 0) {
          found = {
            lat: gsiResults[0].geometry.coordinates[1],
            lon: gsiResults[0].geometry.coordinates[0],
            title: gsiResults[0].properties.title
          };
          break;
        }
      }
    }

    if (!found) {
      alert("住所または場所が見つかりませんでした。");
      return;
    }

    addRemovablePin(found.lat, found.lon, found.title, true);
  } catch (error) {
    console.error(error);
    alert("住所検索中にエラーが発生しました。");
  } finally {
    searchButton.disabled = false;
    searchButton.textContent = "検索して追加";
  }
});
