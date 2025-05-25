const map = L.map('map');
L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
  attribution: '&copy; CartoDB'
}).addTo(map);

// Fit to zones
fetch("https://freshboxmarket.github.io/maplayers/zones.geojson")
  .then(res => res.json())
  .then(data => {
    const zonesLayer = L.geoJSON(data, {
      style: { color: "#444", weight: 1, fillOpacity: 0.05 }
    }).addTo(map);
    map.fitBounds(zonesLayer.getBounds());
  });

// CSV delivery layers
const csvSources = {
  "3 Weeks Out": {
    url: "https://docs.google.com/spreadsheets/d/e/2PACX-1vS2LfOVQyErcTtEMSwS1ch4GfUlcpXnNfih841L1Vms0B-9pNMSh9vW5k0TNrXDoQgv2-lgDnYWdzgM/pub?output=csv",
    color: "#800080"
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

const csvLegend = document.getElementById('csv-legend');
const lastUpdated = document.getElementById('last-updated');

const now = new Date();
lastUpdated.textContent = `Last updated: ${now.toLocaleDateString()} @ ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;

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

      results.data.forEach((row, i) => {
        const lat = parseFloat(row.lat);
        const lon = parseFloat(row.long);
        const fundraiser = row.FundraiserName || "Unknown";
        const id = row["id:"] || "N/A";

        if (!isNaN(lat) && !isNaN(lon)) {
          count++;

          L.circleMarker([lat, lon], {
            radius: 5,
            color,
            fillOpacity: 0.8
          }).bindPopup(`<strong>${fundraiser}</strong><br>ID: ${id}`).addTo(groupLayer);

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
