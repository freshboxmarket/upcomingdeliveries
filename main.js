const center = JSON.parse(document.currentScript.dataset.center || '[43.5,-79.8]');
const map = L.map('map', { zoomControl: false }).setView(center, 10); // Slightly zoomed out
L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
  attribution: '&copy; CartoDB'
}).addTo(map);

const zoomControl = L.control.zoom({ position: 'bottomleft' });
zoomControl.addTo(map);
document.getElementById('zoom-controls').appendChild(document.querySelector('.leaflet-control-zoom'));

document.getElementById('last-updated').textContent = `Last updated: ${new Date().toLocaleString()}`;

function debug(msg) {
  const panel = document.getElementById('status-debug');
  const line = document.createElement('div');
  line.textContent = msg;
  panel.appendChild(line);
  console.log(msg);
}

const zoneDefs = {
  Wednesday: { url: 'https://freshboxmarket.github.io/maplayers/wed_group.geojson', color: '#008000' },
  Thursday:  { url: 'https://freshboxmarket.github.io/maplayers/thurs_group.geojson', color: '#FF0000' },
  Friday:    { url: 'https://freshboxmarket.github.io/maplayers/fri_group.geojson', color: '#0000FF' },
  Saturday:  { url: 'https://freshboxmarket.github.io/maplayers/sat_group.geojson', color: '#FFD700' }
};

Object.entries(zoneDefs).forEach(([day, { url, color }]) => {
  fetch(url)
    .then(res => res.json())
    .then(data => {
      L.geoJSON(data, {
        style: { color, fillOpacity: 0.2, weight: 2 },
        onEachFeature: (f, l) => l.bindPopup(`${day} Zone`)
      }).addTo(map);
      debug(`✅ ${day} zone loaded`);
    })
    .catch(err => debug(`❌ ${day} zone failed to load (${err})`));
});

const csvSources = {
  "1 Week Out": {
    url: "https://docs.google.com/spreadsheets/d/e/2PACX-1vSZ1kJEo0ZljAhlg4Lnr_Shz3-OJnV6uehE8vCA8280L4aCfNoWE85WEJnOG2jzL2jE-o0PWTMRZiFu/pub?output=csv",
    color: "#e75480",
    number: "1",
    defaultVisible: true
  },
  "2 Weeks Out": {
    url: "https://docs.google.com/spreadsheets/d/e/2PACX-1vQkTCHp6iaWJBboax7x-Ic8kmX6jlYkTzJhnCnv2WfPtmo70hXPijk0p1JI03vBQTPuyPuDVWzxbavP/pub?output=csv",
    color: "#00008B",
    number: "2",
    defaultVisible: false
  },
  "3 Weeks Out": {
    url: "https://docs.google.com/spreadsheets/d/e/2PACX-1vS2LfOVQyErcTtEMSwS1ch4GfUlcpXnNfih841L1Vms0B-9pNMSh9vW5k0TNrXDoQgv2-lgDnYWdzgM/pub?output=csv",
    color: "#800080",
    number: "3",
    defaultVisible: false
  }
};

const csvLegend = document.getElementById('csv-legend');
const deliveryLayers = {};
const labelPopups = [];
let highlightActive = false;

function createCustomMarker(color, number) {
  return L.divIcon({
    className: 'custom-icon',
    html: `<div style="
      background:#fff;
      border: 3px solid ${color};
      color:${color};
      width:28px;height:28px;
      border-radius:50%;
      font-weight:bold;
      font-family: Oswald,sans-serif;
      text-align:center;
      line-height:26px;">${number}</div>`
  });
}

function loadCSVs() {
  csvLegend.innerHTML = '';
  Object.entries(csvSources).forEach(([label, src]) => {
    const group = L.layerGroup();
    deliveryLayers[label] = group;
    if (src.defaultVisible) map.addLayer(group);

    const row = document.createElement('div');
    row.className = 'csv-toggle-entry';
    row.style.borderColor = src.color;
    row.style.color = src.color;

    const span = document.createElement('span');
    span.textContent = `${label} – Loading...`;

    const toggle = document.createElement('input');
    toggle.type = 'checkbox';
    toggle.checked = src.defaultVisible;
    toggle.addEventListener('change', () => {
      toggle.checked ? map.addLayer(group) : map.removeLayer(group);
      if (highlightActive) clearHighlight();
    });

    row.appendChild(span);
    row.appendChild(toggle);
    csvLegend.appendChild(row);

    Papa.parse(src.url, {
      download: true,
      header: true,
      complete: results => {
        let count = 0;
        results.data.forEach(r => {
          const lat = parseFloat(r.lat);
          const lng = parseFloat(r.long);
          const id = r.id || '';
          const name = r.FundraiserName || 'Unknown';
          if (!isNaN(lat) && !isNaN(lng)) {
            count++;
            L.marker([lat, lng], {
              icon: createCustomMarker(src.color, src.number)
            }).bindPopup(`<strong>${name}</strong><br>ID: ${id}`).addTo(group);
          }
        });
        span.textContent = `${label} – ${count} deliveries`;
      }
    });
  });
}

loadCSVs();

document.getElementById('refresh-btn').addEventListener('click', () => {
  const btn = document.getElementById('refresh-btn');
  btn.style.fontWeight = 'bold';
  setTimeout(() => { btn.style.fontWeight = 'normal'; }, 4000);

  const msg = document.createElement('div');
  msg.textContent = '✅ Data refreshed';
  msg.style.background = '#d4edda';
  msg.style.border = '1px solid #c3e6cb';
  msg.style.color = '#155724';
  msg.style.padding = '6px';
  msg.style.marginTop = '8px';
  msg.style.borderRadius = '4px';
  document.getElementById('status-debug').appendChild(msg);
  setTimeout(() => msg.remove(), 4000);

  document.getElementById('status-debug').innerHTML = '';
  Object.values(deliveryLayers).forEach(group => group.clearLayers());
  loadCSVs();
});

function clearHighlight() {
  labelPopups.forEach(p => map.removeLayer(p));
  labelPopups.length = 0;
  highlightActive = false;
  document.getElementById('highlight-btn').classList.remove('active');
}

document.getElementById('highlight-btn').addEventListener('click', () => {
  if (highlightActive) return clearHighlight();

  const active = Object.entries(deliveryLayers).filter(([_, group]) => map.hasLayer(group));
  if (active.length !== 1) {
    const msg = document.createElement('div');
    msg.textContent = 'Please toggle only ONE layer to highlight.';
    msg.style.background = '#fff3cd';
    msg.style.color = '#856404';
    msg.style.border = '1px solid #ffeeba';
    msg.style.padding = '6px';
    msg.style.marginTop = '8px';
    msg.style.borderRadius = '4px';
    document.getElementById('status-debug').appendChild(msg);
    setTimeout(() => msg.remove(), 4000);
    return;
  }

  const [label] = active;
  const { url } = csvSources[label];
  highlightActive = true;
  document.getElementById('highlight-btn').classList.add('active');

  Papa.parse(url, {
    download: true,
    header: true,
    complete: results => {
      results.data.forEach(r => {
        const lat = parseFloat(r.lat);
        const lng = parseFloat(r.long);
        const id = r.id || '';
        const name = r.FundraiserName || 'Unknown';
        if (!isNaN(lat) && !isNaN(lng)) {
          const p = L.popup({ autoClose: false })
            .setLatLng([lat, lng])
            .setContent(`<strong>${name}</strong><br>ID: ${id}`)
            .openOn(map);
          labelPopups.push(p);
        }
      });
    }
  });
});

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
