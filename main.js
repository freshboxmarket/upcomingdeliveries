const map = L.map('map');

// Add tile layer immediately
L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
  attribution: '&copy; CartoDB'
}).addTo(map);

// Fit map to zones.geojson
fetch("https://freshboxmarket.github.io/maplayers/zones.geojson")
  .then(res => res.json())
  .then(data => {
    const zonesLayer = L.geoJSON(data, {
      style: {
        color: "#444",
        weight: 1,
        fillOpacity: 0.05
      }
    }).addTo(map);
    map.fitBounds(zonesLayer.getBounds());
  });

// Delivery zone overlays
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

// CSV point layers
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
const lastUpdated = document.getElementById('last-updated');

// Build timestamp
const now = new Date();
lastUpdated.textContent = `Last updated: ${now.toLocaleDateString()} @ ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;

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

      results.data.forEach((row, i) => {
        const lat = parseFloat(row.lat);
        const lon = parseFloat(row.long);
        const fundraiser = row.FundraiserName || "Unknown";
        const id = row["id:"] || "N/A";

        if (!isNaN(lat) && !isNaN(lon)) {
          count++;

          const marker = L.circleMarker([lat, lon], {
            radius: 5,
            color,
            fillOpacity: 0.8
          }).bindPopup(`<strong>${fundraiser}</strong><br>ID: ${id}`);
          marker.addTo(groupLayer);

          // Optional lightweight buffer
          setTimeout(() => {
            const point = turf.point([lon, lat]);
            const buffered = turf.buffer(point, 0.05, { units: 'kilometers' });

            const bufferGeo = L.geoJSON(buffered, {
              style: {
                color,
                weight: 1,
                fillOpacity: 0.2
              }
            });
            bufferGeo.addTo(bufferLayer);
          }, i * 5);
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
