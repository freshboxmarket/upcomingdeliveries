const map = L.map('map').setView([43.7, -79.4], 8);

// Basemap
L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
  attribution: '&copy; CartoDB'
}).addTo(map);

// Static Delivery Zone Layers
const geoLayers = {
  "Wednesday": {
    url: "https://freshboxmarket.github.io/maplayers/wed_group.geojson",
    color: "green"
  },
  "Thursday": {
    url: "https://freshboxmarket.github.io/maplayers/thurs_group.geojson",
    color: "red"
  },
  "Friday": {
    url: "https://freshboxmarket.github.io/maplayers/fri_group.geojson",
    color: "blue"
  },
  "Saturday": {
    url: "https://freshboxmarket.github.io/maplayers/sat_group.geojson",
    color: "gold"
  }
};

Object.entries(geoLayers).forEach(([day, { url, color }]) => {
  fetch(url)
    .then(res => res.json())
    .then(data => {
      L.geoJSON(data, {
        style: {
          color,
          weight: 2,
          fillOpacity: 0.15
        },
        onEachFeature: (feature, layer) => layer.bindPopup(`${day} Zone`)
      }).addTo(map);
    })
    .catch(err => console.error(`Error loading ${day} zone:`, err));
});

// CSV Layers with Counts
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
const legendHeader = document.querySelector('#csv-toggle-box h3');

Object.entries(csvSources).forEach(([name, { url, color }]) => {
  const groupLayer = L.layerGroup().addTo(map);
  let count = 0;

  const wrapper = document.createElement('div');
  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.checked = true;
  checkbox.style.marginRight = "6px";

  const label = document.createElement('label');
  label.textContent = `${name} – Loading…`;
  label.className = 'csv-header';

  checkbox.addEventListener('change', () => {
    if (checkbox.checked) {
      groupLayer.addTo(map);
      groupLayer.eachLayer(layer => layer.setStyle?.({ fillOpacity: 0.8 }));
    } else {
      map.removeLayer(groupLayer);
    }
  });

  wrapper.appendChild(checkbox);
  wrapper.appendChild(label);
  csvControl.appendChild(wrapper);

  Papa.parse(url, {
    download: true,
    header: true,
    complete: function(results) {
      results.data.forEach(row => {
        const lat = parseFloat(row.lat);
        const lon = parseFloat(row.long);
        const fundraiser = row.FundraiserName || "Unknown";
        const id = row["id:"] || "N/A";

        if (!isNaN(lat) && !isNaN(lon)) {
          const marker = L.circleMarker([lat, lon], {
            radius: 5,
            color,
            fillOpacity: 0.8
          }).bindPopup(`<strong>${fundraiser}</strong><br>ID: ${id}`);
          marker.addTo(groupLayer);
          count++;
        }
      });

      // Update label with final count
      label.textContent = `${name} – ${count} delivery${count !== 1 ? 'ies' : ''}`;

      // Update main header count (additive)
      const existingText = legendHeader.textContent;
      const match = existingText.match(/\((\d+)\)$/);
      const previousTotal = match ? parseInt(match[1]) : 0;
      legendHeader.textContent = `Upcoming Deliveries (${previousTotal + count})`;
    }
  });
});
