const map = L.map('map', { zoomControl: false }).setView([43.5, -79.8], 10);
L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
  attribution: '&copy; CartoDB'
}).addTo(map);

// Move zoom controls into the sidebar
const zoomControl = L.control.zoom({ position: 'topleft' });
zoomControl.addTo(map);
const zoomEl = document.querySelector('.leaflet-control-zoom');
document.getElementById('zoom-controls').appendChild(zoomEl);

const now = new Date();
document.getElementById('last-updated').textContent =
  `Last updated: ${now.toLocaleDateString()} @ ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;

const uniqueIDs = new Set();

const geoLayers = {
  "Wednesday":  { url: "https://freshboxmarket.github.io/maplayers/wed_group.geojson", color: "#008000" },
  "Thursday":   { url: "https://freshboxmarket.github.io/maplayers/thurs_group.geojson", color: "#FF0000" },
  "Friday":     { url: "https://freshboxmarket.github.io/maplayers/fri_group.geojson", color: "#0000FF" },
  "Saturday":   { url: "https://freshboxmarket.github.io/maplayers/sat_group.geojson", color: "#FFD700" }
};

Object.entries(geoLayers).forEach(([day, { url, color }]) => {
  fetch(url)
    .then(res => res.json())
    .then(data => {
      L.geoJSON(data, {
        style: { color, weight: 2, fillOpacity: 0.15 },
        onEachFeature: (f, l) => l.bindPopup(`${day} Zone`)
      }).addTo(map);
    });
});

const csvSources = {
  "3 Weeks Out": {
    url: "https://docs.google.com/spreadsheets/d/e/2PACX-1vRxI2JY5RJX8yqID4cMV9tf1WwChHoWejGfIQhCtZTpjMlmJv7rr_qW0uDu1sYjdnJKZuRpQXHcYgTq/pub?output=csv",
    color: "#800080"
  },
  "2 Weeks Out": {
    url: "https://docs.google.com/spreadsheets/d/e/2PACX-1vQJZEqXvTnT0yeHqd2ozrJxV6Bi-BczkUJTCuQUhxnkg2zyGWH0sb60pDrZnAb5ANigjDZKn0RwDZQ3/pub?output=csv",
    color: "#002366"
  },
  "1 Week Out": {
    url: "https://docs.google.com/spreadsheets/d/e/2PACX-1vQQsZG2J-1AfAh7Xy4fuwrKZ1xAWrZG_7gQmhNsZPHlLGUqXyoZZgDkAyLPBAq0qjRHxKKDF3V7dfAZ/pub?output=csv",
    color: "#e75480"
  }
};

const csvLegend = document.getElementById('csv-legend');
const totalUnique = document.getElementById('total-unique');

Object.entries(csvSources).forEach(([week, { url, color }]) => {
  const groupLayer = L.layerGroup().addTo(map);

  const wrapper = document.createElement('div');
  wrapper.className = 'csv-toggle-entry';
  wrapper.style.borderColor = color;
  wrapper.style.color = color;

  const label = document.createElement('span');
  label.textContent = `${week} – Loading…`;

  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.checked = true;
  checkbox.addEventListener('change', () => {
    if (checkbox.checked) map.addLayer(groupLayer);
    else map.removeLayer(groupLayer);
  });

  wrapper.appendChild(label);
  wrapper.appendChild(checkbox);
  csvLegend.appendChild(wrapper);

  Papa.parse(url, {
    download: true,
    header: true,
    complete: function(results) {
      let count = 0;
      results.data.forEach(row => {
        const lat = parseFloat(row.lat);
        const lon = parseFloat(row.long);
        const id = (row.id || "").trim();
        const name = row.FundraiserName || "Unknown";

        if (!isNaN(lat) && !isNaN(lon)) {
          count++;
          if (id) uniqueIDs.add(id);

          L.circleMarker([lat, lon], {
            radius: 10,
            color,
            weight: 3,
            fillColor: "#ffffff",
            fillOpacity: 1
          }).bindPopup(`<strong>${name}</strong><br>ID: ${id}`).addTo(groupLayer);
        }
      });
      label.textContent = `${week} – ${count} deliveries`;
      totalUnique.textContent = `Total unique customers: ${uniqueIDs.size}`;
    }
  });
});

// Resizable sidebar
const sidebar = document.getElementById('sidebar');
const mapEl = document.getElementById('map');
const handle = document.getElementById('resize-handle');
let isResizing = false;

handle.addEventListener('mousedown', () => {
  isResizing = true;
  document.body.style.cursor = 'ew-resize';
});

document.addEventListener('mousemove', e => {
  if (!isResizing) return;
  const newWidth = Math.max(100, Math.min(window.innerWidth - 50, e.clientX));
  sidebar.style.width = newWidth + 'px';
  mapEl.style.marginLeft = newWidth + 'px';
});

document.addEventListener('mouseup', () => {
  isResizing = false;
  document.body.style.cursor = '';
});
