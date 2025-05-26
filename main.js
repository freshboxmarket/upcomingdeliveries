// Extract center coordinates passed from index.html
const center = JSON.parse(document.currentScript.dataset.center || '[43.5,-79.8]');
const map = L.map('map', { zoomControl: false }).setView(center, 11);

L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
  attribution: '&copy; CartoDB'
}).addTo(map);

// Move zoom controls to custom container
const zoomControl = L.control.zoom({ position: 'bottomleft' });
zoomControl.addTo(map);
const zoomEl = document.querySelector('.leaflet-control-zoom');
document.getElementById('zoom-controls').appendChild(zoomEl);

document.getElementById('last-updated').textContent = `Last updated: ${new Date().toLocaleString()}`;

function debug(msg) {
  const panel = document.getElementById('status-debug');
  const line = document.createElement('div');
  line.textContent = msg;
  panel.appendChild(line);
  console.log(msg);
}

// ZONE FILES
const zones = {
  Wednesday: { url: 'https://freshboxmarket.github.io/maplayers/wed_group.geojson', color: '#008000' },
  Thursday:  { url: 'https://freshboxmarket.github.io/maplayers/thurs_group.geojson', color: '#FF0000' },
  Friday:    { url: 'https://freshboxmarket.github.io/maplayers/fri_group.geojson', color: '#0000FF' },
  Saturday:  { url: 'https://freshboxmarket.github.io/maplayers/sat_group.geojson', color: '#FFD700' }
};

const zoneLayers = {};
for (const [day, { url, color }] of Object.entries(zones)) {
  debug(`Loading ${day} zone...`);
  fetch(url)
    .then(r => r.ok ? r.json() : Promise.reject(r.status))
    .then(data => {
      const layer = L.geoJSON(data, {
        style: { color, weight: 2, fillOpacity: 0.2 },
        onEachFeature: (f, l) => l.bindPopup(`${day} Zone`)
      }).addTo(map);
      zoneLayers[day] = layer;
      debug(`✅ ${day} zone loaded`);
    })
    .catch(err => debug(`❌ Failed to load ${day} zone (${err})`));
}

// CSV LAYERS
const csvSources = {
  '1 Week Out': {
    url: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSZ1kJEo0ZljAhlg4Lnr_Shz3-OJnV6uehE8vCA8280L4aCfNoWE85WEJnOG2jzL2jE-o0PWTMRZiFu/pub?output=csv',
    color: '#e75480',
    number: '1',
    defaultVisible: true
  },
  '2 Weeks Out': {
    url: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQkTCHp6iaWJBboax7x-Ic8kmX6jlYkTzJhnCnv2WfPtmo70hXPijk0p1JI03vBQTPuyPuDVWzxbavP/pub?output=csv',
    color: '#00008B',
    number: '2',
    defaultVisible: false
  },
  '3 Weeks Out': {
    url: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vS2LfOVQyErcTtEMSwS1ch4GfUlcpXnNfih841L1Vms0B-9pNMSh9vW5k0TNrXDoQgv2-lgDnYWdzgM/pub?output=csv',
    color: '#800080',
    number: '3',
    defaultVisible: false
  }
};

const csvLegend = document.getElementById('csv-legend');
const deliveryLayers = {};

function createMarkerIcon(color, number) {
  return L.divIcon({
    className: 'custom-marker',
    html: `<div style="
      background:#fff;
      border: 3px solid ${color};
      color:${color};
      width:28px;height:28px;
      border-radius:50%;
      font-weight:bold;
      font-family: Oswald, sans-serif;
      text-align:center;
      line-height:26px;">${number}</div>`
  });
}

function loadCSVs() {
  Object.entries(csvSources).forEach(([label, { url, color, number, defaultVisible }]) => {
    const group = L.layerGroup();
    deliveryLayers[label] = group;
    if (defaultVisible) map.addLayer(group);

    const entry = document.createElement('div');
    entry.className = 'csv-toggle-entry';
    entry.style.borderColor = color;
    entry.style.color = color;

    const text = document.createElement('span');
    text.textContent = `${label} – Loading...`;

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = defaultVisible;
    checkbox.addEventListener('change', () => {
      checkbox.checked ? map.addLayer(group) : map.removeLayer(group);
    });

    entry.appendChild(text);
    entry.appendChild(checkbox);
    csvLegend.appendChild(entry);

    Papa.parse(url, {
      download: true,
      header: true,
      complete: results => {
        let count = 0;
        results.data.forEach(row => {
          const lat = parseFloat(row.lat);
          const lng = parseFloat(row.long);
          const id = row.id || '';
          const name = row.FundraiserName || 'Unknown';

          if (!isNaN(lat) && !isNaN(lng)) {
            count++;
            L.marker([lat, lng], {
              icon: createMarkerIcon(color, number)
            }).bindPopup(`<strong>${name}</strong><br>ID: ${id}`).addTo(group);
          }
        });
        text.textContent = `${label} – ${count} deliveries`;
        debug(`✅ ${label} loaded (${count})`);
      },
      error: err => debug(`❌ ${label} failed to load (${err.message})`)
    });
  });
}

loadCSVs();

// Refresh button
const refreshBtn = document.getElementById('refresh-btn');
refreshBtn.addEventListener('click', () => {
  document.getElementById('status-debug').innerHTML = '';
  Object.values(deliveryLayers).forEach(group => group.clearLayers());
  loadCSVs();
});

// Highlight button
const highlightBtn = document.getElementById('highlight-btn');
highlightBtn.addEventListener('click', () => {
  const active = Object.entries(deliveryLayers).filter(([label, layer]) => map.hasLayer(layer));
  if (active.length !== 1) {
    alert('Please toggle only ONE layer before using Highlight.');
    return;
  }

  const [label, group] = active[0];
  const source = csvSources[label];

  Papa.parse(source.url, {
    download: true,
    header: true,
    complete: results => {
      results.data.forEach(row => {
        const lat = parseFloat(row.lat);
        const lng = parseFloat(row.long);
        const id = row.id || '';
        const name = row.FundraiserName || 'Unknown';

        if (!isNaN(lat) && !isNaN(lng)) {
          L.popup({ autoClose: false })
            .setLatLng([lat, lng])
            .setContent(`<b>${name}</b><br>ID: ${id}`)
            .openOn(map);
        }
      });
    }
  });
});

// Sidebar drag-resize
(function enableResize() {
  const sidebar = document.getElementById('sidebar');
  const handle = document.getElementById('resize-handle');
  const mapDiv = document.getElementById('map');

  handle.addEventListener('mousedown', e => {
    e.preventDefault();
    document.onmousemove = function (e) {
      const width = Math.max(100, e.clientX);
      sidebar.style.width = width + 'px';
      mapDiv.style.marginLeft = width + 'px';
    };
    document.onmouseup = function () {
      document.onmousemove = null;
      document.onmouseup = null;
    };
  });
})();
