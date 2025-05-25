const map = L.map('map');

L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
  attribution: '&copy; CartoDB'
}).addTo(map);

// Center on zones.geojson
fetch("https://freshboxmarket.github.io/maplayers/zones.geojson")
  .then(res => res.json())
  .then(data => {
    const zonesLayer = L.geoJSON(data, {
      style: { color: "#444", weight: 1, fillOpacity: 0.05 }
    }).addTo(map);
    map.fitBounds(zonesLayer.getBounds());
  });

// Zone overlays
const geoLayers = {
  "Wednesday": { url: "https://freshboxmarket.github.io/maplayers/wed_group.geojson", color: "#008000" },
  "Thursday":  { url: "https://freshboxmarket.github.io/maplayers/thurs_group.geojson", color: "#FF0000" },
  "Friday":    { url: "https://freshboxmarket.github.io/maplayers/fri_group.geojson", color: "#0000FF" },
  "Saturday":  { url: "https://freshboxmarket.github.io/maplayers/sat_group.geojson", color: "#FFD700" }
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

// CSV layers with numbered markers
const csvSources = {
  "3 Weeks Out": {
    url: "https://docs.google.com/spreadsheets/d/e/2PACX-1vS2LfOVQyErcTtEMSwS1ch4GfUlcpXnNfih841L1Vms0B-9pNMSh9vW5k0TNrXDoQgv2-lgDnYWdzgM/pub?output=csv",
    color: "#800080",
    weekNum: 3
  },
  "2 Weeks Out": {
    url: "https://docs.google.com/spreadsheets/d/e/2PACX-1vQkTCHp6iaWJBboax7x-Ic8kmX6jlYkTzJhnCnv2WfPtmo70hXPijk0p1JI03vBQTPuyPuDVWzxbavP/pub?output=csv",
    color: "#002366",
    weekNum: 2
  },
  "1 Week Out": {
    url: "https://docs.google.com/spreadsheets/d/e/2PACX-1vSZ1kJEo0ZljAhlg4Lnr_Shz3-OJnV6uehE8vCA8280L4aCfNoWE85WEJnOG2jzL2jE-o0PWTMRZiFu/pub?output=csv",
    color: "#e75480",
    weekNum: 1
  }
};

const csvLegend = document.getElementById('csv-legend');
const lastUpdated = document.getElementById('last-updated');

const now = new Date();
lastUpdated.textContent = `Last updated: ${now.toLocaleDateString()} @ ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;

Object.entries(csvSources).forEach(([name, { url, color, weekNum }]) => {
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

      results.data.forEach((row, i) => {
        const lat = parseFloat(row.lat);
        const lon = parseFloat(row.long);
        const fundraiser = row.FundraiserName || "Unknown";
        const id = row["id:"] || "N/A";

        if (!isNaN(lat) && !isNaN(lon)) {
          count++;

          const markerIcon = L.divIcon({
            className: `marker-icon week-${weekNum}`,
            html: `${weekNum}`
          });

          L.marker([lat, lon], { icon: markerIcon })
            .bindPopup(`<strong>${fundraiser}</strong><br>ID: ${id}`)
            .addTo(groupLayer);

          const buffered = turf.buffer(turf.point([lon, lat]), 0.05, { units: 'kilometers' });
          L.geoJSON(buffered, {
            style: { color, weight: 1, fillOpacity: 0.2 }
          }).addTo(bufferLayer);
        }
      });

      label.textContent = `${name} – ${count} deliveries`;
    }
  });
});
