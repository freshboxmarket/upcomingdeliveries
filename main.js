const center = JSON.parse(document.currentScript.dataset.center || '[43.5,-79.8]');
const map = L.map('map', { zoomControl: false }).setView(center, 11);
L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
  attribution: '&copy; CartoDB'
}).addTo(map);

// Move zoom into sidebar
const zoomControl = L.control.zoom({ position: 'topleft' }).addTo(map);
const zoomEl = document.querySelector('.leaflet-control-zoom');
document.getElementById('zoom-controls').appendChild(zoomEl);

document.getElementById('last-updated').textContent =
  `Last updated: ${new Date().toLocaleString()}`;

// Load zone polygons
const zones = {
  "Wednesday":  { url: "https://freshboxmarket.github.io/maplayers/wed_group.geojson", color: "#008000", layer: null },
  "Thursday":   { url: "https://freshboxmarket.github.io/maplayers/thurs_group.geojson", color: "#FF0000", layer: null },
  "Friday":     { url: "https://freshboxmarket.github.io/maplayers/fri_group.geojson", color: "#0000FF", layer: null },
  "Saturday":   { url: "https://freshboxmarket.github.io/maplayers/sat_group.geojson", color: "#FFD700", layer: null }
};

const zoneLayers = [];

for (const [day, { url, color }] of Object.entries(zones)) {
  fetch(url)
    .then(res => res.json())
    .then(data => {
      const layer = L.geoJSON(data, {
        style: { color, weight: 2, fillOpacity: 0.15 },
        onEachFeature: (f, l) => l.bindPopup(`${day} Zone`)
      }).addTo(map);
      zones[day].layer = layer;
      zoneLayers.push({ day, color, layer });
    });
}

// Delivery Layers
const csvSources = {
  "3 Weeks Out": {
    url: "https://docs.google.com/spreadsheets/d/e/2PACX-1vRxI2JY5RJX8yqID4cMV9tf1WwChHoWejGfIQhCtZTpjMlmJv7rr_qW0uDu1sYjdnJKZuRpQXHcYgTq/pub?output=csv",
    color: "#800080",
    defaultVisible: false
  },
  "2 Weeks Out": {
    url: "https://docs.google.com/spreadsheets/d/e/2PACX-1vQJZEqXvTnT0yeHqd2ozrJxV6Bi-BczkUJTCuQUhxnkg2zyGWH0sb60pDrZnAb5ANigjDZKn0RwDZQ3/pub?output=csv",
    color: "#002366",
    defaultVisible: false
  },
  "1 Week Out": {
    url: "https://docs.google.com/spreadsheets/d/e/2PACX-1vQQsZG2J-1AfAh7Xy4fuwrKZ1xAWrZG_7gQmhNsZPHlLGUqXyoZZgDkAyLPBAq0qjRHxKKDF3V7dfAZ/pub?output=csv",
    color: "#e75480",
    defaultVisible: true
  }
};

const csvLegend = document.getElementById('csv-legend');
const statsPanel = document.getElementById('stats-panel');
const deliveryLayers = {};

function loadAllCSVs() {
  statsPanel.innerHTML = '';
  csvLegend.innerHTML = '';

  Object.entries(csvSources).forEach(([week, { url, color, defaultVisible }]) => {
    const group = L.layerGroup();
    deliveryLayers[week] = group;
    if (defaultVisible) group.addTo(map);

    const row = document.createElement('div');
    row.className = 'csv-toggle-entry';
    row.style.borderColor = color;
    row.style.color = color;

    const label = document.createElement('span');
    label.textContent = `${week} – Loading...`;

    const box = document.createElement('input');
    box.type = 'checkbox';
    box.checked = defaultVisible;
    box.addEventListener('change', () => {
      if (box.checked) map.addLayer(group);
      else map.removeLayer(group);
    });

    row.appendChild(label);
    row.appendChild(box);
    csvLegend.appendChild(row);

    Papa.parse(url, {
      download: true,
      header: true,
      worker: true,
      complete: (results) => {
        let count = 0;
        const features = [];

        results.data.forEach(row => {
          const lat = parseFloat(row.lat);
          const lon = parseFloat(row.long);
          const id = row.id || '';
          const name = row.FundraiserName || 'Unknown';

          if (!isNaN(lat) && !isNaN(lon)) {
            count++;
            const point = turf.point([lon, lat], { id, name });
            features.push(point);

            const marker = L.circleMarker([lat, lon], {
              radius: 10,
              color,
              weight: 3,
              fillColor: '#fff',
              fillOpacity: 1
            }).bindPopup(`<strong>${name}</strong><br>ID: ${id}`);
            group.addLayer(marker);
          }
        });

        label.textContent = `${week} – ${count} deliveries`;

        // Spatial zone stats
        const stats = {};
        const fc = turf.featureCollection(features);
        zoneLayers.forEach(({ day, layer }) => {
          let zoneCount = 0;
          layer.eachLayer(zone => {
            const polygon = zone.feature;
            fc.features.forEach(pt => {
              if (turf.booleanPointInPolygon(pt, polygon)) zoneCount++;
            });
          });
          stats[day] = zoneCount;
        });

        const statBlock = document.createElement('div');
        statBlock.innerHTML = `<strong>${week} Stats:</strong><br>` +
          Object.entries(stats).map(([d, n]) => `${d}: ${n}`).join('<br>');
        statsPanel.appendChild(statBlock);
      }
    });
  });
}

// Initial load
loadAllCSVs();

// Refresh button
document.getElementById('refresh-btn').addEventListener('click', () => {
  for (const group of Object.values(deliveryLayers)) {
    group.clearLayers();
  }
  loadAllCSVs();
});

// Sidebar toggle
const sidebar = document.getElementById('sidebar');
const mapEl = document.getElementById('map');
const toggle = document.getElementById('collapse-toggle');
let collapsed = false;
let savedWidth = sidebar.offsetWidth;

toggle.addEventListener('click', () => {
  if (!collapsed) {
    savedWidth = sidebar.offsetWidth;
    sidebar.style.width = '5px';
    mapEl.style.marginLeft = '5px';
    toggle.textContent = '❯';
  } else {
    sidebar.style.width = savedWidth + 'px';
    mapEl.style.marginLeft = savedWidth + 'px';
    toggle.textContent = '❮';
  }
  collapsed = !collapsed;
});
