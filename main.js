const map = L.map('map');
L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
  attribution: '&copy; CartoDB'
}).addTo(map);

const now = new Date();
document.getElementById('last-updated').textContent =
  `Last updated: ${now.toLocaleDateString()} @ ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;

const uniqueIDs = new Set();
const stats = {
  "3 Weeks Out": { Wednesday: 0, Thursday: 0, Friday: 0, Saturday: 0 },
  "2 Weeks Out": { Wednesday: 0, Thursday: 0, Friday: 0, Saturday: 0 },
  "1 Week Out": { Wednesday: 0, Thursday: 0, Friday: 0, Saturday: 0 }
};

const updateStatsDisplay = () => {
  const container = document.getElementById('stats-container');
  container.innerHTML = '';

  Object.entries(stats).forEach(([week, data]) => {
    const div = document.createElement('div');
    div.className = 'stats-entry';
    div.innerHTML = `
      <strong>${week}</strong>
      <span>Wed: ${data.Wednesday}</span>
      <span>Thu: ${data.Thursday}</span>
      <span>Fri: ${data.Friday}</span>
      <span>Sat: ${data.Saturday}</span>
    `;
    container.appendChild(div);
  });

  const totals = { Wednesday: 0, Thursday: 0, Friday: 0, Saturday: 0 };
  Object.values(stats).forEach(d => {
    for (const k in d) totals[k] += d[k];
  });

  const busiest = Object.entries(totals).reduce((a, b) => b[1] > a[1] ? b : a)[0];
  const summary = document.createElement('div');
  summary.className = 'stats-entry';
  summary.innerHTML = `<strong>Busiest Day:</strong> ${busiest}`;
  container.appendChild(summary);
};

const zonePolygons = {};
const geoLayers = {
  "Wednesday": { url: "https://freshboxmarket.github.io/maplayers/wed_group.geojson", color: "#008000" },
  "Thursday":  { url: "https://freshboxmarket.github.io/maplayers/thurs_group.geojson", color: "#FF0000" },
  "Friday":    { url: "https://freshboxmarket.github.io/maplayers/fri_group.geojson", color: "#0000FF" },
  "Saturday":  { url: "https://freshboxmarket.github.io/maplayers/sat_group.geojson", color: "#FFD700" }
};

Object.entries(geoLayers).forEach(([day, { url, color }]) => {
  fetch(url)
    .then(res => res.json())
    .then(data => {
      zonePolygons[day] = data.features;
      L.geoJSON(data, {
        style: { color, weight: 2, fillOpacity: 0.15 },
        onEachFeature: (f, l) => l.bindPopup(`${day} Zone`)
      }).addTo(map);
    });
});

const csvSources = {
  "3 Weeks Out": { url: "https://...", color: "#800080" },
  "2 Weeks Out": { url: "https://...", color: "#002366" },
  "1 Week Out": { url: "https://...", color: "#e75480" }
};

const csvLegend = document.getElementById('csv-legend');
const totalUnique = document.getElementById('total-unique');

Object.entries(csvSources).forEach(([name, { url, color }]) => {
  const groupLayer = L.layerGroup().addTo(map);
  const bufferLayer = L.layerGroup().addTo(map);

  const wrapper = document.createElement('div');
  wrapper.className = 'csv-toggle-entry';
  wrapper.style.borderColor = color;
  wrapper.style.color = color;

  const label = document.createElement('span');
  label.textContent = `${name} – Loading...`;

  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.checked = true;

  checkbox.addEventListener('change', () => {
    if (checkbox.checked) {
      map.addLayer(groupLayer);
      map.addLayer(bufferLayer);
    } else {
      map.removeLayer(groupLayer);
      map.removeLayer(bufferLayer);
    }
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
        const id = (row["id:"] || "").trim();
        const fundraiser = row.FundraiserName || "Unknown";

        if (!isNaN(lat) && !isNaN(lon)) {
          count++;
          if (id) uniqueIDs.add(id);

          const pt = turf.point([lon, lat]);
          for (const day in zonePolygons) {
            for (const poly of zonePolygons[day] || []) {
              if (turf.booleanPointInPolygon(pt, poly)) {
                stats[name][day]++;
                break;
              }
            }
          }

          L.circleMarker([lat, lon], {
            radius: 10,
            color,
            weight: 3,
            fillColor: "#ffffff",
            fillOpacity: 1
          }).bindPopup(`<strong>${fundraiser}</strong><br>ID: ${id}`).addTo(groupLayer);

          const buffered = turf.buffer(pt, 0.05, { units: 'kilometers' });
          L.geoJSON(buffered, { style: { color, weight: 1, fillOpacity: 0.2 } }).addTo(bufferLayer);
        }
      });

      label.textContent = `${name} – ${count} deliveries`;
      totalUnique.textContent = `Total unique customers: ${uniqueIDs.size}`;
      updateStatsDisplay();
    }
  });
});

// Sidebar resizing
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
