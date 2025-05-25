const map = L.map('map').setView([43.7, -79.4], 8);

// Carto Light basemap
L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
  attribution: '&copy; CartoDB'
}).addTo(map);

// Delivery zones (non-toggleable)
const geoLayers = {
  "Wed Group": { url: "https://klabbyklab.github.io/maplayers/wed_group.geojson", color: "green" },
  "Thurs Group": { url: "https://klabbyklab.github.io/maplayers/thurs_group.geojson", color: "red" },
  "Fri Group": { url: "https://klabbyklab.github.io/maplayers/fri_group.geojson", color: "blue" },
  "Sat Group": { url: "https://klabbyklab.github.io/maplayers/sat_group.geojson", color: "gold" }
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

// CSV layers
const csvSources = {
  "3 Weeks Out": {
    url: "https://docs.google.com/spreadsheets/d/e/2PACX-1vS2LfOVQyErcTtEMSwS1ch4GfUlcpXnNfih841L1Vms0B-9pNMSh9vW5k0TNrXDoQgv2-lgDnYWdzgM/pub?output=csv",
    defaultColor: "purple"
  },
  "2 Weeks Out": {
    url: "https://docs.google.com/spreadsheets/d/e/2PACX-1vQkTCHp6iaWJBboax7x-Ic8kmX6jlYkTzJhnCnv2WfPtmo70hXPijk0p1JI03vBQTPuyPuDVWzxbavP/pub?output=csv",
    defaultColor: "orange"
  },
  "1 Week Out": {
    url: "https://docs.google.com/spreadsheets/d/e/2PACX-1vSZ1kJEo0ZljAhlg4Lnr_Shz3-OJnV6uehE8vCA8280L4aCfNoWE85WEJnOG2jzL2jE-o0PWTMRZiFu/pub?output=csv",
    defaultColor: "black"
  }
};

const csvControl = document.getElementById('csv-controls');
const csvLayers = {};

Object.entries(csvSources).forEach(([name, { url, defaultColor }]) => {
  const groupLayer = L.layerGroup().addTo(map);
  csvLayers[name] = { layer: groupLayer, markers: [], color: defaultColor };

  // Build control UI
  const wrapper = document.createElement('div');
  wrapper.classList.add('csv-block');

  const header = document.createElement('div');
  header.classList.add('csv-header');
  header.textContent = name;

  const tools = document.createElement('div');
  tools.classList.add('csv-tools');

  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.checked = true;
  checkbox.addEventListener('change', () => {
    checkbox.checked ? groupLayer.addTo(map) : map.removeLayer(groupLayer);
  });

  // Color buttons
  ["purple", "red", "green", "black"].forEach(color => {
    const btn = document.createElement('button');
    btn.textContent = color;
    btn.style.backgroundColor = color;
    btn.style.color = "white";
    btn.addEventListener('click', () => {
      csvLayers[name].color = color;
      csvLayers[name].markers.forEach(m => m.setStyle({ color }));
    });
    tools.appendChild(btn);
  });

  // Count button
  const countBtn = document.createElement('button');
  countBtn.textContent = "Count";
  countBtn.addEventListener('click', () => {
    alert(`${csvLayers[name].markers.length} points in ${name}`);
  });
  tools.appendChild(countBtn);

  // Highlight button
  const highlightBtn = document.createElement('button');
  highlightBtn.textContent = "Highlight";
  highlightBtn.addEventListener('click', () => {
    csvLayers[name].markers.forEach(m => m.openPopup());
  });
  tools.appendChild(highlightBtn);

  wrapper.appendChild(checkbox);
  wrapper.appendChild(header);
  wrapper.appendChild(tools);
  csvControl.appendChild(wrapper);

  // Parse CSV
  Papa.parse(url, {
    download: true,
    header: true,
    complete: function(results) {
      results.data.forEach(row => {
        const lat = parseFloat(row.lat);
        const lon = parseFloat(row.long);
        const fname = row.FundraiserName || "Unknown";
        const id = row["id:"] || "N/A";

        if (!isNaN(lat) && !isNaN(lon)) {
          const marker = L.circleMarker([lat, lon], {
            radius: 5,
            color: defaultColor,
            fillOpacity: 0.8
          }).bindPopup(`<strong>${fname}</strong><br>ID: ${id}`);
          marker.addTo(groupLayer);
          csvLayers[name].markers.push(marker);
        }
      });
    }
  });
});
