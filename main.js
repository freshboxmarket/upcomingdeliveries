const map = L.map('map').setView([43.6, -79.6], 9);

L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
  attribution: '&copy; CartoDB'
}).addTo(map);

const colorPalette = ['#ff6f61', '#1e88e5', '#8e24aa'];

const layers = [
  {
    name: "1 Week Out",
    url: "https://docs.google.com/spreadsheets/d/e/2PACX-1vSZ1kJEo0ZljAhlg4Lnr_Shz3-OJnV6uehE8vCA8280L4aCfNoWE85WEJnOG2jzL2jE-o0PWTMRZiFu/pub?output=csv",
    color: colorPalette[0],
    group: L.layerGroup(),
    checkboxId: "layer1",
    countId: "count1",
    eventId: "events1"
  },
  {
    name: "2 Weeks Out",
    url: "https://docs.google.com/spreadsheets/d/e/2PACX-1vQkTCHp6iaWJBboax7x-Ic8kmX6jlYkTzJhnCnv2WfPtmo70hXPijk0p1JI03vBQTPuyPuDVWzxbavP/pub?output=csv",
    color: colorPalette[1],
    group: L.layerGroup(),
    checkboxId: "layer2",
    countId: "count2",
    eventId: "events2"
  },
  {
    name: "3 Weeks Out",
    url: "https://docs.google.com/spreadsheets/d/e/2PACX-1vS2LfOVQyErcTtEMSwS1ch4GfUlcpXnNfih841L1Vms0B-9pNMSh9vW5k0TNrXDoQgv2-lgDnYWdzgM/pub?output=csv",
    color: colorPalette[2],
    group: L.layerGroup(),
    checkboxId: "layer3",
    countId: "count3",
    eventId: "events3"
  }
];

// Color dots in sidebar
layers.forEach((layer, idx) => {
  document.getElementById(`color${idx + 1}`).style.backgroundColor = layer.color;
});

function loadLayerData(layer) {
  // Clear old markers
  layer.group.clearLayers();
  const uniqueEvents = {};

  Papa.parse(layer.url, {
    download: true,
    header: true,
    skipEmptyLines: true,
    complete: function(results) {
      const data = results.data;
      let count = 0;

      data.forEach(row => {
        const lat = parseFloat(row.lat || row.Lat || row.latitude);
        const lon = parseFloat(row.long || row.Long || row.longitude);
        const name = (row.FundraiserName || row.fundraisername || row.name || "").trim();
        const id = (row.id || row.ID || "").trim();

        if (isFinite(lat) && isFinite(lon) && name && id) {
          L.circleMarker([lat, lon], {
            radius: 7,
            fillColor: layer.color,
            color: "#333",
            weight: 1,
            opacity: 1,
            fillOpacity: 0.85
          }).bindPopup(`<strong>${name}</strong><br>ID: ${id}`).addTo(layer.group);
          count++;
          uniqueEvents[name] = (uniqueEvents[name] || 0) + 1;
        }
      });

      document.getElementById(layer.countId).textContent = `${layer.name}: ${count}`;
      const eventDiv = document.getElementById(layer.eventId);
      eventDiv.innerHTML = "";

      // Sort and list events
      Object.entries(uniqueEvents)
        .sort((a, b) => b[1] - a[1])
        .forEach(([eventName, eventCount]) => {
          const div = document.createElement("div");
          div.textContent = `${eventName}: ${eventCount}`;
          eventDiv.appendChild(div);
        });

      if (document.getElementById(layer.checkboxId).checked) {
        map.addLayer(layer.group);
      }
    },
    error: function(err) {
      console.error(`❌ Error loading ${layer.name}:`, err);
      document.getElementById(layer.countId).textContent = `${layer.name}: Error`;
    }
  });
}

function initLayers() {
  layers.forEach(layer => {
    loadLayerData(layer);
    const checkbox = document.getElementById(layer.checkboxId);
    checkbox.addEventListener("change", () => {
      if (checkbox.checked) {
        map.addLayer(layer.group);
      } else {
        map.removeLayer(layer.group);
      }
    });
  });
}

// Initial load
initLayers();

// Refresh button
document.getElementById("refresh").addEventListener("click", () => {
  layers.forEach(layer => loadLayerData(layer));
});
