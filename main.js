const center = JSON.parse(document.currentScript.dataset.center || '[43.5,-79.8]');
const map = L.map('map', { zoomControl: false }).setView(center, 11);
L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
  attribution: '&copy; CartoDB'
}).addTo(map);

// Move zoom controls into sidebar
const zoomEl = document.querySelector('.leaflet-control-zoom');
document.getElementById('zoom-controls').appendChild(zoomEl);

// Update timestamp
document.getElementById('last-updated').textContent = `Last updated: ${new Date().toLocaleString()}`;

const debug = msg => {
  const div = document.createElement('div');
  div.textContent = msg;
  document.getElementById('status-debug').appendChild(div);
  console.log(msg);
};

// Load GeoJSON Zones
const zones = {
  "Wednesday":  { url: "https://freshboxmarket.github.io/maplayers/wed_group.geojson", color: "#008000" },
  "Thursday":   { url: "https://freshboxmarket.github.io/maplayers/thurs_group.geojson", color: "#FF0000" },
  "Friday":     { url: "https://freshboxmarket.github.io/maplayers/fri_group.geojson", color: "#0000FF" },
  "Saturday":   { url: "https://freshboxmarket.github.io/maplayers/sat_group.geojson", color: "#FFD700" }
};

for (const [day, { url, color }] of Object.entries(zones)) {
  debug(`Loading ${day} zone...`);
  fetch(url)
    .then(res => res.ok ? res.json() : Promise.reject(res.status))
    .then(data => {
      L.geoJSON(data, {
        style: { color, weight: 2, fillOpacity: 0.2 },
        onEachFeature: (f, l) => l.bindPopup(`${day} Zone`)
      }).addTo(map);
      debug(`✅ ${day} zone loaded`);
    })
    .catch(err => debug(`❌ Failed to load ${day} zone (${err})`));
}

// CSVs
const csvSources = {
  "1 Week Out": {
    url: "https://docs.google.com/spreadsheets/d/e/2PACX-1vQQsZG2J-1AfAh7Xy4fuwrKZ1xAWrZG_7gQmhNsZPHlLGUqXyoZZgDkAyLPBAq0qjRHxKKDF3V7dfAZ/pub?output=csv",
    color: "#e75480",
    defaultVisible: true
  },
  "2 Weeks Out": {
    url: "https://docs.google.com/spreadsheets/d/e/2PACX-1vQJZEqXvTnT0yeHqd2ozrJxV6Bi-BczkUJTCuQUhxnkg2zyGWH0sb60pDrZnAb5ANigjDZKn0RwDZQ3/pub?output=csv",
    color: "#00008B",
    defaultVisible: false
  },
  "3 Weeks Out": {
    url: "https://docs.google.com/spreadsheets/d/e/2PACX-1vRxI2JY5RJX8yqID4cMV9tf1WwChHoWejGfIQhCtZTpjMlmJv7rr_qW0uDu1sYjdnJKZuRpQXHcYgTq/pub?output=csv",
    color: "#800080",
    defaultVisible: false
  }
};

const csvLegend = document.getElementById('csv-legend');
const deliveryLayers = {};

function loadCSVs() {
  for (const [label, { url, color, defaultVisible }] of Object.entries(csvSources)) {
    const group = L.layerGroup();
    deliveryLayers[label] = group;
    if (defaultVisible) map.addLayer(group);

    const row = document.createElement('div');
    row.className = 'csv-toggle-entry';
    row.style.borderColor = color;
    row.style.color = color;

    const labelSpan = document.createElement('span');
    labelSpan.textContent = `${label} – Loading...`;

    const toggle = document.createElement('input');
    toggle.type = 'checkbox';
    toggle.checked = defaultVisible;
    toggle.addEventListener('change', () => {
      toggle.checked ? map.addLayer(group) : map.removeLayer(group);
    });

    row.appendChild(labelSpan);
    row.appendChild(toggle);
    csvLegend.appendChild(row);

    debug(`Loading ${label}...`);
    Papa.parse(url, {
      download: true,
      header: true,
      complete: results => {
        let count = 0;
        results.data.forEach(r => {
          const lat = parseFloat(r.lat);
          const lon = parseFloat(r.long);
          const id = r.id || '';
          const name = r.FundraiserName || 'Unknown';
          if (!isNaN(lat) && !isNaN(lon)) {
            count++;
            L.circleMarker([lat, lon], {
              radius: 8,
              color,
              weight: 2,
              fillColor: "#fff",
              fillOpacity: 1
            }).bindPopup(`<b>${name}</b><br>ID: ${id}`).addTo(group);
          }
        });
        labelSpan.textContent = `${label} – ${count} deliveries`;
        debug(`✅ ${label} loaded (${count} entries)`);
      },
      error: err => {
        debug(`❌ CSV load failed: ${err.message}`);
      }
    });
  }
}

loadCSVs();

document.getElementById('refresh-btn').addEventListener('click', () => {
  document.getElementById('status-debug').innerHTML = '';
  for (const group of Object.values(deliveryLayers)) {
    group.clearLayers();
  }
  loadCSVs();
});

// Collapse sidebar
const sidebar = document.getElementById('sidebar');
const mapEl = document.getElementById('map');
const toggleBtn = document.getElementById('collapse-toggle');
let collapsed = false;

toggleBtn.addEventListener('click', () => {
  collapsed = !collapsed;
  sidebar.style.width = collapsed ? '5px' : '250px';
  mapEl.style.marginLeft = collapsed ? '5px' : '250px';
  toggleBtn.textContent = collapsed ? '❯' : '❮';
});
