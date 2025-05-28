const map = L.map('map').setView([43.6, -79.6], 9);

L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
  attribution: '&copy; CartoDB'
}).addTo(map);

// Layer configs
const layers = [
  {
    name: "1 Week Out",
    url: "https://docs.google.com/spreadsheets/d/e/2PACX-1vSZ1kJEo0ZljAhlg4Lnr_Shz3-OJnV6uehE8vCA8280L4aCfNoWE85WEJnOG2jzL2jE-o0PWTMRZiFu/pub?output=csv",
    color: getRandomColor(),
    group: L.layerGroup(),
    checkboxId: "layer1",
    countId: "count1",
    defaultVisible: true
  },
  {
    name: "2 Weeks Out",
    url: "https://docs.google.com/spreadsheets/d/e/2PACX-1vQkTCHp6iaWJBboax7x-Ic8kmX6jlYkTzJhnCnv2WfPtmo70hXPijk0p1JI03vBQTPuyPuDVWzxbavP/pub?output=csv",
    color: getRandomColor(),
    group: L.layerGroup(),
    checkboxId: "layer2",
    countId: "count2",
    defaultVisible: false
  },
  {
    name: "3 Weeks Out",
    url: "https://docs.google.com/spreadsheets/d/e/2PACX-1vS2LfOVQyErcTtEMSwS1ch4GfUlcpXnNfih841L1Vms0B-9pNMSh9vW5k0TNrXDoQgv2-lgDnYWdzgM/pub?output=csv",
    color: getRandomColor(),
    group: L.layerGroup(),
    checkboxId: "layer3",
    countId: "count3",
    defaultVisible: false
  }
];

// Assign colors to legend
layers.forEach((layer, idx) => {
  document.getElementById(`color${idx + 1}`).style.backgroundColor = layer.color;
});

// Load all layers regardless of toggle state
layers.forEach(layer => {
  Papa.parse(layer.url, {
    download: true,
    header: true,
    skipEmptyLines: true, // 🔧 Prevents trailing rows from interfering
    complete: function(results) {
      const data = results.data;
      let count = 0;

      data.forEach(row => {
        const lat = parseFloat(row.lat);
        const lon = parseFloat(row.long);
        const name = row.FundraiserName?.trim();
        const id = row.id?.trim();

        if (isFinite(lat) && isFinite(lon) && name && id) {
          const marker = L.circleMarker([lat, lon], {
            radius: 7,
            fillColor: layer.color,
            color: "#333",
            weight: 1,
            opacity: 1,
            fillOpacity: 0.8
          }).bindPopup(`<strong>${name}</strong><br>ID: ${id}`);
          marker.addTo(layer.group);
          count++;
        }
      });

      document.getElementById(layer.countId).textContent = `${layer.name}: ${count}`;

      // Add to map only if default visible
      if (layer.defaultVisible) {
        map.addLayer(layer.group);
        document.getElementById(layer.checkboxId).checked = true;
      }
    }
  });

  // Toggle listener
  const checkbox = document.getElementById(layer.checkboxId);
  checkbox.addEventListener('change', () => {
    if (checkbox.checked) {
      map.addLayer(layer.group);
    } else {
      map.removeLayer(layer.group);
    }
  });
});

function getRandomColor() {
  const colors = ['#ff6f61', '#42a5f5', '#ab47bc', '#26a69a', '#ef5350', '#fdd835', '#7e57c2', '#66bb6a'];
  return colors[Math.floor(Math.random() * colors.length)];
}
