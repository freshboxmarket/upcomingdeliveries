const map = L.map('map').setView([43.7, -79.4], 8);

L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
  attribution: '&copy; CartoDB'
}).addTo(map);

// Static delivery zone polygons
const geoLayers = {
  "Wed Group": { url: "https://freshboxmarket.github.io/maplayers/wed_group.geojson", color: "green" },
  "Thurs Group": { url: "https://freshboxmarket.github.io/maplayers/thurs_group.geojson", color: "red" },
  "Fri Group": { url: "https://freshboxmarket.github.io/maplayers/fri_group.geojson", color: "blue" },
  "Sat Group": { url: "https://freshboxmarket.github.io/maplayers/sat_group.geojson", color: "gold" }
};

Object.entries(geoLayers).forEach(([name, { url, color }]) => {
  fetch(url)
    .then(res => res.json())
    .then(data => {
      L.geoJSON(data, {
        style: { color, weight: 2, fillOpacity: 0.15 },
        onEachFeature: (feature, layer) => layer.bindPopup(name)
      }).addTo(map);
    });
});

// Upcoming delivery points
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

Object.entries(csvSources).forEach(([name, { url, color }]) => {
  const groupLayer = L.layerGroup().addTo(map);
  const markers = [];

  const wrapper = document.createElement('div');
  const header = document.createElement('div');
  header.className = 'csv-header';
  header.textContent = `${name} – Loading…`;
  wrapper.appendChild(header);
  csvControl.appendChild(wrapper);

  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.checked = true;
  checkbox.style.marginRight = "6px";
  checkbox.addEventListener('change', () => {
    checkbox.checked ? groupLayer.addTo(map) : map.removeLayer(groupLayer);
  });
  wrapper.insertBefore(checkbox, header);

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
          const marker = L.circleMarker([lat, lon], {
            radius: 5,
            color: color,
            fillOpacity: 0.8
          }).bindPopup(`<strong>${name}</strong><br>ID: ${id}`);
          marker.addTo(groupLayer);
          markers.push(marker);
          count++;
        }
      });

      header.textContent = `${name} – ${count} delivery${count === 1 ? '' : 'ies'}`;
    }
  });
});
