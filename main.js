const map = L.map('map').setView([43.5, -79.8], 10);

L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
  attribution: '&copy; CartoDB'
}).addTo(map);

document.getElementById('last-updated').textContent =
  `Last updated: ${new Date().toLocaleString()}`;

const uniqueIDs = new Set();
const stats = {
  "3 Weeks Out": { Wednesday: 0, Thursday: 0, Friday: 0, Saturday: 0 },
  "2 Weeks Out": { Wednesday: 0, Thursday: 0, Friday: 0, Saturday: 0 },
  "1 Week Out": { Wednesday: 0, Thursday: 0, Friday: 0, Saturday: 0 }
};

function updateStatsDisplay() {
  const container = document.getElementById('stats-container');
  container.innerHTML = '';
  Object.entries(stats).forEach(([week, data]) => {
    const div = document.createElement('div');
    div.className = 'stats-entry';
    div.innerHTML = `<strong>${week}</strong>
      <span>Wed: ${data.Wednesday}</span>
      <span>Thu: ${data.Thursday}</span>
      <span>Fri: ${data.Friday}</span>
      <span>Sat: ${data.Saturday}</span>`;
    container.appendChild(div);
  });

  const totals = { Wednesday: 0, Thursday: 0, Friday: 0, Saturday: 0 };
  Object.values(stats).forEach(d => {
    for (let k in d) totals[k] += d[k];
  });
  const busiest = Object.entries(totals).reduce((a, b) => b[1] > a[1] ? b : a)[0];

  const summary = document.createElement('div');
  summary.className = 'stats-entry';
  summary.innerHTML = `<strong>Busiest Day:</strong> ${busiest}`;
  container.appendChild(summary);
}

const zonePolygons = {};
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
      zonePolygons[day] = data.features;
      L.geoJSON(data, {
        style: { color, weight: 2, fillOpacity: 0.15 },
        onEachFeature: (f, l) => l.bindPopup(`${day} Zone`)
      }).addTo(map);
    });
}

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
        const id = row.id?.trim();
        const name = row.FundraiserName;

        if (!isNaN(lat) && !isNaN(lon)) {
          count++;
          if (id) uniqueIDs.add(id);
          const point = turf.point([lon, lat]);

          for (let day in zonePolygons) {
            for (let feature of zonePolygons[day] || []) {
              if (turf.booleanPointInPolygon(point, feature)) {
                stats[week][day]++;
                break;
              }
            }
          }

          L.circleMarker([lat, lon], {
            radius: 10,
            color,
            weight: 3,
            fillColor: "#fff",
            fillOpacity: 1
          }).bindPopup(`<strong>${name}</strong><br>ID: ${id}`).addTo(layer);
        }
      });
      label.textContent = `${week} – ${count} deliveries`;
      totalUnique.textContent = `Total unique customers: ${uniqueIDs.size}`;
      updateStatsDisplay();
    }
  });
}

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
