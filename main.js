const map = L.map('map');

L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
  attribution: '&copy; CartoDB'
}).addTo(map);

fetch("https://freshboxmarket.github.io/maplayers/zones.geojson")
  .then(res => res.json())
  .then(data => {
    const zonesLayer = L.geoJSON(data, {
      style: { color: "#444", weight: 1, fillOpacity: 0.05 }
    }).addTo(map);
    map.fitBounds(zonesLayer.getBounds());
  });

const csvSources = {
  "3 Weeks Out": { url: "https://freshboxmarket.github.io/maplayers/3weeks.csv", color: "#800080" },
  "2 Weeks Out": { url: "https://freshboxmarket.github.io/maplayers/2weeks.csv", color: "#002366" },
  "1 Week Out":  { url: "https://freshboxmarket.github.io/maplayers/1week.csv", color: "#e75480" }
};

const csvLegend = document.getElementById('csv-legend');
const totalUnique = document.getElementById('total-unique');
const lastUpdated = document.getElementById('last-updated');

const now = new Date();
lastUpdated.textContent = `Last updated: ${now.toLocaleDateString()} @ ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;

const uniqueIDs = new Set();

Object.entries(csvSources).forEach(([name, { url, color }]) => {
  const groupLayer = L.layerGroup();
  const bufferLayer = L.layerGroup();

  const wrapper = document.createElement('div');
  wrapper.className = 'csv-toggle-entry';
  wrapper.style.borderColor = color;
  wrapper.style.color = color;

  const label = document.createElement('span');
  label.textContent = `${name} – Loading...`;

  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.checked = (name === "1 Week Out");

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

          const marker = L.circleMarker([lat, lon], {
            radius: 10,
            color: color,
            weight: 3,
            fillColor: "#ffffff",
            fillOpacity: 1
          }).bindPopup(`<strong>${fundraiser}</strong><br>ID: ${id}`);

          marker.addTo(groupLayer);
          marker.on('add', () => {
            const el = marker.getElement();
            if (checkbox.checked && el) el.classList.add('active-marker');
          });

          const buffered = turf.buffer(turf.point([lon, lat]), 0.05, { units: 'kilometers' });
          L.geoJSON(buffered, {
            style: { color, weight: 1, fillOpacity: 0.2 }
          }).addTo(bufferLayer);
        }
      });

      label.textContent = `${name} – ${count} deliveries`;
      totalUnique.textContent = `Total unique customers: ${uniqueIDs.size}`;

      if (checkbox.checked) {
        map.addLayer(groupLayer);
        map.addLayer(bufferLayer);
      }

      checkbox.addEventListener('change', () => {
        if (checkbox.checked) {
          map.addLayer(groupLayer);
          map.addLayer(bufferLayer);
          groupLayer.eachLayer(marker => {
            const el = marker.getElement();
            if (el) el.classList.add('active-marker');
          });
        } else {
          map.removeLayer(groupLayer);
          map.removeLayer(bufferLayer);
        }
      });
    },
    error: function(err) {
      console.error(`Failed to load ${name} from ${url}`, err);
      label.textContent = `${name} – Error loading`;
    }
  });
});

// Resizing logic
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
