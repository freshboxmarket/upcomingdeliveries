const center = JSON.parse(document.currentScript.dataset.center || '[43.5,-79.8]');
const map = L.map('map', { zoomControl: false }).setView(center, 11);
L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
  attribution: '&copy; CartoDB'
}).addTo(map);

const zoomEl = document.querySelector('.leaflet-control-zoom');
document.getElementById('zoom-controls').appendChild(zoomEl);
document.getElementById('last-updated').textContent =
  `Last updated: ${new Date().toLocaleString()}`;

const debug = (msg) => {
  console.log(msg);
  const panel = document.getElementById('status-debug');
  const p = document.createElement('div');
  p.textContent = msg;
  panel.appendChild(p);
};

// --- Load Zones ---
const zones = {
  "Wednesday":  { url: "https://freshboxmarket.github.io/maplayers/wed_group.geojson", color: "#008000" },
  "Thursday":   { url: "https://freshboxmarket.github.io/maplayers/thurs_group.geojson", color: "#FF0000" },
  "Friday":     { url: "https://freshboxmarket.github.io/maplayers/fri_group.geojson", color: "#0000FF" },
  "Saturday":   { url: "https://freshboxmarket.github.io/maplayers/sat_group.geojson", color: "#FFD700" }
};

const zoneLayers = [];

for (const [day, { url, color }] of Object.entries(zones)) {
  debug(`📦 Fetching ${day} zone...`);
  fetch(url)
    .then(res => {
      if (!res.ok) throw new Error(`❌ ${day} fetch failed (${res.status})`);
      return res.json();
    })
    .then(data => {
      const layer = L.geoJSON(data, {
        style: { color, weight: 2, fillOpacity: 0.15 },
        onEachFeature: (f, l) => l.bindPopup(`${day} Zone`)
      }).addTo(map);
      zoneLayers.push({ day, color, layer });
      debug(`✅ ${day} zone loaded`);
    })
    .catch(err => {
      debug(`❌ ${day} zone error: ${err.message}`);
      console.error(err);
    });
}

// --- Load CSVs ---
const csvSources = {
  "1 Week Out": {
    url: "https://docs.google.com/spreadsheets/d/e/2PACX-1vQQsZG2J-1AfAh7Xy4fuwrKZ1xAWrZG_7gQmhNsZPHlLGUqXyoZZgDkAyLPBAq0qjRHxKKDF3V7dfAZ/pub?output=csv",
    color: "#e75480",
    defaultVisible: true
  }
};

const csvLegend = document.getElementById('csv-legend');
const deliveryLayers = {};

function loadAllCSVs() {
  for (const [week, { url, color, defaultVisible }] of Object.entries(csvSources)) {
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

    debug(`📦 Fetching ${week} CSV...`);

    Papa.parse(url, {
      download: true,
      header: true,
      error: (err) => {
        debug(`❌ ${week} CSV error: ${err.message}`);
        console.error(err);
      },
      complete: (results) => {
        let count = 0;
        results.data.forEach(row => {
          const lat = parseFloat(row.lat);
          const lon = parseFloat(row.long);
          const id = row.id || '';
          const name = row.FundraiserName || 'Unknown';

          if (!isNaN(lat) && !isNaN(lon)) {
            count++;
            L.circleMarker([lat, lon], {
              radius: 10,
              color,
              weight: 3,
              fillColor: '#fff',
              fillOpacity: 1
            }).bindPopup(`<strong>${name}</strong><br>ID: ${id}`).addTo(group);
          }
        });
        label.textContent = `${week} – ${count} deliveries`;
        debug(`✅ ${week} CSV loaded: ${count} point(s)`);
      }
    });
  }
}

loadAllCSVs();

document.getElementById('refresh-btn').addEventListener('click', () => {
  document.getElementById('status-debug').innerHTML = '';
  for (const group of Object.values(deliveryLayers)) {
    group.clearLayers();
  }
  loadAllCSVs();
});

// Sidebar collapse
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
