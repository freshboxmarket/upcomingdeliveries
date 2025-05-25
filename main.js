const map = L.map('map');

// Centering map around zones.geojson
fetch("https://freshboxmarket.github.io/maplayers/zones.geojson")
  .then(res => res.json())
  .then(data => {
    const zonesLayer = L.geoJSON(data, {
      style: { color: "#666", weight: 1, fillOpacity: 0.05 }
    }).addTo(map);
    map.fitBounds(zonesLayer.getBounds());
  })
  .catch(err => console.error("Error loading zones.geojson:", err));

// Delivery Zone Layers (Wed–Sat)
const geoLayers = {
  "Wednesday": { url: "https://freshboxmarket.github.io/maplayers/wed_group.geojson", color: "green" },
  "Thursday":  { url: "https://freshboxmarket.github.io/maplayers/thurs_group.geojson", color: "red" },
  "Friday":    { url: "https://freshboxmarket.github.io/maplayers/fri_group.geojson", color: "blue" },
  "Saturday":  { url: "https://freshboxmarket.github.io/maplayers/sat_group.geojson", color: "gold" }
};

Object.entries(geoLayers).forEach(([name, { url, color }]) => {
  fetch(url)
    .then(res => res.json())
    .then(data => {
      L.geoJSON(data, {
        style: { color, weight: 2, fillOpacity: 0.15 },
        onEachFeature: (feature, layer) => layer.bindPopup(`${name} Zone`)
      }).addTo(map);
    })
    .catch(err => console.error(`Error loading ${name} zone`, err));
});

// CSV Delivery Points
const csvSources = {
  "3 Weeks Out": {
    url: "https://docs.google.com/spreadsheets/d/e/2PACX-1vS2LfOVQyErcTtEMSwS1ch4GfUlcpXnNfih841L1Vms0B-9pNMSh9vW5k0TNrXDoQgv2-lgDnYWdzgM/pub?output=csv",
    color: "purple"
  },
  "2 Weeks Out": {
    url: "https://docs.google.com/spreadsheets/d/e/2PACX-1vQkTCHp6iaWJBboax7x-Ic8kmX6jlYkTzJhnCnv2WfPtmo70hXPijk0p1JI03vBQTPuyPuDVWzxbavP/pub?output=csv",
    color: "#002366"
  },
  "1 Week Out": {
    url: "https://docs.google.com/spreadsheets/d/e/2PACX-1vSZ1kJEo0ZljAhlg4Lnr_Shz3-OJnV6uehE8vCA8280L4aCfNoWE85WEJnOG2jzL2jE-o0PWTMRZiFu/pub?output=csv",
    color: "#e75480"
  }
};

Object.entries(csvSources).forEach(([name, { url, color }]) => {
  const deliveryLayer = L.layerGroup().addTo(map);
  const bufferLayer = L.layerGroup().addTo(map);

  Papa.parse(url, {
    download: true,
    header: true,
    complete: function(results) {
      results.data.forEach(row => {
        const lat = parseFloat(row.lat);
        const lon = parseFloat(row.long);
        const fundraiser = row.FundraiserName || "Unknown";
        const id = row["id:"] || "N/A";

        if (!isNaN(lat) && !isNaN(lon)) {
          // Point marker
          const marker = L.circleMarker([lat, lon], {
            radius: 5,
            color,
            fillOpacity: 0.8
          }).bindPopup(`<strong>${fundraiser}</strong><br>ID: ${id}`);
          marker.addTo(deliveryLayer);

          // Buffer around marker
          const point = turf.point([lon, lat]);
          const buffered = turf.buffer(point, 0.1, { units: 'kilometers' });

          L.geoJSON(buffered, {
            style: {
              color,
              weight: 1,
              fillOpacity: 0.2
            }
          }).addTo(bufferLayer);
        }
      });
    }
  });
});
