const map = L.map("map").setView([35.681236, 139.767125], 13);

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 19,
  attribution: "&copy; OpenStreetMap contributors"
}).addTo(map);

L.marker([35.681236, 139.767125])
  .addTo(map)
  .bindPopup("東京駅");
