const map = L.map('map', { zoomControl: false }).setView([43.5, -79.8], 10);
L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
  attribution: '&copy; CartoDB'
}).addTo(map);

// Move zoom into sidebar
const zoomControl = L.control.zoom({ position: 'topleft' });
zoomControl.addTo(map);
const zoomEl = document.querySelector('.leaflet-control-zoom');
document.getElementById('zoom-controls').appendChild(zoomEl);

// Timestamp
document.getElementById('last-updated').textContent =
  `Last updated: ${new Date().toLocaleString()}`;

// Delivery zones
const geoLayers = {
  "Wednesday":  { url: "https://freshboxmarket.github.io/maplayers/wed_group.geojson", color: "#008000" },
  "Thursday":   { url: "https://freshboxmarket.github.io/maplayers/thurs_group.geojson", color: "#FF0000" },
  "Friday":     { url: "https://freshboxmarket.github.io/maplayers/fri_group.geojson", color: "#0000FF" },
  "Saturday":   { url: "https://freshboxmarket.github.io/maplayers/sat_group.geojson", color: "#FFD700" }
};

for (const [day, { url, color }] of Object.entries(geoLayers)) {
  fetch(url)
    .then(res => res.json())
    .then(data => {
      L.geoJSON(data, {
        style: { color, weight: 2, fillOpacity: 0.15 },
        onEachFeature: (f, l) => l.bindPopup(`${day} Zone`)
      }).addTo(map);
    });
}

// CSV layers
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

for (const [week, { url, color }] of Object.entries(csvSources)) {
  const layer = L.layerGroup().addTo(map);

  const entry = document.createElement('div');
  entry.className = 'csv-toggle-entry';
  entry.style.borderColor = color;
  entry.style.color = color;

  const label = document.createElement('span');
  label.textContent = `${week} – Loading…`;

  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.checked = true;
  checkbox.addEventListener('change', () => {
    if (checkbox.checked) map.addLayer(layer);
    else map.removeLayer(layer);
  });

  entry.appendChild(label);
  entry.appendChild(checkbox);
  csvLegend.appendChild(entry);

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
          L.circleMarker([lat, lon], {
            radius: 10,
            color,
            weight: 3,
            fillColor: "#ffffff",
            fillOpacity: 1
          }).bindPopup(`<strong>${name}</strong><br>ID: ${id}`).addTo(layer);
        }
      });
      label.textContent = `${week} – ${count} deliveries`;
    }
  });
}

// Sidebar resizing + collapse
const sidebar = document.getElementById('sidebar');
const mapEl = document.getElementById('map');
const toggle = document.getElementById('collapse-toggle');
let sidebarWidth = sidebar.offsetWidth;
let collapsed = false;

sidebar.addEventListener('mousedown', (e) => {
  if (e.target !== toggle) {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = sidebar.offsetWidth;

    const onMouseMove = e => {
      const newWidth = Math.max(100, Math.min(window.innerWidth - 50, startWidth + (e.clientX - startX)));
      sidebar.style.width = newWidth + 'px';
      mapEl.style.marginLeft = newWidth + 'px';
    };

    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }
});

toggle.addEventListener('click', () => {
  if (!collapsed) {
    sidebarWidth = sidebar.offsetWidth;
    sidebar.style.width = '5px';
    mapEl.style.marginLeft = '5px';
    toggle.textContent = '❯';
  } else {
    sidebar.style.width = sidebarWidth + 'px';
    mapEl.style.marginLeft = sidebarWidth + 'px';
    toggle.textContent = '❮';
  }
  collapsed = !collapsed;
});
