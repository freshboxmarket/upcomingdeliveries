const map = L.map('map'); // Leave map center unset initially

// Auto-center from zones.geojson
fetch("https://freshboxmarket.github.io/maplayers/zones.geojson")
  .then(res => res.json())
  .then(data => {
    const zonesLayer = L.geoJSON(data, {
      style: { color: "#888", weight: 1, fillOpacity: 0.1 }
    }).addTo(map);

    map.fitBounds(zonesLayer.getBounds());
  })
  .catch(err => console.error("Error loading zones.geojson:", err));

// Tile layer
L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
  attribution: '&copy; CartoDB'
}).addTo(map);

// Static Delivery Zone Layers
const geoLayers = {
  "Wednesday": { url: "https://freshboxmarket.github.io/maplayers/wed_group.geojson", color: "green" },
  "Thursday":  { url: "https://freshboxmarket.github.io/maplayers/thurs_group.geojson", color: "red" },
  "Friday":    { url: "https://freshboxmarket.github.io/maplayers/fri_group.geojson", color: "blue" },
  "Saturday":  { url: "https://freshboxmarket.github.io/maplayers/sat_group.geojson", color: "gold" }
};

Object.entries(geoLayers).forEach(([name, { url, color }]) => {
  fetch(url)
    .then(res => res.json())
    .then(data => {
      L.geoJSON(data, {
        style: { color, weight: 2, fillOpacity: 0.15 },
        onEachFeature: (feature, layer) => layer.bindPopup(`${name} Zone`)
      }).addTo(map);
    });
});

// CSV Marker Layers
const csvSources = {
  "3 Weeks Out": {
    url: "https://docs.google.com/spreadsheets/d/e/2PACX-1vS2LfOVQyErcTtEMSwS1ch4GfUlcpXnNfih841L1Vms0B-9pNMSh9vW5k0TNrXDoQgv2-lgDnYWdzgM/pub?output=csv",
    color: "purple"
  },
  "2 Weeks Out": {
    url: "https://docs.google.com/spreadsheets/d/e/2PACX-1vQkTCHp6iaWJBboax7x-Ic8kmX6jlYkTzJhnCnv2WfPtmo70hXPijk0p1JI03vBQTPuyPuDVWzxbavP/pub?output=csv",
    color: "#002366"
  },
  "1 Week Out": {
    url: "https://docs.google.com/spreadsheets/d/e/2PACX-1vSZ1kJEo0ZljAhlg4Lnr_Shz3-OJnV6uehE8vCA8280L4aCfNoWE85WEJnOG2jzL2jE-o0PWTMRZiFu/pub?output=csv",
    color: "#e75480"
  }
};

const csvControl = document.getElementById('csv-controls');
const csvLegend = document.getElementById('csv-legend');

Object.entries(csvSources).forEach(([name, { url, color }]) => {
  const groupLayer = L.layerGroup().addTo(map);
  const bufferLayer = L.layerGroup().addTo(map);

  const wrapper = document.createElement('div');
  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.checked = true;
  checkbox.style.marginRight = "6px";

  const label = document.createElement('label');
  label.className = 'csv-header';
  label.textContent = `${name} – Loading...`;

  checkbox.addEventListener('change', () => {
    if (checkbox.checked) {
      map.addLayer(groupLayer);
      map.addLayer(bufferLayer);
    } else {
      map.removeLayer(groupLayer);
      map.removeLayer(bufferLayer);
    }
  });

  wrapper.appendChild(checkbox);
  wrapper.appendChild(label);
  csvControl.appendChild(wrapper);

  Papa.parse(url, {
    download: true,
    header: true,
    complete: function(results) {
      let count = 0;

      results.data.forEach(row => {
        const lat = parseFloat(row.lat);
        const lon = parseFloat(row.long);
        const name = row.FundraiserName || "Unknown";
        const id = row["id:"] || "N/A";

        if (!isNaN(lat) && !isNaN(lon)) {
          count++;

          const marker = L.circleMarker([lat, lon], {
            radius: 5,
            color,
            fillOpacity: 0.8
          }).bindPopup(`<strong>${name}</strong><br>ID: ${id}`);
          marker.addTo(groupLayer);

          const point = turf.point([lon, lat]);
          const buffered = turf.buffer(point, 0.1, { units: 'kilometers' });
          L.geoJSON(buffered, {
            style: { color, weight: 1, fillOpacity: 0.2 }
          }).addTo(bufferLayer);
        }
      });

      label.textContent = `${name} – ${count} delivery${count !== 1 ? 'ies' : ''}`;

      const legendItem = document.createElement('div');
      legendItem.className = 'legend-item';
      legendItem.innerHTML = `<span class="color-swatch" style="background:${color};"></span>${name} – ${count}`;
      csvLegend.appendChild(legendItem);
    }
  });
});

// Logo dragging
(function enableLogoDrag() {
  const logo = document.getElementById("floating-logo");
  let isDragging = false, startX, startY;

  logo.addEventListener('mousedown', e => {
    isDragging = true;
    startX = e.clientX - logo.offsetLeft;
    startY = e.clientY - logo.offsetTop;
    logo.style.cursor = "grabbing";
  });

  document.addEventListener('mousemove', e => {
    if (!isDragging) return;
    logo.style.left = `${e.clientX - startX}px`;
    logo.style.top = `${e.clientY - startY}px`;
  });

  document.addEventListener('mouseup', () => {
    isDragging = false;
    logo.style.cursor = "grab";
  });
})();
